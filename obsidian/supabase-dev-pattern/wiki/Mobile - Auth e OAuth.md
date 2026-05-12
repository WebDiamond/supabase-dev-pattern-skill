---
tags: [mobile, expo, react-native, auth, oauth]
---

# Mobile — Auth e OAuth (Expo)

> Codice sorgente: [[Auth Service Mobile]]

## Client Supabase Mobile

```typescript
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage:            AsyncStorage,
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: false,  // false su mobile — gestito manualmente
    },
  }
)
```

## OAuth Mobile — Pattern PKCE con Expo

```typescript
WebBrowser.maybeCompleteAuthSession() // a livello di modulo

export async function signInWithOAuth(provider: 'google' | 'apple') {
  const redirectTo = Linking.createURL('auth/callback')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  })
  if (error) throw new Error(error.message)

  const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo)
  if (result.type !== 'success') throw new Error('Autenticazione annullata')

  const code = new URL(result.url).searchParams.get('code')
  if (!code) throw new Error('Codice OAuth mancante')

  const { data: session, error: se } = await supabase.auth.exchangeCodeForSession(code)
  if (se) throw new Error(se.message)
  return session
}
```

## Pattern `authFetch` — Chiamate Autenticate al Backend

```typescript
async function authFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non autenticato')

  const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${session.access_token}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Errore sconosciuto' }))
    throw new Error(err.error ?? 'Richiesta fallita')
  }
  return res.json()
}
```

## Note Correlate

- [[Auth Service Mobile]] — codice sorgente completo
- [[Auth - OAuth e Magic Link]] — differenze con web
- [[Frontend Web - Auth]] — pattern equivalente React web
