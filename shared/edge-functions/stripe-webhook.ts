// supabase/functions/stripe-webhook/index.ts
// Deploy: supabase functions deploy stripe-webhook
// Registra su: https://dashboard.stripe.com/webhooks
// URL: https://xyzxyz.supabase.co/functions/v1/stripe-webhook
// Test locale: stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe           from 'https://esm.sh/stripe@14?target=deno'

const stripe   = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature')
  const body      = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    return new Response(
      `Webhook Error: ${(err as Error).message}`,
      { status: 400 }
    )
  }

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      await supabase.from('orders')
        .update({ status: 'paid', amount: session.amount_total })
        .eq('stripe_session_id', session.id)
      break
    }

    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent
      await supabase.from('orders')
        .update({ status: 'paid' })
        .eq('stripe_payment_intent', intent.id)
      break
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent
      await supabase.from('orders')
        .update({ status: 'failed' })
        .eq('stripe_payment_intent', intent.id)
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from('subscriptions').upsert({
        stripe_subscription_id: sub.id,
        stripe_price_id:        (sub.items.data[0].price as Stripe.Price).id,
        status:                 sub.status,
        current_period_start:   new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end:     new Date(sub.current_period_end   * 1000).toISOString(),
        cancel_at_period_end:   sub.cancel_at_period_end,
      }, { onConflict: 'stripe_subscription_id' })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await supabase.from('subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', invoice.subscription as string)
      break
    }
  }

  return new Response(
    JSON.stringify({ received: true }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
