---
tags: [raw, backend, stripe, payments]
source: backend/services/stripeService.js
---

```javascript
import { stripe } from '../lib/stripe.js'
import supabase   from '../lib/supabase.js'

export async function getOrCreateCustomer(userId, email) {
  const { data: existing } = await supabase
    .from('stripe_customers').select('stripe_customer_id')
    .eq('user_id', userId).single()

  if (existing) return existing.stripe_customer_id

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })

  await supabase.from('stripe_customers').insert({
    user_id: userId, stripe_customer_id: customer.id,
  })

  return customer.id
}

export async function createCheckoutSession({ userId, email, priceId, mode = 'payment', successUrl, cancelUrl }) {
  const customerId = await getOrCreateCustomer(userId, email)

  const { data: order } = await supabase.from('orders')
    .insert({ user_id: userId, amount: 0, currency: 'eur', status: 'pending' })
    .select().single()

  const session = await stripe.checkout.sessions.create({
    customer:   customerId,
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url:  cancelUrl,
    metadata:    { order_id: order.id, user_id: userId },
    ...(mode === 'subscription' && {
      subscription_data: { metadata: { supabase_user_id: userId } },
    }),
  })

  await supabase.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id)
  return { sessionId: session.id, url: session.url }
}

export async function createPaymentIntent({ userId, email, amount, currency = 'eur', metadata = {} }) {
  const customerId = await getOrCreateCustomer(userId, email)

  const { data: order } = await supabase.from('orders')
    .insert({ user_id: userId, amount, currency, status: 'pending', metadata })
    .select().single()

  const intent = await stripe.paymentIntents.create({
    amount, currency,
    customer:                  customerId,
    automatic_payment_methods: { enabled: true },
    metadata:                  { ...metadata, order_id: order.id, user_id: userId },
  })

  await supabase.from('orders').update({ stripe_payment_intent: intent.id }).eq('id', order.id)
  return { clientSecret: intent.client_secret, orderId: order.id }
}

export async function createPortalSession(userId, returnUrl) {
  const { data } = await supabase.from('stripe_customers')
    .select('stripe_customer_id').eq('user_id', userId).single()

  if (!data) throw new Error('Customer Stripe non trovato')

  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id, return_url: returnUrl,
  })
  return session.url
}

export async function getActiveSubscription(userId) {
  const { data } = await supabase.from('subscriptions').select('*')
    .eq('user_id', userId).in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false }).limit(1).single()
  return data
}

export function constructWebhookEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(
    rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET
  )
}
```

→ [[Payments - Stripe Overview]] e [[Payments - Checkout e Intent]] per la spiegazione
