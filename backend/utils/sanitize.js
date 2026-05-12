// src/utils/sanitize.js

/** Normalizza numero di telefono — mantiene solo + e cifre */
export function sanitizePhone(phone) {
  return phone.replace(/[^\d+]/g, '')
}

/** Previene path traversal — rimuove .. e separatori */
export function sanitizePath(filePath) {
  return filePath.replace(/\.\./g, '').replace(/[/\\]/g, '')
}
