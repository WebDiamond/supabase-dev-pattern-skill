// src/middleware/auth.js
import supabase from '../lib/supabase.js'

/**
 * Verifica il JWT Supabase nell'header Authorization.
 * Popola req.user con i dati dell'utente autenticato.
 */
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

/**
 * Verifica che l'utente abbia uno dei ruoli specificati.
 * Va usato DOPO requireAuth.
 * Richiede la tabella profiles con colonna role.
 */
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

// Utilizzo:
// router.get('/profile',     requireAuth,                       handler)
// router.delete('/user/:id', requireAuth, requireRole('admin'), handler)
