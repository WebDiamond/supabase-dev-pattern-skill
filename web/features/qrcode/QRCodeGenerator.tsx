/**
 * QRCodeGenerator.tsx — Web (React)
 *
 * Genera QR code in SVG o Canvas con opzioni di download e copia.
 *
 * Dipendenza:
 *   npm install qrcode react
 *   npm install -D @types/qrcode
 *
 * Utilizzo base:
 *   <QRCodeGenerator value="https://tuodominio.com" />
 *
 * Con download e copia:
 *   <QRCodeGenerator
 *     value={totpUri}
 *     label="Scansiona con Google Authenticator"
 *     size={256}
 *     withDownload
 *     withCopy
 *   />
 *
 * Come immagine PNG inline:
 *   <QRCodeGenerator value={orderUrl} format="png" size={300} />
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import QRCode from 'qrcode'

type QRFormat  = 'svg' | 'png'
type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

interface QRCodeGeneratorProps {
  /** Contenuto del QR code */
  value: string
  /** Dimensione in pixel (default 200) */
  size?: number
  /** Formato di rendering (default 'svg') */
  format?: QRFormat
  /** Livello correzione errori — H permette logo sovrapposto (default 'M') */
  errorCorrectionLevel?: ErrorCorrectionLevel
  /** Colore moduli (default '#000000') */
  darkColor?: string
  /** Colore sfondo (default '#ffffff') */
  lightColor?: string
  /** Etichetta testuale sotto il QR */
  label?: string
  /** Mostra bottone download come PNG */
  withDownload?: boolean
  /** Mostra bottone copia URL/testo negli appunti */
  withCopy?: boolean
  /** Classe CSS aggiuntiva per il wrapper */
  className?: string
}

export function QRCodeGenerator({
  value,
  size                 = 200,
  format               = 'svg',
  errorCorrectionLevel = 'M',
  darkColor            = '#000000',
  lightColor           = '#ffffff',
  label,
  withDownload         = false,
  withCopy             = false,
  className            = '',
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [svgString, setSvgString]   = useState<string>('')
  const [copied,    setCopied]      = useState(false)
  const [error,     setError]       = useState<string>()

  const options: QRCode.QRCodeToStringOptions | QRCode.QRCodeToDataURLOptions = {
    width:           size,
    errorCorrectionLevel,
    color:           { dark: darkColor, light: lightColor },
    margin:          2,
  }

  // Genera SVG (per rendering inline nitido a qualsiasi zoom)
  useEffect(() => {
    if (!value || format !== 'svg') return

    QRCode.toString(value, { ...options, type: 'svg' })
      .then(setSvgString)
      .catch((err) => setError(err.message))
  }, [value, size, darkColor, lightColor, errorCorrectionLevel, format])

  // Genera su Canvas (per PNG / download)
  useEffect(() => {
    if (!value || format !== 'png' || !canvasRef.current) return

    QRCode.toCanvas(canvasRef.current, value, {
      ...(options as QRCode.QRCodeToCanvasOptions),
      width: size,
    }).catch((err) => setError(err.message))
  }, [value, size, darkColor, lightColor, errorCorrectionLevel, format])

  // ── Azioni ─────────────────────────────────────────────────────────────────

  /** Scarica il QR come PNG */
  const handleDownload = useCallback(async () => {
    let dataUrl: string

    if (format === 'svg' && svgString) {
      // Converte SVG → PNG tramite Canvas
      const blob   = new Blob([svgString], { type: 'image/svg+xml' })
      const url    = URL.createObjectURL(blob)
      const img    = new Image()
      img.src      = url

      await new Promise<void>((res) => { img.onload = () => res() })

      const canvas    = document.createElement('canvas')
      canvas.width    = size
      canvas.height   = size
      const ctx       = canvas.getContext('2d')!
      ctx.fillStyle   = lightColor
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      dataUrl = canvas.toDataURL('image/png')
      URL.revokeObjectURL(url)
    } else if (canvasRef.current) {
      dataUrl = canvasRef.current.toDataURL('image/png')
    } else {
      return
    }

    const a    = document.createElement('a')
    a.href     = dataUrl
    a.download = `qrcode_${Date.now()}.png`
    a.click()
  }, [format, svgString, lightColor, size])

  /** Copia il contenuto del QR negli appunti */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback per browser senza Clipboard API
      const ta       = document.createElement('textarea')
      ta.value       = value
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [value])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div role="alert" style={{ color: 'red', fontSize: 14 }}>
        Errore generazione QR: {error}
      </div>
    )
  }

  if (!value) {
    return (
      <div
        style={{
          width: size, height: size,
          backgroundColor: '#f5f5f5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, border: '2px dashed #ddd',
        }}
        aria-label="Nessun contenuto per il QR code"
      >
        <span style={{ color: '#aaa', fontSize: 13 }}>Nessun valore</span>
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
    >
      {/* QR code */}
      <div
        style={{
          padding: 16,
          backgroundColor: lightColor,
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
          lineHeight: 0,          // rimuove spazio sotto SVG/canvas
        }}
        role="img"
        aria-label={label ?? `QR code per: ${value.slice(0, 60)}`}
      >
        {format === 'svg' && svgString ? (
          <div
            style={{ width: size, height: size }}
            dangerouslySetInnerHTML={{ __html: svgString }}
          />
        ) : (
          <canvas ref={canvasRef} width={size} height={size} />
        )}
      </div>

      {/* Etichetta */}
      {label && (
        <p style={{ margin: 0, fontSize: 13, color: '#555', textAlign: 'center', maxWidth: size }}>
          {label}
        </p>
      )}

      {/* Azioni */}
      {(withDownload || withCopy) && (
        <div style={{ display: 'flex', gap: 8 }}>
          {withCopy && (
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copia contenuto QR code negli appunti"
              style={{
                padding:       '7px 16px',
                borderRadius:  8,
                border:        '1.5px solid currentColor',
                background:    'transparent',
                cursor:        'pointer',
                fontSize:      13,
                color:         copied ? '#22c55e' : '#6351f5',
                fontWeight:    600,
                transition:    'color 0.2s',
              }}
            >
              {copied ? '✓ Copiato' : 'Copia testo'}
            </button>
          )}

          {withDownload && (
            <button
              type="button"
              onClick={handleDownload}
              aria-label="Scarica QR code come immagine PNG"
              style={{
                padding:       '7px 16px',
                borderRadius:  8,
                border:        'none',
                background:    '#6351f5',
                cursor:        'pointer',
                fontSize:      13,
                color:         '#fff',
                fontWeight:    600,
              }}
            >
              Scarica PNG
            </button>
          )}
        </div>
      )}
    </div>
  )
}
