---
tags: [frontend, web, react, auth, zustand]
---

# Frontend Web — Auth

> Codice sorgente: [[Auth Service Web]]

## Auth Store (Zustand)

```typescript
export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user:    null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setLoading: (loading) => set({ loading }),
}))
```

## Setup Listener Sessione

```typescript
export function useAuthSetup() {
  const { setSession, setLoading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )
    return () => subscription.unsubscribe()
  }, [])
}
```

**Usare in `App.tsx`** (componente radice) per inizializzare lo store prima di qualsiasi route.

## Rotta Protetta

```typescript
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuthStore()

  if (loading) return <div>Caricamento...</div>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

## Client Supabase Web

```typescript
// usa ANON_KEY
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

## Note Correlate

- [[Auth Service Web]] — codice sorgente completo
- [[Auth - Panoramica]] — tutti i metodi disponibili
- [[Mobile - Auth e OAuth]] — pattern equivalente su Expo
