// src/features/payments/paymentsService.ts
import { supabase }    from '../../lib/supabase'

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL!

async function authFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non autenticato')

  const res = await fetch(`${BACKEND}/payments${path}`, {
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
  createPaymentIntent: (amount: number, currency = 'eur') =>
    authFetch('/intent', { method: 'POST', body: JSON.stringify({ amount, currency }) })
    as Promise<{ clientSecret: string; orderId: string }>,

  getPortalUrl: () =>
    authFetch('/portal', { method: 'POST' }) as Promise<{ url: string }>,

  getSubscription: () =>
    supabase.from('subscriptions').select('*')
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => data),
}
