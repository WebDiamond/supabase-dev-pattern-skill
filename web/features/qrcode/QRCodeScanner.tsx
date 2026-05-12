/**
 * QRCodeScanner.tsx — Web (React)
 *
 * Scansiona QR code e barcode direttamente dalla fotocamera del browser
 * usando la WebRTC MediaDevices API + BarcodeDetector (nativo) o ZXing
 * come fallback per browser senza supporto nativo.
 *
 * Dipendenze:
 *   npm install @zxing/library
 *   (BarcodeDetector è nativo in Chrome/Edge; ZXing è il fallback per Firefox/Safari)
 *
 * Utilizzo:
 *   <QRCodeScanner onScan={(data) => console.log(data)} />
 *
 * Con scan continuo (inventario, magazzino):
 *   <QRCodeScanner
 *     continuous
 *     onScan={(data) => addToList(data)}
 *     onClose={() => setOpen(false)}
 *   />
 *
 * Solo QR code (nessun barcode 1D):
 *   <QRCodeScanner
 *     formats={['qr_code']}
 *     onScan={(data) => handleQR(data)}
 *   />
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserQRCodeReader, IScannerControls } from '@zxing/library'

// Formato barcode supportato dall'API nativa BarcodeDetector
type BarcodeFormat =
  | 'qr_code' | 'aztec' | 'code_128' | 'code_39' | 'code_93'
  | 'codabar' | 'data_matrix' | 'ean_13' | 'ean_8'
  | 'itf' | 'pdf417' | 'upc_a' | 'upc_e'

interface QRCodeScannerProps {
  /** Callback con il testo decodificato */
  onScan:        (data: string) => void
  /** Callback alla chiusura/annullamento */
  onClose?:      () => void
  /** Se true continua a scansionare (default: false — si ferma al primo scan) */
  continuous?:   boolean
  /** Formati accettati (default: tutti supportati) */
  formats?:      BarcodeFormat[]
  /** Classe CSS aggiuntiva per il wrapper */
  className?:    string
  /** Testo guida (default: 'Inquadra il QR code') */
  hint?:         string
}

/** Verifica se BarcodeDetector nativo è disponibile nel browser */
const hasNativeDetector = () =>
  typeof window !== 'undefined' && 'BarcodeDetector' in window

