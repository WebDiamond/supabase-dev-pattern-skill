// src/features/payments/useSubscription.ts
import { useEffect, useState } from 'react'
import { supabase }            from '../../lib/supabase'

export function useSubscription() {
  const [subscription, setSubscription] = useState<any>(null)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    supabase.from('subscriptions').select('*')
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => { setSubscription(data); setLoading(false) })

    // Realtime — aggiorna dopo webhook Stripe
    const ch = supabase.channel('subscription-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' },
          ({ new: updated }) => setSubscription(updated))
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [])

  return { subscription, loading, isPremium: ['active','trialing'].includes(subscription?.status) }
}
