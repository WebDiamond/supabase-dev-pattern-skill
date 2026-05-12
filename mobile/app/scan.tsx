/**
 * app/(app)/scan.tsx — Schermata scanner QR completa
 *
 * Schermata a schermo intero per la scansione QR.
 * Integra QRCodeScanner + useQRCode per routing automatico.
 *
 * Utilizzo da qualsiasi schermata:
 *   router.push('/(app)/scan')
 *
 * Con callback personalizzato (query param):
 *   router.push({ pathname: '/(app)/scan', params: { mode: 'payment' } })
 */

import { router, useLocalSearchParams } from 'expo-router'
import { QRCodeScanner }                from '../../src/features/qrcode/QRCodeScanner'
import { useQRCode }                    from '../../src/features/qrcode/useQRCode'

export default function ScanScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const { handleScan, parse } = useQRCode()

  const onScan = (data: string, type: string) => {
    if (mode === 'payment') {
      // Modalità pagamento: aspettati un orderId nel QR
      const result = parse(data)
      if (result.parsed?.type === 'order') {
        router.replace({
          pathname: '/(app)/orders/[id]',
          params:   { id: result.parsed.data.orderId as string },
        })
        return
      }
    }

    // Comportamento default
    handleScan(data, type)
  }

  return (
    <QRCodeScanner
      onScan={onScan}
      onCancel={() => router.back()}
      hint={mode === 'payment' ? 'Scansiona il QR del pagamento' : 'Inquadra il QR code'}
    />
  )
}
