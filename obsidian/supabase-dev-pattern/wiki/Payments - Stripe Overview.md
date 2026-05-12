---
tags: [payments, stripe, overview]
---

# Payments — Stripe Overview

## Architettura Pagamenti

```
Client                Backend Express           Stripe API         Supabase DB
  │                        │                        │                   │
  │  POST /payments/intent  │                        │                   │
  ├───────────────────────→ │                        │                   │
  │                        │──getOrCreateCustomer──→│                   │
  │                        │──createPaymentIntent──→│                   │
  │                        │←─────clientSecret──────│                   │
  │                        │──INSERT orders (pending)────────────────→  │
  │←──{ clientSecret }──── │                        │                   │
  │                        │                        │                   │
  │  Stripe.js conferma    │                        │                   │
  ├──────────────────────────────────────────────→  │                   │
  │                        │          Webhook evento│                   │
  │                        │←───────────────────────│                   │
  │                        │──UPDATE orders (paid)───────────────────→  │
```

## Tabelle Coinvolte

- `stripe_customers` — relazione 1:1 utente ↔ Stripe Customer ID
- `orders` — ogni pagamento singolo (Checkout Session o PaymentIntent)
- `subscriptions` — abbonamenti ricorrenti gestiti via webhook

→ Vedi [[Database - Schema]] per la struttura dettagliata.

## Pattern: get-or-create Customer

```javascript
export async function getOrCreateCustomer(userId, email) {
  const { data: existing } = await supabase
    .from('stripe_customers').select('stripe_customer_id')
    .eq('user_id', userId).single()

  if (existing) return existing.stripe_customer_id

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })
  await supabase.from('stripe_customers').insert({ user_id: userId, stripe_customer_id: customer.id })
  return customer.id
}
```

## Due Modi di Pagare

| Modalità | Quando usarla | Note |
|---|---|---|
| **Checkout Session** | Pagina hosted da Stripe | UX semplice, no codice frontend |
| **PaymentIntent** | Stripe Elements nel tuo UI | Controllo totale sull'UX |

→ Dettagli in [[Payments - Checkout e Intent]]

## Regola: Mai Fidarsi del Success URL

Gli stati vengono aggiornati **solo via webhook** — mai dal redirect.
→ Vedi [[Payments - Abbonamenti e Webhook]]

## Note Correlate

- [[Stripe Service]] — codice sorgente completo
- [[Payments - Checkout e Intent]] — implementazione dettagliata
- [[Payments - Abbonamenti e Webhook]] — subscriptions e webhook handler
- [[Database - Schema]] — tabelle stripe_customers, orders, subscriptions
