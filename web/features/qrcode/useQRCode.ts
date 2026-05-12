/**
 * useQRCode.ts — Web (React)
 *
 * Hook che centralizza la logica di business legata ai QR code:
 * - generazione payload strutturati
 * - parsing e validazione del contenuto scansionato
 * - routing in base al tipo di QR
 *
 * Utilizzo:
 *   const { generate, parse, handleScan } = useQRCode()
 *
 *   // Genera QR per un ordine
 *   const qrValue = generate.order('ord-123', 'usr-abc')
 *
 *   // Gestisce una scansione (routing automatico per tipo)
 *   <QRCodeScanner onScan={handleScan} />
 */

import { useCallback }  from 'react'
import { useNavigate }  from 'react-router-dom'

// ── Tipi payload ──────────────────────────────────────────────────────────────

export type QRPayloadType =
  | 'deep_link'
  | 'url'
  | 'order'
  | 'profile'
  | 'product'
  | 'custom'

export interface QRPayload {
  type:    QRPayloadType
  version: number
  data:    Record<string, unknown>
}

export interface QRScanResult {
  raw:      string
  parsed:   QRPayload | null
  isValid:  boolean
  isUrl:    boolean
  isAppLink:boolean
}

const APP_BASE_URL = import.meta.env.VITE_APP_URL ?? window.location.origin

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useQRCode() {
  const navigate = useNavigate()

  /**
   * Generatori di payload QR strutturati.
   */
  const generate = {
    /** Payload JSON strutturato */
    payload: (type: QRPayloadType, data: Record<string, unknown>) =>
      JSON.stringify({ type, version: 1, data } satisfies QRPayload),

    /** URL assoluto (apre nel browser) */
    url: (url: string) => url,

    /** Link interno all'app */
    appLink: (path: string) => `${APP_BASE_URL}${path}`,

    /** Shortcut — ordine */
    order: (orderId: string, userId: string) =>
      generate.payload('order', { orderId, userId }),

    /** Shortcut — profilo utente */
    profile: (userId: string, username: string) =>
      generate.payload('profile', { userId, username }),

    /** Shortcut — prodotto */
    product: (productId: string, name?: string) =>
      generate.payload('product', { productId, name }),
  }

  /**
   * Parser — analizza il testo grezzo di una scansione.
   */
  const parse = useCallback((raw: string): QRScanResult => {
    const trimmed   = raw.trim()
    const isUrl     = /^https?:\/\//i.test(trimmed)
    const isAppLink = trimmed.startsWith(APP_BASE_URL)

    let parsed: QRPayload | null = null
    try {
      const obj = JSON.parse(trimmed)
      if (obj?.type && obj?.version !== undefined && obj?.data) {
        parsed = obj as QRPayload
      }
    } catch { /* non è JSON */ }

    return {
      raw:      trimmed,
      parsed,
      isValid:  trimmed.length > 0,
      isUrl,
      isAppLink,
    }
  }, [])

  /**
   * Handler principale da passare a QRCodeScanner.onScan.
   * Effettua routing automatico in base al tipo di contenuto.
   */
  const handleScan = useCallback((data: string) => {
    const result = parse(data)

    if (!result.isValid) {
      console.warn('[QR] Contenuto non valido:', data)
      return
    }

    // Link interno all'app corrente
    if (result.isAppLink) {
      const path = result.raw.replace(APP_BASE_URL, '')
      navigate(path)
      return
    }

    // URL esterno — apri in nuova tab
    if (result.isUrl) {
      window.open(result.raw, '_blank', 'noopener,noreferrer')
      return
    }

    // Payload strutturato
    if (result.parsed) {
      const { type, data: payload } = result.parsed

      switch (type) {
        case 'order':
          navigate(`/orders/${payload.orderId}`)
          break
        case 'profile':
          navigate(`/profile/${payload.userId}`)
          break
        case 'product':
          navigate(`/products/${payload.productId}`)
          break
        case 'custom':
          // Gestione personalizzata — emetti evento
          window.dispatchEvent(new CustomEvent('qr:custom', { detail: payload }))
          break
        default:
          console.info('[QR] Tipo non gestito:', type, payload)
      }

      return
    }

    // Testo semplice — log
    console.info('[QR] Testo semplice:', result.raw)
  }, [parse, navigate])

  return { generate, parse, handleScan }
}
