import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: SupabaseClient<any, 'public', any> | null = null;

/**
 * Server-only Supabase client using the SERVICE_ROLE key.
 * Bypasses Row-Level Security — only use from trusted server contexts
 * (webhooks, scheduled jobs) where the operation is authorized through
 * a different mechanism (e.g. Stripe webhook signature).
 *
 * NEVER import this from client code or expose its outputs to the browser.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseAdmin(): SupabaseClient<any, 'public', any> {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL) is not set');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cached = createClient<any, 'public', any>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
