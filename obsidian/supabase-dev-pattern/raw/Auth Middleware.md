---
tags: [raw, backend, auth, middleware]
source: backend/middleware/auth.js
---

```javascript
import supabase from '../lib/supabase.js'

export async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization']

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante o malformato' })
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Token non valido o scaduto' })
  }

  req.user = user
  next()
}

export function requireRole(...roles) {
  return async (req, res, next) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single()

    if (error || !profile) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (!roles.includes(profile.role)) {
      return res.status(403).json({
        error:   'Forbidden',
        message: `Richiesto uno dei ruoli: ${roles.join(', ')}`,
      })
    }

    req.userRole = profile.role
    next()
  }
}
```

→ [[Backend - Auth Middleware]] per la spiegazione