export function QRCodeScanner({
  onScan,
  onClose,
  continuous = false,
  formats    = ['qr_code'],
  className  = '',
  hint       = 'Inquadra il QR code',
}: QRCodeScannerProps) {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const zxingRef      = useRef<IScannerControls | null>(null)
  const nativeLoop    = useRef<number | null>(null)
  const scannedRef    = useRef(false)

  const [status,    setStatus]    = useState<'init' | 'ready' | 'scanning' | 'error'>('init')
  const [error,     setError]     = useState<string>()
  const [scanned,   setScanned]   = useState(false)
  const [devices,   setDevices]   = useState<MediaDeviceInfo[]>([])
  const [activeDevice, setActiveDevice] = useState<string>()

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    if (nativeLoop.current) {
      cancelAnimationFrame(nativeLoop.current)
      nativeLoop.current = null
    }
    if (zxingRef.current) {
      zxingRef.current.stop()
      zxingRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => () => stopAll(), [stopAll])

  // ── Recupera lista telecamere disponibili ──────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(devs => {
        const cams = devs.filter(d => d.kind === 'videoinput')
        setDevices(cams)
        // Preferisci la fotocamera posteriore su mobile
        const back = cams.find(d =>
          /back|rear|environment/i.test(d.label)
        )
        setActiveDevice(back?.deviceId ?? cams[0]?.deviceId)
      })
      .catch(() => {})
  }, [])

  // ── Avvia stream fotocamera ────────────────────────────────────────────────
  useEffect(() => {
    if (!activeDevice && devices.length === 0) return

    const constraints: MediaStreamConstraints = {
      video: {
        deviceId:    activeDevice ? { exact: activeDevice } : undefined,
        facingMode:  activeDevice ? undefined : 'environment',
        width:       { ideal: 1280 },
        height:      { ideal: 720 },
      },
    }

    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setStatus('ready')
        setError(undefined)
        startDetection()
      })
      .catch(err => {
        if (err.name === 'NotAllowedError') {
          setError('Accesso alla fotocamera negato. Abilita il permesso nel browser.')
        } else if (err.name === 'NotFoundError') {
          setError('Nessuna fotocamera trovata su questo dispositivo.')
        } else {
          setError(`Errore fotocamera: ${err.message}`)
        }
        setStatus('error')
      })

    return () => stopAll()
  }, [activeDevice])

  // ── Rilevamento QR ─────────────────────────────────────────────────────────

  const handleResult = useCallback((data: string) => {
    if (!continuous && scannedRef.current) return
    scannedRef.current = true
    setScanned(true)
    onScan(data)
    if (!continuous) stopAll()
  }, [continuous, onScan, stopAll])

  const startDetection = useCallback(() => {
    setStatus('scanning')

    if (hasNativeDetector()) {
      // ── BarcodeDetector nativo (Chrome 83+, Edge 83+) ──────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats })

      const detect = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          nativeLoop.current = requestAnimationFrame(detect)
          return
        }
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            handleResult(barcodes[0].rawValue)
            if (continuous) {
              // Pausa breve tra scan consecutivi
              setTimeout(() => {
                scannedRef.current = false
                nativeLoop.current = requestAnimationFrame(detect)
              }, 800)
            }
            return
          }
        } catch { /* frame non ancora disponibile */ }

        nativeLoop.current = requestAnimationFrame(detect)
      }

      nativeLoop.current = requestAnimationFrame(detect)

    } else {
      // ── Fallback ZXing (Firefox, Safari) ───────────────────────────────────
      const reader = new BrowserQRCodeReader()

      reader.decodeFromVideoElement(videoRef.current!, (result, err, controls) => {
        zxingRef.current = controls
        if (result) {
          handleResult(result.getText())
          if (!continuous) controls.stop()
        }
      }).catch(err => {
        setError(`Errore scanner: ${err.message}`)
        setStatus('error')
      })
    }
  }, [formats, continuous, handleResult])

  const handleRescan = () => {
    scannedRef.current = false
    setScanned(false)
    startDetection()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className={className}
      style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           16,
        width:         '100%',
        maxWidth:      480,
        margin:        '0 auto',
      }}
    >
      {/* Video stream */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1',
                    borderRadius: 16, overflow: 'hidden', background: '#000' }}>
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover',
                   transform: 'scaleX(-1)' /* specchio fotocamera frontale */ }}
          aria-label="Stream fotocamera per scansione QR"
        />

        {/* Mirino SVG sovrapposto */}
        {status === 'scanning' && !scanned && (
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                     pointerEvents: 'none' }}
            viewBox="0 0 100 100"
          >
            {/* Ombra sui bordi */}
            <path
              fillRule="evenodd"
              fill="rgba(0,0,0,0.45)"
              d="M0 0h100v100H0z M20 20h60v60H20z"
            />
            {/* Angoli del mirino */}
            {[
              'M20 30 L20 20 L30 20',
              'M70 20 L80 20 L80 30',
              'M20 70 L20 80 L30 80',
              'M70 80 L80 80 L80 70',
            ].map((d, i) => (
              <path key={i} d={d} stroke="#6351f5" strokeWidth="2.5"
                    fill="none" strokeLinecap="round" />
            ))}
            {/* Linea di scansione animata */}
            <line x1="20" y1="50" x2="80" y2="50" stroke="#6351f5"
                  strokeWidth="1.5" opacity="0.7">
              <animateTransform attributeName="transform" type="translate"
                                values="0 -28;0 28;0 -28" dur="2.4s" repeatCount="indefinite" />
            </line>
          </svg>
        )}

        {/* Overlay successo */}
        {scanned && !continuous && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 16,
          }}>
            <span style={{ fontSize: 56 }}>✅</span>
          </div>
        )}

        {/* Overlay errore */}
        {status === 'error' && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24,
            borderRadius: 16,
          }}>
            <span style={{ fontSize: 36 }}>📷</span>
            <p style={{ color: '#fff', textAlign: 'center', margin: 0, fontSize: 14 }}>
              {error}
            </p>
          </div>
        )}
      </div>

      {/* Hint testuale */}
      {status === 'scanning' && (
        <p style={{ margin: 0, fontSize: 14, color: '#555', textAlign: 'center' }}>
          {scanned && !continuous ? '✅ Scansione completata' : hint}
        </p>
      )}

      {/* Selettore fotocamera (se ci sono più camere) */}
      {devices.length > 1 && (
        <select
          value={activeDevice}
          onChange={(e) => { stopAll(); setActiveDevice(e.target.value) }}
          aria-label="Seleziona fotocamera"
          style={{
            padding: '6px 12px', borderRadius: 8, border: '1.5px solid #ddd',
            fontSize: 13, cursor: 'pointer', background: '#fff',
          }}
        >
          {devices.map(d => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Fotocamera ${d.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      )}

      {/* Azioni */}
      <div style={{ display: 'flex', gap: 10 }}>
        {scanned && !continuous && (
          <button
            type="button"
            onClick={handleRescan}
            aria-label="Scansiona un altro QR code"
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: '#6351f5', color: '#fff', cursor: 'pointer',
              fontWeight: 600, fontSize: 14,
            }}
          >
            Scansiona di nuovo
          </button>
        )}

        {onClose && (
          <button
            type="button"
            onClick={() => { stopAll(); onClose() }}
            aria-label="Chiudi scanner"
            style={{
              padding: '8px 20px', borderRadius: 8,
              border: '1.5px solid #ddd', background: 'transparent',
              cursor: 'pointer', fontSize: 14, color: '#555',
            }}
          >
            Chiudi
          </button>
        )}
      </div>
    </div>
  )
}
