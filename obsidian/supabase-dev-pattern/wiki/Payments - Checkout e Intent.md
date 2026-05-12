---
tags: [payments, stripe, checkout, payment-intent]
---

# Payments — Checkout Session e Payment Intent

> Codice sorgente: [[Stripe Service]]

## Checkout Session (Hosted da Stripe)

```javascript
export async function createCheckoutSession({ userId, email, priceId, mode = 'payment', successUrl, cancelUrl }) {
  const customerId = await getOrCreateCustomer(userId, email)

  const { data: order } = await supabase.from('orders')
    .insert({ user_id: userId, amount: 0, currency: 'eur', status: 'pending' })
    .select().single()

  const session = await stripe.checkout.sessions.create({
    customer: customerId, mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl, cancel_url: cancelUrl,
    metadata: { order_id: order.id, user_id: userId },
    ...(mode === 'subscription' && {
      subscription_data: { metadata: { supabase_user_id: userId } },
    }),
  })

  await supabase.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id)
  return { sessionId: session.id, url: session.url }
}
```

**Flusso**: reindirizza su `session.url` → Stripe gestisce tutto → webhook aggiorna l'ordine.

## Payment Intent (Stripe Elements)

```javascript
export async function createPaymentIntent({ userId, email, amount, currency = 'eur', metadata = {} }) {
  const customerId = await getOrCreateCustomer(userId, email)

  const { data: order } = await supabase.from('orders')
    .insert({ user_id: userId, amount, currency, status: 'pending', metadata })
    .select().single()

  const intent = await stripe.paymentIntents.create({
    amount, currency, customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: { ...metadata, order_id: order.id, user_id: userId },
  })

  await supabase.from('orders').update({ stripe_payment_intent: intent.id }).eq('id', order.id)
  return { clientSecret: intent.client_secret, orderId: order.id }
}
```

## Portale Gestione Abbonamento

```javascript
export async function createPortalSession(userId, returnUrl) {
  const { data } = await supabase.from('stripe_customers')
    .select('stripe_customer_id').eq('user_id', userId).single()

  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id, return_url: returnUrl,
  })
  return session.url
}
```

## Note Correlate

- [[Stripe Service]] — codice sorgente completo
- [[Payments - Stripe Overview]] — architettura e pattern get-or-create
- [[Payments - Abbonamenti e Webhook]] — come vengono aggiornati gli stati
