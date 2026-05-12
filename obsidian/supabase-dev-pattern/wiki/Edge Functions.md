---
tags: [edge-functions, supabase, deno, serverless]
---

# Edge Functions (Supabase)

> Codice sorgente: [[Stripe Webhook EF]]
> Runtime: **Deno** — TypeScript nativo, import da URL

## Funzioni Disponibili

| Funzione | Trigger | Scopo |
|---|---|---|
| `stripe-webhook` | HTTP POST da Stripe | Aggiorna ordini/abbonamenti |
| `send-email` | HTTP POST (interno) | Invio email transazionali |
| `send-otp-custom` | HTTP POST (interno) | OTP personalizzato |

## Client Supabase in Edge Function

```typescript
// Usa SERVICE_ROLE_KEY — bypassa RLS per aggiornamenti
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
```

## Deploy e Test

```bash
supabase functions deploy stripe-webhook
supabase functions serve stripe-webhook
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

## Import da URL (Deno Style)

```typescript
import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe           from 'https://esm.sh/stripe@14?target=deno'
```

## Edge Function vs Backend Express

| Aspetto | Edge Function | Backend Express |
|---|---|---|
| Runtime | Deno (edge, CDN) | Node.js (server) |
| Stato | Stateless | Può avere stato |
| Uso ideale | Webhook, email | Logica complessa, file |

## Note Correlate

- [[Stripe Webhook EF]] — codice sorgente completo
- [[Payments - Abbonamenti e Webhook]] — dettaglio eventi
- [[Backend - App e Middleware]] — alternativa con Express
