import type { SupabaseClient } from '@supabase/supabase-js';

export type Tier = 'trial' | 'starter' | 'pro' | 'premium';
export type UsageKind = 'message' | 'roadmap';
export type ChatModel = 'claude-opus-4-7' | 'claude-sonnet-4-6';

export type TierLimits = {
  messagesPerMonth: number;
  roadmapsPerMonth: number;
};

export type EffectiveTier = {
  tier: Tier;
  isExpired: boolean;       // trial finished OR paid subscription lapsed
};

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  trial:   { messagesPerMonth: 5,   roadmapsPerMonth: 1 },
  starter: { messagesPerMonth: 60,  roadmapsPerMonth: 3 },
  pro:     { messagesPerMonth: 300, roadmapsPerMonth: 10 },
  premium: { messagesPerMonth: 600, roadmapsPerMonth: 20 },
};

/**
 * Refine (update existing roadmap) quotas. Refines are SEPARATE from
 * roadmaps because they don't create a new project — they evolve an
 * existing one. We cap them anyway to avoid abuse: a trial user could
 * otherwise burn ~$1-2 in Claude tokens by spamming refines for free.
 *
 * Stored as a jsonb array `refined_history: [iso_timestamp, ...]` inside
 * each roadmap's `quiz_answers`. We aggregate across all roadmaps for
 * the user and count entries in the current calendar month.
 */
export const REFINE_LIMITS: Record<Tier, number> = {
  trial:   3,
  starter: 10,
  pro:     30,
  premium: 100, // functionally unlimited; high cap detects abuse only
};

// Model mapping — Sonnet on Trial/Starter (cheap acquisition + entry volume),
// Opus on Pro/Premium (the premium model that justifies the upgrade).
// Narrative: "Pro unlocks Claude Opus, the most advanced model."
const TIER_MODEL: Record<Tier, ChatModel> = {
  trial:   'claude-sonnet-4-6',
  starter: 'claude-sonnet-4-6',
  pro:     'claude-opus-4-7',
  premium: 'claude-opus-4-7',
};

export function getModelForTier(tier: Tier): ChatModel {
  return TIER_MODEL[tier];
}

/**
 * Reads the user's tier + checks whether the current period has lapsed.
 * If no subscription row exists, falls back to an expired trial (so the
 * legacy users without a row get blocked → upgrade modal).
 */
export async function getEffectiveTier(
  supabase: SupabaseClient,
  userId: string
): Promise<EffectiveTier> {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('tier, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return { tier: 'trial', isExpired: true };

  const tier: Tier = (['trial', 'starter', 'pro', 'premium'] as const).includes(
    data.tier as Tier
  )
    ? (data.tier as Tier)
    : 'trial';

  let isExpired = false;
  if (data.current_period_end) {
    const end = new Date(data.current_period_end).getTime();
    if (Number.isFinite(end) && end < Date.now()) isExpired = true;
  } else {
    // Paid tiers must have a current_period_end set by the webhook.
    // Trial without expiration is treated as never-expiring (dev / manual).
    if (tier !== 'trial') isExpired = true;
  }

  return { tier, isExpired };
}

export type IncrementResult =
  | { allowed: true;  newCount: number; limit: number; period: string; tier: Tier; isExpired: boolean }
  | { allowed: false; currentCount: number; limit: number; period: string; tier: Tier; isExpired: boolean };

export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string,
  kind: UsageKind
): Promise<IncrementResult> {
  const { tier, isExpired } = await getEffectiveTier(supabase, userId);

  // Expired = quota 0, the RPC short-circuits and returns allowed=false.
  const limits = TIER_LIMITS[tier];
  const tierLimit = kind === 'message' ? limits.messagesPerMonth : limits.roadmapsPerMonth;
  const effectiveLimit = isExpired ? 0 : tierLimit;

  const { data, error } = await supabase.rpc('increment_usage', {
    p_kind: kind,
    p_limit: effectiveLimit,
  });

  if (error) {
    throw new Error(`increment_usage RPC failed: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error('increment_usage returned no row');
  }

  const period = String(row.period);
  const count = Number(row.new_count);

  if (row.allowed) {
    return { allowed: true, newCount: count, limit: tierLimit, period, tier, isExpired };
  }
  return { allowed: false, currentCount: count, limit: tierLimit, period, tier, isExpired };
}

export async function getUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  tier: Tier;
  isExpired: boolean;
  limits: TierLimits;
  messagesUsed: number;
  roadmapsUsed: number;
  period: string;
}> {
  const { tier, isExpired } = await getEffectiveTier(supabase, userId);
  const period = currentPeriodStart();

  const { data } = await supabase
    .from('usage_counters')
    .select('messages_count, roadmaps_count')
    .eq('user_id', userId)
    .eq('period_start', period)
    .maybeSingle();

  return {
    tier,
    isExpired,
    limits: TIER_LIMITS[tier],
    messagesUsed: data?.messages_count ?? 0,
    roadmapsUsed: data?.roadmaps_count ?? 0,
    period,
  };
}

function currentPeriodStart(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export function limitExceededPayload(
  result: Extract<IncrementResult, { allowed: false }>,
  kind: UsageKind
) {
  return {
    error: 'limit_reached',
    kind,
    tier: result.tier,
    isExpired: result.isExpired,
    limit: result.limit,
    used: result.currentCount,
    period: result.period,
  };
}
