---
tags: [auth, email, password, supabase]
---

# Auth — Email e Password

> Codice sorgente: [[Auth Service Web]], [[Auth Service Mobile]]

## Sign Up

```typescript
async signUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { username },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw new Error(error.message)
  return data
},
```

- Email normalizzata con `.trim().toLowerCase()` — pattern da seguire sempre
- `username` salvato in `user_metadata` → disponibile subito, poi sincronizzare in `profiles`
- `emailRedirectTo` obbligatorio se vuoi conferma email

## Sign In

```typescript
async signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error) throw new Error(error.message)
  return data
},
```

## Reset Password

```typescript
async resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  if (error) throw new Error(error.message)
}
```

> Non rivelare se l'email esiste nel sistema — usa messaggi generici.

## Sign Out

```typescript
async signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
},
```

## Note Correlate

- [[Auth - Panoramica]] — overview di tutti i metodi
- [[Auth - OAuth e Magic Link]] — alternative senza password
- [[Frontend Web - Auth]] — authStore e setup listener sessione
