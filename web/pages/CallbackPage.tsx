// src/pages/auth/CallbackPage.tsx
// Gestisce il redirect dopo OAuth e Magic Link
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase }    from '../../lib/supabase'

export function CallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN')         navigate('/dashboard')
      if (event === 'PASSWORD_RECOVERY') navigate('/auth/reset-password')
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  return <div>Autenticazione in corso...</div>
}
