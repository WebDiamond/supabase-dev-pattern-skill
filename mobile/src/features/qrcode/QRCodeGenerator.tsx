/**
 * QRCodeGenerator.tsx — Mobile (Expo)
 *
 * Genera un QR code da qualsiasi stringa: URL, testo, payload JSON,
 * deep link, codice 2FA, ID ordine, ecc.
 *
 * Dipendenza:
 *   npx expo install react-native-qrcode-svg react-native-svg
 *
 * Utilizzo:
 *   <QRCodeGenerator value="https://tuodominio.com" />
 *   <QRCodeGenerator value={JSON.stringify({ orderId: '123', userId: 'abc' })} size={280} />
 *   <QRCodeGenerator value={totpUri} label="Scansiona con Authenticator" withDownload />
 */

import { useRef, useState }          from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native'
import QRCode                        from 'react-native-qrcode-svg'
import * as FileSystem               from 'expo-file-system'
import * as MediaLibrary             from 'expo-media-library'
import * as Haptics                  from 'expo-haptics'
import Animated, { FadeIn }          from 'react-native-reanimated'
import { useTheme }                  from '../../hooks/useTheme'

interface QRCodeGeneratorProps {
  /** Contenuto del QR code — URL, testo, JSON stringificato, TOTP URI, ecc. */
  value: string
  /** Dimensione in pixel (default 200) */
  size?: number
  /** Etichetta descrittiva mostrata sotto il QR */
  label?: string
  /** Mostra il pulsante "Salva in galleria" */
  withDownload?: boolean
  /** Mostra il pulsante "Condividi" */
  withShare?: boolean
  /** Colore moduli QR (default: textPrimary del tema) */
  color?: string
  /** Colore sfondo (default: backgroundElevated del tema) */
  backgroundColor?: string
}

export function QRCodeGenerator({
  value,
  size = 200,
  label,
  withDownload = false,
  withShare    = false,
  color,
  backgroundColor,
}: QRCodeGeneratorProps) {
  const theme   = useTheme()
  const svgRef  = useRef<any>(null)
  const [saving, setSaving] = useState(false)

  const qrColor = color            ?? theme.colors.textPrimary
  const qrBg    = backgroundColor  ?? theme.colors.backgroundElevated

  /**
   * Salva il QR code come immagine PNG nella galleria fotografica.
   * Richiede il permesso MEDIA_LIBRARY.
   */
  const handleSave = async () => {
    if (!svgRef.current) return
    setSaving(true)

    try {
      // Richiedi permesso galleria
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permesso negato', 'Abilita l\'accesso alla galleria nelle impostazioni')
        return
      }

      // Converti SVG in PNG base64
      svgRef.current.toDataURL(async (dataURL: string) => {
        const base64 = dataURL.replace('data:image/png;base64,', '')
        const path   = `${FileSystem.cacheDirectory}qrcode_${Date.now()}.png`

        await FileSystem.writeAsStringAsync(path, base64, {
          encoding: FileSystem.EncodingType.Base64,
        })

        await MediaLibrary.saveToLibraryAsync(path)
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert('Salvato', 'QR code salvato nella galleria')
      })
    } catch (err: any) {
      Alert.alert('Errore', err.message)
    } finally {
      setSaving(false)
    }
  }

  /**
   * Condivide il QR code come immagine tramite il foglio di condivisione nativo.
   */
  const handleShare = async () => {
    if (!svgRef.current) return

    svgRef.current.toDataURL(async (dataURL: string) => {
      const base64 = dataURL.replace('data:image/png;base64,', '')
      const path   = `${FileSystem.cacheDirectory}qrcode_share_${Date.now()}.png`

      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      })

      await Share.share({
        url:     path,
        message: label ?? value,
        title:   'QR Code',
      })
    })
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.wrapper}>

      {/* Contenitore QR con padding e ombra */}
      <View style={[
        styles.qrContainer,
        {
          backgroundColor: qrBg,
          borderRadius:    theme.radius.lg,
          padding:         theme.spacing.lg,
          ...theme.shadow.md,
        },
      ]}>
        <QRCode
          value={value || ' '}   // react-native-qrcode-svg crasha su stringa vuota
          size={size}
          color={qrColor}
          backgroundColor={qrBg}
          getRef={svgRef}
          // Logo opzionale al centro (es. logo app)
          // logo={{ uri: 'https://...' }}
          // logoSize={size * 0.2}
          // logoBackgroundColor={qrBg}
        />
      </View>

      {/* Etichetta */}
      {label && (
        <Text style={[
          styles.label,
          {
            color:      theme.colors.textSecondary,
            fontSize:   theme.fontSize.sm,
            marginTop:  theme.spacing.md,
          },
        ]}>
          {label}
        </Text>
      )}

      {/* Azioni */}
      {(withDownload || withShare) && (
        <View style={[styles.actions, { marginTop: theme.spacing.md }]}>
          {withShare && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: theme.colors.primaryLight,
                  borderRadius:    theme.radius.md,
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.lg,
                },
              ]}
              onPress={handleShare}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Condividi QR code"
            >
              <Text style={{ color: theme.colors.primary, fontWeight: theme.fontWeight.semibold,
                              fontSize: theme.fontSize.sm }}>
                Condividi
              </Text>
            </TouchableOpacity>
          )}

          {withDownload && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius:    theme.radius.md,
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.lg,
                  opacity: saving ? 0.6 : 1,
                },
              ]}
              onPress={handleSave}
              disabled={saving}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Salva QR code in galleria"
            >
              <Text style={{ color: theme.colors.textInverse, fontWeight: theme.fontWeight.semibold,
                              fontSize: theme.fontSize.sm }}>
                {saving ? 'Salvataggio...' : 'Salva'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrapper:     { alignItems: 'center' },
  qrContainer: { alignItems: 'center', justifyContent: 'center' },
  label:       { textAlign: 'center', maxWidth: 280 },
  actions:     { flexDirection: 'row', gap: 12 },
  actionBtn:   { alignItems: 'center', justifyContent: 'center' },
})
