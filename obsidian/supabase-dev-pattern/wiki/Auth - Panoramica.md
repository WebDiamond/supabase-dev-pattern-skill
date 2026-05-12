---
tags: [auth, supabase, panoramica]
---

# Auth — Panoramica

## Metodi Supportati

| Metodo | Web | Mobile | Quando usarlo |
|---|---|---|---|
| Email + Password | ✅ | ✅ | App standard |
| OAuth (Google/GitHub/Apple) | ✅ | ✅ (Expo) | Login sociale |
| Magic Link | ✅ | — | Email passwordless |
| OTP SMS | ✅ | ✅ | Verifica telefono |
| MFA TOTP | ✅ | ✅ | 2FA con authenticator |

## Flusso JWT

```
1. Client si autentica → Supabase restituisce { access_token, refresh_token }
2. Client invia: Authorization: Bearer <access_token>
3. Backend chiama supabase.auth.getUser(token) per verificarlo
4. Se valido → req.user popolato → handler eseguito
```

Vedi [[Backend - Auth Middleware]] per l'implementazione Express.

## Session Management (Web)

```typescript
// Zustand store — src/store/authStore.ts
const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user:    null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setLoading:  (loading) => set({ loading }),
}))
```

Vedi [[Frontend Web - Auth]] per il setup completo.

## Callback URL Pattern

- Web: `${window.location.origin}/auth/callback`
- Mobile: `Linking.createURL('auth/callback')` (deep link Expo)

## Note per Metodo

- [[Auth - Email Password]] — signup, signin, reset password
- [[Auth - OAuth e Magic Link]] — Google, GitHub, Apple, email OTP
- [[Auth - OTP SMS e MFA TOTP]] — phone OTP, app authenticator 2FA

## Sicurezza

- Messaggi di errore generici (non rivela se email/telefono esiste)
- Rate limiting su `/auth`: 10 req / 15 minuti [[Backend - App e Middleware]]
- Audit log su tutte le request `/auth` [[Backend - App e Middleware]]
