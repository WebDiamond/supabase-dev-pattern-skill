---
tags: [backend, auth, middleware, jwt]
---

# Backend — Auth Middleware

> Codice sorgente: [[Auth Middleware]]

## `requireAuth` — Verifica JWT

```javascript
export async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token mancante o malformato' })

  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user)
    return res.status(401).json({ error: 'Token non valido o scaduto' })

  req.user = user
  next()
}
```

Verifica il JWT **online** contro Supabase Auth — non lo decripta localmente.

## `requireRole` — Controllo Ruolo

```javascript
export function requireRole(...roles) {
  return async (req, res, next) => {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', req.user.id).single()

    if (!profile || !roles.includes(profile.role))
      return res.status(403).json({ error: 'Forbidden' })

    req.userRole = profile.role
    next()
  }
}
```

> Usare **sempre dopo** `requireAuth` — dipende da `req.user`.

## Utilizzo nelle Route

```javascript
router.get('/profile',     requireAuth,                       handler)
router.delete('/user/:id', requireAuth, requireRole('admin'), handler)
router.patch('/post/hide',  requireAuth, requireRole('admin', 'moderator'), handler)
```

## Note Correlate

- [[Auth Middleware]] — codice sorgente completo
- [[Auth - Panoramica]] — flusso JWT client → server
- [[Database - RLS]] — difesa complementare a livello DB
- [[Backend - App e Middleware]] — dove questi middleware vengono montati
