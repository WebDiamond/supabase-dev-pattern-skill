/**
 * useQRCode.ts — Mobile (Expo)
 *
 * Hook che centralizza la logica di business legata ai QR code:
 * - generazione payload strutturati (deep link, ordini, profili, 2FA)
 * - parsing e validazione del contenuto scansionato
 * - dispatch delle azioni in base al tipo di QR
 *
 * Utilizzo:
 *   const { generate, parse, handleScan } = useQRCode()
 *
 *   // Genera QR per deep link
 *   const qrValue = generate.deepLink('product', { id: '123' })
 *
 *   // Gestisce una scansione (routing automatico per tipo)
 *   <QRCodeScanner onScan={handleScan} onCancel={...} />
 */

import { useCallback }  from 'react'
import { router }       from 'expo-router'
import { Alert }        from 'react-native'
import * as Linking     from 'expo-linking'

// ── Tipi payload ──────────────────────────────────────────────────────────────

export type QRPayloadType =
  | 'deep_link'      // navigazione interna all'app
  | 'url'            // URL web esterno
  | 'order'          // dettaglio ordine
  | 'profile'        // profilo utente
  | 'product'        // scheda prodotto
  | 'custom'         // payload arbitrario dell'app

export interface QRPayload {
  type:     QRPayloadType
  version:  number
  data:     Record<string, unknown>
}

export interface QRScanResult {
  raw:      string            // testo grezzo decodificato
  parsed:   QRPayload | null  // payload strutturato (null se non riconosciuto)
  isValid:  boolean
  isUrl:    boolean
  isAppLink:boolean
}

// ── Costante schema deep link ─────────────────────────────────────────────────
const APP_SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME ?? 'myapp'

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useQRCode() {

  /**
   * Generatori di payload QR strutturati.
   * Ogni metodo ritorna una stringa pronta per il prop `value` di QRCodeGenerator.
   */
  const generate = {
    /** Deep link interno all'app: myapp://path?param=value */
    deepLink: (path: string, params?: Record<string, string>) => {
      const url = Linking.createURL(path, { queryParams: params })
      return url
    },

    /** Payload JSON strutturato (ordine, prodotto, profilo, ecc.) */
    payload: (type: QRPayloadType, data: Record<string, unknown>) => {
      const payload: QRPayload = { type, version: 1, data }
      return JSON.stringify(payload)
    },

    /** Shortcut — QR per un ordine specifico */
    order: (orderId: string, userId: string) =>
      generate.payload('order', { orderId, userId }),

    /** Shortcut — QR per il profilo utente (condivisione contatto) */
    profile: (userId: string, username: string) =>
      generate.payload('profile', { userId, username }),

    /** Shortcut — URL web semplice */
    url: (url: string) => url,
  }

  /**
   * Parser — analizza il testo grezzo di una scansione.
   * Ritorna un oggetto strutturato con tipo, validità e payload.
   */
  const parse = useCallback((raw: string): QRScanResult => {
    const trimmed    = raw.trim()
    const isUrl      = /^https?:\/\//i.test(trimmed)
    const isAppLink  = trimmed.startsWith(`${APP_SCHEME}://`)

    // Tenta parsing JSON strutturato
    let parsed: QRPayload | null = null
    try {
      const obj = JSON.parse(trimmed)
      if (obj?.type && obj?.version && obj?.data) {
        parsed = obj as QRPayload
      }
    } catch {
      // Non è JSON — può essere URL o testo semplice
    }

    return {
      raw:      trimmed,
      parsed,
      isValid:  trimmed.length > 0,
      isUrl,
      isAppLink,
    }
  }, [])

  /**
   * Handler principale — da passare direttamente a QRCodeScanner.onScan.
   * Effettua routing automatico in base al tipo di contenuto scansionato.
   */
  const handleScan = useCallback(async (data: string, _type: string) => {
    const result = parse(data)

    if (!result.isValid) {
      Alert.alert('QR non valido', 'Il codice scansionato non è riconoscibile.')
      return
    }

    // Deep link app
    if (result.isAppLink) {
      await Linking.openURL(result.raw)
      return
    }

    // URL web esterno
    if (result.isUrl) {
      Alert.alert(
        'Apri link',
        result.raw.length > 60 ? result.raw.slice(0, 60) + '…' : result.raw,
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Apri', onPress: () => Linking.openURL(result.raw) },
        ]
      )
      return
    }

    // Payload strutturato
    if (result.parsed) {
      const { type, data: payload } = result.parsed

      switch (type) {
        case 'order':
          router.push({
            pathname: '/(app)/orders/[id]',
            params:   { id: payload.orderId as string },
          })
          break

        case 'profile':
          router.push({
            pathname: '/(app)/profile/[id]',
            params:   { id: payload.userId as string },
          })
          break

        case 'product':
          router.push({
            pathname: '/(app)/products/[id]',
            params:   { id: payload.productId as string },
          })
          break

        case 'custom':
          // Lascia gestire al chiamante — emetti un evento o callback
          Alert.alert('QR personalizzato', JSON.stringify(payload, null, 2))
          break

        default:
          Alert.alert('Tipo non supportato', `Tipo payload: ${type}`)
      }

      return
    }

    // Testo semplice — mostra all'utente
    Alert.alert('Contenuto QR', result.raw)
  }, [parse])

  return { generate, parse, handleScan }
}
