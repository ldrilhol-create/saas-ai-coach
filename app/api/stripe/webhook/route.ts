import type Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe/client';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getTierForPriceId } from '@/lib/stripe/plans';

// Webhook needs the raw body to verify the Stripe signature.
// Disable any body parsing optimizations.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return new Response('Missing signature or secret', { status: 400 });
  }

  // Verify signature using the raw body — DO NOT parse JSON before this step.
  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_succeeded': {
        // The subscription.updated event also fires, but we handle this in case
        // the period changes (renewal) without other subscription changes.
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }
      case 'charge.refunded': {
        // A full refund cancels the linked subscription, which then fires
        // customer.subscription.deleted and downgrades the user via the
        // existing handler. Partial refunds are ignored on purpose.
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }
      default:
        // Unhandled event — log for visibility.
        console.log('Unhandled Stripe event type:', event.type);
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    // Return 500 so Stripe retries (the webhook is idempotent by design — every
    // handler upserts, so retrying is safe).
    return new Response('Internal error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId =
    (session.metadata?.supabase_user_id as string | undefined) ??
    (session.client_reference_id as string | undefined);
  if (!userId) {
    console.warn('checkout.session.completed without supabase_user_id metadata');
    return;
  }
  if (!session.subscription) return; // shouldn't happen in subscription mode

  // Fetch the full subscription to read the price + period_end.
  const stripe = getStripeClient();
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await upsertSubscriptionFromStripe(userId, subscription);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id as string | undefined;
  if (!userId) {
    console.warn('subscription update without supabase_user_id metadata', subscription.id);
    return;
  }
  await upsertSubscriptionFromStripe(userId, subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id as string | undefined;
  if (!userId) return;

  // Downgrade to expired trial: tier='trial' + current_period_end=now.
  // The user keeps their data but the rate limiter blocks further usage.
  const admin = getSupabaseAdmin();
  await admin
    .from('user_subscriptions')
    .upsert(
      {
        user_id: userId,
        tier: 'trial',
        current_period_end: new Date().toISOString(),
        provider: 'stripe',
        provider_subscription_id: subscription.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  if (charge.amount_refunded < charge.amount) return; // partial refund: leave subscription alone

  // `invoice` is on the Charge in older API shapes; cast through unknown.
  const invoiceRef =
    (charge as unknown as { invoice?: string | { id: string } }).invoice;
  if (!invoiceRef) return; // not a subscription charge
  const invoiceId = typeof invoiceRef === 'string' ? invoiceRef : invoiceRef.id;

  const stripe = getStripeClient();
  const invoice = await stripe.invoices.retrieve(invoiceId);
  const subscriptionRef =
    (invoice as unknown as { subscription?: string | { id: string } }).subscription;
  if (!subscriptionRef) return;
  const subscriptionId =
    typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef.id;

  // Cancelling here fires customer.subscription.deleted, which downgrades the
  // user to 'trial' via handleSubscriptionDeleted.
  try {
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (err) {
    // Already cancelled is fine; anything else is a real error.
    const message = err instanceof Error ? err.message : String(err);
    if (!/no such subscription|already canceled/i.test(message)) throw err;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Trigger only meaningful when the invoice is tied to a subscription renewal.
  // Cast through unknown because the Stripe types use a deprecated field name.
  const subscriptionId =
    (invoice as unknown as { subscription?: string | { id: string } }).subscription;
  if (!subscriptionId) return;
  const id = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(id);
  const userId = subscription.metadata?.supabase_user_id as string | undefined;
  if (!userId) return;
  await upsertSubscriptionFromStripe(userId, subscription);
}

async function upsertSubscriptionFromStripe(userId: string, subscription: Stripe.Subscription) {
  // Determine the tier from the first item's price id.
  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceId ? getTierForPriceId(priceId) : null;
  if (!tier) {
    console.warn(`Unknown price id from Stripe: ${priceId}`);
    return;
  }

  // `current_period_end` is on the subscription item in newer API versions.
  // Fall back across shapes for robustness.
  const periodEndUnix =
    (subscription as unknown as { current_period_end?: number }).current_period_end ??
    subscription.items.data[0]?.current_period_end;
  const periodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString()
    : null;

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  const admin = getSupabaseAdmin();
  await admin
    .from('user_subscriptions')
    .upsert(
      {
        user_id: userId,
        tier,
        current_period_end: periodEnd,
        provider: 'stripe',
        provider_customer_id: customerId,
        provider_subscription_id: subscription.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
}
