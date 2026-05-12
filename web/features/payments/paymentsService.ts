// src/features/payments/paymentsService.ts
// Tutte le chiamate passano per il backend — mai Stripe API direttamente dal client
import { supabase } from '../../lib/supabase'

async function authFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non autenticato')

  const res = await fetch(`/payments${path}`, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${session.access_token}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Errore sconosciuto' }))
    throw new Error(err.error ?? 'Richiesta fallita')
  }

  return res.json()
}

export const paymentsService = {
  /** Redirige su Stripe Hosted Checkout */
  redirectToCheckout: async (priceId: string, mode: 'payment' | 'subscription' = 'payment') => {
    const { url } = await authFetch('/checkout', {
      method: 'POST', body: JSON.stringify({ priceId, mode }),
    })
    window.location.href = url
  },

  /** Crea PaymentIntent per Stripe Elements */
  createPaymentIntent: (amount: number, currency = 'eur') =>
    authFetch('/intent', { method: 'POST', body: JSON.stringify({ amount, currency }) })
    as Promise<{ clientSecret: string; orderId: string }>,

  /** URL portale gestione abbonamento */
  getPortalUrl: () =>
    authFetch('/portal', { method: 'POST' }) as Promise<{ url: string }>,

  /** Abbonamento attivo (Supabase direttamente) */
  getSubscription: () =>
    supabase.from('subscriptions').select('*')
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => data),
}
