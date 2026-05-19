import type { Tier } from '@/lib/rate-limit';

/**
 * Mapping between the app's tier names and the Stripe Price IDs.
 * Each tier maps to TWO recurring prices: monthly + yearly.
 *
 * To set up:
 *   1. Stripe Dashboard → Catalogue → Add product → e.g. "AI Business Coach – Pro"
 *   2. Add the MONTHLY recurring price (29 € / 49 € / 69 €, every month)
 *      → env var STRIPE_PRICE_ID_{TIER}
 *   3. Add the YEARLY recurring price (290 € / 490 € / 690 €, every year)
 *      = roughly "10 months billed up front, 2 months free"
 *      → env var STRIPE_PRICE_ID_{TIER}_YEARLY
 */
export type PaidTier = 'starter' | 'pro' | 'premium';
export type BillingCycle = 'monthly' | 'yearly';

export function getPriceIdForPlan(plan: PaidTier, cycle: BillingCycle = 'monthly'): string {
  const monthlyMap: Record<PaidTier, string | undefined> = {
    starter: process.env.STRIPE_PRICE_ID_STARTER,
    pro: process.env.STRIPE_PRICE_ID_PRO,
    premium: process.env.STRIPE_PRICE_ID_PREMIUM,
  };
  const yearlyMap: Record<PaidTier, string | undefined> = {
    starter: process.env.STRIPE_PRICE_ID_STARTER_YEARLY,
    pro: process.env.STRIPE_PRICE_ID_PRO_YEARLY,
    premium: process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY,
  };
  const map = cycle === 'yearly' ? yearlyMap : monthlyMap;
  const id = map[plan];
  if (!id) {
    const suffix = cycle === 'yearly' ? '_YEARLY' : '';
    throw new Error(`Missing env var for STRIPE_PRICE_ID_${plan.toUpperCase()}${suffix}`);
  }
  return id;
}

/**
 * Reverse lookup: given a Stripe Price ID (from a webhook), figure out which
 * tier it corresponds to. Works for both monthly and yearly variants — the
 * subscription tier is the same; only the billing cycle differs.
 * Returns null if the price doesn't match any known tier.
 */
export function getTierForPriceId(priceId: string): Tier | null {
  if (priceId === process.env.STRIPE_PRICE_ID_STARTER) return 'starter';
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_ID_PREMIUM) return 'premium';
  if (priceId === process.env.STRIPE_PRICE_ID_STARTER_YEARLY) return 'starter';
  if (priceId === process.env.STRIPE_PRICE_ID_PRO_YEARLY) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY) return 'premium';
  return null;
}

export function isPaidTier(value: string): value is PaidTier {
  return value === 'starter' || value === 'pro' || value === 'premium';
}

export function isBillingCycle(value: string): value is BillingCycle {
  return value === 'monthly' || value === 'yearly';
}
