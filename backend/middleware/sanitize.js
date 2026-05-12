// src/middleware/sanitize.js

/**
 * Rimuove caratteri pericolosi (XSS, script injection) da body, query e params.
 * Usare come middleware globale in app.js.
 */
export function sanitizeRequest(req, res, next) {
  sanitizeObject(req.body)
  sanitizeObject(req.query)
  sanitizeObject(req.params)
  next()
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeString(obj[key])
    } else if (typeof obj[key] === 'object') {
      sanitizeObject(obj[key])
    }
  }
}

function sanitizeString(str) {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}
