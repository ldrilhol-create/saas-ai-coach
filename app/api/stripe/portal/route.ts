import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('provider_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const customerId = sub?.provider_customer_id as string | null | undefined;
  if (!customerId) {
    return Response.json(
      { error: 'Aucun abonnement actif à gérer.' },
      { status: 400 }
    );
  }

  const stripe = getStripeClient();
  const origin = request.headers.get('origin') ?? 'http://localhost:3000';

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error('Stripe billing portal error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Stripe error' },
      { status: 500 }
    );
  }
}
