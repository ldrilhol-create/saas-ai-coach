import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';
import { getPriceIdForPlan, isPaidTier, isBillingCycle, type BillingCycle } from '@/lib/stripe/plans';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: { plan?: unknown; cycle?: unknown };
  try {
    body = (await request.json()) as { plan?: unknown; cycle?: unknown };
  } catch {
    return Response.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const plan = typeof body.plan === 'string' ? body.plan : '';
  if (!isPaidTier(plan)) {
    return Response.json({ error: 'plan invalide (attendu: starter / pro / premium)' }, { status: 400 });
  }

  // Billing cycle: monthly (default) or yearly. Yearly = ~17% discount
  // (2 months free) and locks the user in for 12 months.
  const cycleStr = typeof body.cycle === 'string' ? body.cycle : 'monthly';
  const cycle: BillingCycle = isBillingCycle(cycleStr) ? cycleStr : 'monthly';

  // Reuse an existing Stripe customer id if the user already has one
  // (avoids creating duplicate customers on repeat checkouts).
  const { data: existingSub } = await supabase
    .from('user_subscriptions')
    .select('provider_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const existingCustomerId = (existingSub?.provider_customer_id as string | null) ?? undefined;

  const stripe = getStripeClient();
  const origin = request.headers.get('origin') ?? 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: getPriceIdForPlan(plan, cycle),
          quantity: 1,
        },
      ],
      // Either reuse the existing customer, or pre-fill the email so Stripe
      // creates a fresh customer linked to it.
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: user.email ?? undefined }),
      // Map the Stripe customer back to our user.id via metadata.
      // We also set it on the subscription so future webhooks include it.
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, plan, cycle },
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan, cycle },
      },
      allow_promotion_codes: true,
      success_url: `${origin}/account?checkout=success`,
      cancel_url: `${origin}/#pricing`,
    });

    if (!session.url) {
      return Response.json({ error: 'Stripe did not return a URL' }, { status: 500 });
    }
    return Response.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Stripe error' },
      { status: 500 }
    );
  }
}
