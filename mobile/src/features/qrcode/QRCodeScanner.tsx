/**
 * QRCodeScanner.tsx — Mobile (Expo)
 *
 * Scansiona QR code e barcode tramite fotocamera.
 * Supporta scan continuo o scan singolo con callback.
 *
 * Dipendenze:
 *   npx expo install expo-camera expo-barcode-scanner
 *   (expo-barcode-scanner è incluso in expo-camera SDK 50+)
 *
 * Utilizzo — scan singolo (es. login, pagamenti):
 *   <QRCodeScanner
 *     onScan={(data) => handleDeepLink(data)}
 *     onCancel={() => router.back()}
 *   />
 *
 * Utilizzo — scan continuo (es. magazzino, inventario):
 *   <QRCodeScanner
 *     continuous
 *     onScan={(data) => addItemToCart(data)}
 *     onCancel={() => setScanning(false)}
 *   />
 *
 * Utilizzo — solo certi tipi di codice:
 *   <QRCodeScanner
 *     barcodeTypes={['qr', 'ean13', 'code128']}
 *     onScan={(data) => console.log(data)}
 *     onCancel={() => {}}
 *   />
 */

import { useState, useRef, useEffect }   from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native'
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera'
import * as Haptics                      from 'expo-haptics'
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence,
  FadeIn,
}                                        from 'react-native-reanimated'
import { useSafeAreaInsets }             from 'react-native-safe-area-context'
import { useTheme }                      from '../../hooks/useTheme'

type BarcodeType =
  | 'qr' | 'aztec' | 'ean13' | 'ean8' | 'pdf417'
  | 'upc_e' | 'datamatrix' | 'code39' | 'code93'
  | 'itf14' | 'codabar' | 'code128' | 'upc_a'

interface QRCodeScannerProps {
  /** Callback con il contenuto decodificato */
  onScan:       (data: string, type: string) => void
  /** Callback quando l'utente preme Annulla */
  onCancel:     () => void
  /** Se true, continua a scansionare dopo ogni lettura */
  continuous?:  boolean
  /** Tipi di barcode accettati (default: solo QR) */
  barcodeTypes?: BarcodeType[]
  /** Testo guida mostrato sopra il mirino */
  hint?: string
}

const { width: SCREEN_W } = Dimensions.get('window')
const FRAME_SIZE = SCREEN_W * 0.68

