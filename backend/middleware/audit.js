// src/middleware/audit.js
import logger from '../lib/logger.js'

/**
 * Logga ogni richiesta su endpoint sensibili.
 * Usare su: app.use('/auth', auditLog) e app.use('/admin', auditLog)
 */
export function auditLog(req, res, next) {
  const start = Date.now()

  res.on('finish', () => {
    logger.info('AUDIT', {
      timestamp: new Date().toISOString(),
      ip:        req.ip,
      userId:    req.user?.id ?? 'anonymous',
      method:    req.method,
      path:      req.originalUrl,
      status:    res.statusCode,
      duration:  `${Date.now() - start}ms`,
      userAgent: req.headers['user-agent'],
    })
  })

  next()
}
