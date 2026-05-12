---
tags: [payments, stripe, webhook, subscriptions]
---

# Payments — Abbonamenti e Webhook

> Codice sorgente: [[Stripe Webhook EF]]

## Verifica Firma (Sicurezza Critica)

```typescript
const signature = req.headers.get('stripe-signature')
const body      = await req.text()  // raw body — non parsare prima!

let event: Stripe.Event
try {
  event = stripe.webhooks.constructEvent(body, signature!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)
} catch (err) {
  return new Response(`Webhook Error: ${err.message}`, { status: 400 })
}
```

> **Critico**: verificare sempre la firma. Senza questo chiunque può inviare falsi eventi.

## Gestione degli Eventi

| Evento Stripe | Azione DB |
|---|---|
| `checkout.session.completed` | `orders` → `status: 'paid'` |
| `payment_intent.succeeded` | `orders` → `status: 'paid'` |
| `payment_intent.payment_failed` | `orders` → `status: 'failed'` |
| `customer.subscription.created/updated` | `subscriptions` upsert |
| `customer.subscription.deleted` | `subscriptions` → `status: 'canceled'` |
| `invoice.payment_failed` | `subscriptions` → `status: 'past_due'` |

## Ciclo di Vita Abbonamento

```
pending → trialing → active → past_due → canceled
                           ↘ cancel_at_period_end=true → canceled
                           ↗ incomplete (pagamento iniziale fallito)
```

## Webhook su Express (alternativa)

```javascript
// app.js — montare PRIMA di express.json()!
app.use('/payments', paymentsRouter)

router.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']
    const event = constructWebhookEvent(req.body, sig)
    // ... gestisci eventi
    res.json({ received: true })
  }
)
```

## Note Correlate

- [[Stripe Webhook EF]] — codice sorgente Edge Function
- [[Payments - Stripe Overview]] — architettura generale
- [[Payments - Checkout e Intent]] — come vengono creati ordini
- [[Edge Functions]] — deployment
