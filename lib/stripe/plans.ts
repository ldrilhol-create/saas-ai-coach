import type { Tier } from '@/lib/rate-limit';

/**
 * Mapping between the app's tier names and the Stripe Price IDs.
 * Each tier maps to one recurring monthly price configured in the Stripe Dashboard.
 *
 * To set up:
 *   1. Stripe Dashboard → Catalogue → Add product → e.g. "AI Business Coach – Pro"
 *   2. Add a recurring price (29 € / 49 € / 69 €, monthly)
 *   3. Copy the resulting `price_xxx` id into the matching env var below.
 */
export type PaidTier = 'starter' | 'pro' | 'premium';

export function getPriceIdForPlan(plan: PaidTier): string {
  const map: Record<PaidTier, string | undefined> = {
    starter: process.env.STRIPE_PRICE_ID_STARTER,
    pro: process.env.STRIPE_PRICE_ID_PRO,
    premium: process.env.STRIPE_PRICE_ID_PREMIUM,
  };
  const id = map[plan];
  if (!id) {
    throw new Error(`Missing env var for STRIPE_PRICE_ID_${plan.toUpperCase()}`);
  }
  return id;
}

/**
 * Reverse lookup: given a Stripe Price ID (from a webhook), figure out which
 * tier it corresponds to. Returns null if the price doesn't match any known tier.
 */
export function getTierForPriceId(priceId: string): Tier | null {
  if (priceId === process.env.STRIPE_PRICE_ID_STARTER) return 'starter';
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_ID_PREMIUM) return 'premium';
  return null;
}

export function isPaidTier(value: string): value is PaidTier {
  return value === 'starter' || value === 'pro' || value === 'premium';
}
