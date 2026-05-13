import Stripe from 'stripe';

let cached: Stripe | null = null;

/**
 * Server-side Stripe SDK instance. Lazily constructed so importing this file
 * doesn't throw if the env var is missing at module-load time (e.g. during
 * `next build` without the secret in CI).
 */
export function getStripeClient(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  // Use the SDK's default apiVersion (Stripe pins it via the installed package
  // version). To override later, bump both the npm version and pin here.
  cached = new Stripe(key, { typescript: true });
  return cached;
}
