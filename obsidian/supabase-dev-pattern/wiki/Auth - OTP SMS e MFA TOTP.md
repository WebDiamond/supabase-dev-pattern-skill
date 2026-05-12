---
tags: [auth, otp, mfa, totp, 2fa, supabase]
---

# Auth — OTP SMS e MFA TOTP

> Codice sorgente: [[Auth Service Web]], [[Auth Service Mobile]]

## OTP SMS (Login via Telefono)

```typescript
export const smsService = {
  async sendOTP(phone: string) {
    const { error } = await supabase.auth.signInWithOtp({
      phone: phone.replace(/[^\d+]/g, ''),
    })
    if (error) throw new Error(error.message)
  },
  async verifyOTP(phone: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone.replace(/[^\d+]/g, ''), token, type: 'sms',
    })
    if (error) throw new Error('Codice non valido o scaduto')
    return data
  },
}
```

## MFA TOTP (Google Authenticator, Authy)

Il TOTP è un secondo fattore — l'utente deve prima autenticarsi normalmente.

### Enrollment

```typescript
async enroll() {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType:   'totp',
    friendlyName: `Browser ${new Date().toLocaleDateString('it-IT')}`,
  })
  if (error) throw new Error(error.message)
  return {
    factorId: data.id,
    qrCode:   data.totp.qr_code,  // mostra come <img src={qrCode}>
    secret:   data.totp.secret,
  }
},
```

### Verifica

```typescript
async verify(factorId: string, code: string) {
  const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) throw new Error('Codice non valido')
  return data
},
```

### Rimozione

```typescript
async unenroll(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw new Error(error.message)
},
```

## Sicurezza OTP

- Normalizza sempre il numero: `phone.replace(/[^\d+]/g, '')`
- Messaggi di errore generici (no user enumeration)
- Rate limiting su `/auth`: 10 req / 15 min [[Backend - App e Middleware]]
- `token` deve essere esattamente 6 cifre numeriche

## Note Correlate

- [[Auth - Panoramica]] — overview di tutti i metodi
- [[Backend - App e Middleware]] — rate limiting su /auth
- [[Auth - Email Password]] — autenticazione base prima del 2FA
