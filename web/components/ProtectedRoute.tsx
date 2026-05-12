// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore }     from '../store/authStore'
import { useSubscription }  from '../features/payments/paymentsHooks'

/** Blocca route per utenti non autenticati */
export function ProtectedRoute() {
  const { session, loading } = useAuthStore()
  if (loading)  return <div>Caricamento...</div>
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

/** Blocca route per utenti senza abbonamento attivo */
export function SubscriptionRoute() {
  const { data: sub, isLoading } = useSubscription()
  if (isLoading)                                     return <div>Caricamento...</div>
  if (!sub || !['active','trialing'].includes(sub.status))
    return <Navigate to="/pricing" replace />
  return <Outlet />
}