export function QRCodeScanner({
  onScan,
  onCancel,
  continuous   = false,
  barcodeTypes = ['qr'],
  hint         = 'Inquadra il QR code',
}: QRCodeScannerProps) {
  const theme   = useTheme()
  const insets  = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned]           = useState(false)
  const [torchOn, setTorchOn]           = useState(false)
  const cooldownRef                     = useRef(false)

  // Animazione linea di scansione
  const scanLineY = useSharedValue(0)
  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }))

  useEffect(() => {
    scanLineY.value = withRepeat(
      withSequence(
        withTiming(FRAME_SIZE - 4, { duration: 1800 }),
        withTiming(0,              { duration: 1800 })
      ),
      -1,    // infinito
      false
    )
  }, [])

  // Richiesta permesso fotocamera
  if (!permission) return null

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.lg,
                        fontWeight: theme.fontWeight.semibold, textAlign: 'center', marginBottom: 8 }}>
          Accesso fotocamera richiesto
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.md,
                        textAlign: 'center', marginBottom: 24 }}>
          Per scansionare il QR code è necessario consentire l'accesso alla fotocamera.
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius:    theme.radius.md,
            paddingVertical: theme.spacing.sm + 2,
            paddingHorizontal: theme.spacing.xl,
          }}
          onPress={requestPermission}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Concedi accesso alla fotocamera"
        >
          <Text style={{ color: theme.colors.textInverse, fontWeight: theme.fontWeight.semibold }}>
            Consenti accesso
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCancel}
          style={{ marginTop: 16 }}
          accessible
          accessibilityRole="button"
        >
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.sm }}>
            Annulla
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  const handleBarCodeScanned = async ({ type, data }: BarcodeScanningResult) => {
    // Debounce — evita scansioni multiple in rapida successione
    if (cooldownRef.current) return
    if (!continuous && scanned) return

    cooldownRef.current = true
    setTimeout(() => { cooldownRef.current = false }, continuous ? 1500 : 99999)

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    if (!continuous) setScanned(true)

    onScan(data, type)
  }

  return (
    <View style={styles.fullScreen}>

      {/* Fotocamera a schermo intero */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torchOn}
        onBarcodeScanned={scanned && !continuous ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes }}
      />

      {/* Overlay scuro con ritaglio trasparente per il mirino */}
      <View style={styles.overlay}>

        {/* Zona sopra il mirino */}
        <View style={[styles.overlayRow, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />

        {/* Riga centrale: lato sinistro | mirino | lato destro */}
        <View style={styles.middleRow}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} />

          {/* Mirino */}
          <View style={[styles.frame, { width: FRAME_SIZE, height: FRAME_SIZE }]}>

            {/* Angoli del mirino */}
            {(['tl','tr','bl','br'] as const).map((corner) => (
              <View
                key={corner}
                style={[
                  styles.corner,
                  styles[corner],
                  { borderColor: scanned ? theme.colors.success : theme.colors.primary },
                ]}
              />
            ))}

            {/* Linea di scansione animata */}
            {!scanned && (
              <Animated.View style={[
                styles.scanLine,
                scanLineStyle,
                { backgroundColor: theme.colors.primary },
              ]} />
            )}

            {/* Icona successo scan */}
            {scanned && !continuous && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.successOverlay}>
                <Text style={{ fontSize: 48 }}>✅</Text>
              </Animated.View>
            )}
          </View>

          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} />
        </View>

        {/* Zona sotto il mirino */}
        <View style={[styles.overlayBottom, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>

          {/* Hint testuale */}
          <Text style={[styles.hint, { color: '#fff', fontSize: theme.fontSize.md }]}>
            {scanned && !continuous ? '✅ Scansione completata' : hint}
          </Text>

          {/* Controlli */}
          <View style={styles.controls}>

            {/* Torcia */}
            <TouchableOpacity
              style={[styles.controlBtn, { borderColor: torchOn ? theme.colors.primary : 'rgba(255,255,255,0.4)' }]}
              onPress={() => setTorchOn(v => !v)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={torchOn ? 'Spegni torcia' : 'Accendi torcia'}
            >
              <Text style={{ fontSize: 20 }}>{torchOn ? '🔦' : '💡'}</Text>
            </TouchableOpacity>

            {/* Reset (solo in modalità singola dopo la scansione) */}
            {scanned && !continuous && (
              <TouchableOpacity
                style={[styles.controlBtn, { borderColor: 'rgba(255,255,255,0.4)', minWidth: 120 }]}
                onPress={() => setScanned(false)}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Scansiona di nuovo"
              >
                <Text style={{ color: '#fff', fontSize: theme.fontSize.sm,
                                fontWeight: theme.fontWeight.semibold }}>
                  Scansiona di nuovo
                </Text>
              </TouchableOpacity>
            )}

          </View>

          {/* Pulsante annulla */}
          <TouchableOpacity
            style={{ paddingVertical: theme.spacing.md, marginBottom: insets.bottom + 8 }}
            onPress={onCancel}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Annulla scansione"
          >
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: theme.fontSize.sm }}>
              Annulla
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fullScreen:        { flex: 1 },
  permissionContainer:{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  overlay:           { flex: 1 },
  overlayRow:        { flex: 1 },
  overlayBottom:     { flex: 1.2, alignItems: 'center', paddingTop: 24 },
  middleRow:         { flexDirection: 'row', height: FRAME_SIZE },
  frame:             { position: 'relative', overflow: 'hidden' },
  scanLine:          { position: 'absolute', left: 8, right: 8, height: 2, opacity: 0.8 },
  successOverlay:    { ...StyleSheet.absoluteFillObject, justifyContent: 'center',
                       alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  hint:              { textAlign: 'center', marginBottom: 20, paddingHorizontal: 24,
                       textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 },
                       textShadowRadius: 4 },
  controls:          { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 },
  controlBtn:        { borderWidth: 1.5, borderRadius: 24, paddingVertical: 8,
                       paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
                       minWidth: 48, minHeight: 44 },

  // Angoli del mirino
  corner:            { position: 'absolute', width: 22, height: 22, borderWidth: 3 },
  tl:                { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0,
                       borderTopLeftRadius: 4 },
  tr:                { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0,
                       borderTopRightRadius: 4 },
  bl:                { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0,
                       borderBottomLeftRadius: 4 },
  br:                { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0,
                       borderBottomRightRadius: 4 },
})
