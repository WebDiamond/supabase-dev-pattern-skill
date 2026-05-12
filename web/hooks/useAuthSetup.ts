// src/hooks/useAuthSetup.ts
// Chiama questo hook nel componente App root per sincronizzare la sessione
import { useEffect } from 'react'
import { supabase }  from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useAuthSetup() {
  const { setSession, setLoading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])
}
