---
tags: [auth, oauth, magic-link, supabase]
---

# Auth — OAuth e Magic Link

> Codice sorgente: [[Auth Service Web]], [[Auth Service Mobile]]

## OAuth Web (Google, GitHub, Apple)

```typescript
export async function signInWithOAuth(provider: 'google' | 'github' | 'apple') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw new Error(error.message)
  return data
}
```

## OAuth Mobile (Expo) — Pattern PKCE

Il mobile richiede un flusso diverso perché non può usare redirect HTTP:

```typescript
WebBrowser.maybeCompleteAuthSession() // chiamare in cima al file

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

### Differenze Web vs Mobile

| Aspetto | Web | Mobile |
|---|---|---|
| Redirect | HTTP URL | Deep link (`exp://...`) |
| `skipBrowserRedirect` | false | **true** |
| Scambio codice | automatico | manuale `exchangeCodeForSession` |
| Browser | stesso tab | `WebBrowser.openAuthSessionAsync` |

## Magic Link (Email Passwordless)

```typescript
export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw new Error(error.message)
}
```

## Note Correlate

- [[Auth - Panoramica]] — quando usare OAuth vs email/password
- [[Mobile - Auth e OAuth]] — setup Expo completo
- [[Auth - Email Password]] — alternativa con password
