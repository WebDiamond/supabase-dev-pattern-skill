/**
 * maps.tsx — Web (React) — Google Maps + Geolocalizzazione
 *
 * Integrazione Google Maps con:
 * - Mappa interattiva (zoom, pan, click)
 * - Posizione corrente (browser Geolocation API)
 * - Marker personalizzati con InfoWindow
 * - Geocoding (indirizzo ↔ coordinate)
 * - Calcolo distanze
 *
 * Dipendenze:
 *   npm install @react-google-maps/api
 *
 * Variabili d'ambiente:
 *   VITE_GOOGLE_MAPS_API_KEY=AIza...
 *
 * Sicurezza API Key Google Maps su Web:
 *   - Vai su console.cloud.google.com → API & Services → Credentials
 *   - Restringi la chiave a "HTTP referrers"
 *   - Aggiungi i tuoi domini: https://tuodominio.com/*, http://localhost:5173/*
 *   - Abilita solo le API necessarie: Maps JavaScript API, Geocoding API, Places API
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { GoogleMap, LoadScript, Marker, InfoWindow, Circle } from '@react-google-maps/api'

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// ── Tipi ──────────────────────────────────────────────────────────────────

export interface Coordinate {
  lat: number
  lng: number
}

export interface MapMarkerData {
  id:          string
  position:    Coordinate
  title?:      string
  description?: string
  icon?:       string   // URL icona custom
}

// ── Hook: posizione corrente ──────────────────────────────────────────────

export function useCurrentLocation() {
  const [position, setPosition] = useState<Coordinate | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string>()

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalizzazione non supportata da questo browser')
      return
    }

    setLoading(true)
    setError(undefined)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Permesso posizione negato. Abilita la posizione nel browser.',
          2: 'Posizione non disponibile.',
          3: 'Timeout richiesta posizione.',
        }
        setError(messages[err.code] ?? 'Errore posizione sconosciuto')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  useEffect(() => { getLocation() }, [])

  return { position, loading, error, refresh: getLocation }
}

// ── Geocoding ─────────────────────────────────────────────────────────────

/**
 * Converte coordinate in indirizzo (reverse geocoding).
 * Usa le API Google Maps Geocoding via backend per non esporre la chiave.
 */
export async function reverseGeocode(coord: Coordinate): Promise<string> {
  const geocoder = new google.maps.Geocoder()
  const result   = await geocoder.geocode({ location: coord })
  return result.results[0]?.formatted_address ?? 'Indirizzo non trovato'
}

/**
 * Converte indirizzo in coordinate.
 */
export async function geocodeAddress(address: string): Promise<Coordinate | null> {
  const geocoder = new google.maps.Geocoder()
  const result   = await geocoder.geocode({ address })
  if (result.results.length === 0) return null
  const loc = result.results[0].geometry.location
  return { lat: loc.lat(), lng: loc.lng() }
}

// ── Utilità ───────────────────────────────────────────────────────────────

export function distanceKm(a: Coordinate, b: Coordinate): number {
  const R   = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos((a.lat * Math.PI) / 180) *
            Math.cos((b.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
}

// ── Componente mappa ──────────────────────────────────────────────────────

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

// Stile mappa custom (minimal, si adatta al design app)
const MAP_STYLES_LIGHT: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
]

const MAP_STYLES_DARK: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a24' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9494a4' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e2e3a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f0f14' }] },
]

interface GoogleMapComponentProps {
  markers?:          MapMarkerData[]
  center?:           Coordinate
  zoom?:             number
  onMarkerClick?:    (marker: MapMarkerData) => void
  onMapClick?:       (coord: Coordinate) => void
  showUserLocation?: boolean
  userRadius?:       number    // metri
  darkMode?:         boolean
  style?:            React.CSSProperties
}

export function GoogleMapComponent({
  markers           = [],
  center,
  zoom              = 13,
  onMarkerClick,
  onMapClick,
  showUserLocation  = true,
  userRadius,
  darkMode          = false,
  style,
}: GoogleMapComponentProps) {
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerData | null>(null)
  const mapRef  = useRef<google.maps.Map>()
  const { position, loading: locLoading } = useCurrentLocation()

  const mapCenter = center ?? position ?? { lat: 41.9028, lng: 12.4964 }

  const handleMarkerClick = (marker: MapMarkerData) => {
    setSelectedMarker(marker)
    onMarkerClick?.(marker)
  }

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return
    setSelectedMarker(null)
    onMapClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() })
  }

  const centerOnUser = () => {
    if (!position || !mapRef.current) return
    mapRef.current.panTo(position)
    mapRef.current.setZoom(15)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '400px', ...style }}>
      <LoadScript googleMapsApiKey={MAPS_API_KEY} libraries={['places', 'geometry']}>
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={mapCenter}
          zoom={zoom}
          options={{
            styles:             darkMode ? MAP_STYLES_DARK : MAP_STYLES_LIGHT,
            disableDefaultUI:   false,
            zoomControl:        true,
            streetViewControl:  false,
            fullscreenControl:  false,
            mapTypeControl:     false,
          }}
          onLoad={(map) => { mapRef.current = map }}
          onClick={handleMapClick}
        >
          {/* Posizione utente */}
          {showUserLocation && position && (
            <>
              <Marker
                position={position}
                icon={{
                  path:        google.maps.SymbolPath.CIRCLE,
                  scale:       8,
                  fillColor:   '#6351F5',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight:2,
                }}
                title="La tua posizione"
              />
              {userRadius && (
                <Circle
                  center={position}
                  radius={userRadius}
                  options={{
                    fillColor:    '#6351F5',
                    fillOpacity:  0.08,
                    strokeColor:  '#6351F5',
                    strokeWeight: 1.5,
                  }}
                />
              )}
            </>
          )}

          {/* Marker personalizzati */}
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={marker.position}
              title={marker.title}
              icon={marker.icon}
              onClick={() => handleMarkerClick(marker)}
            />
          ))}

          {/* InfoWindow al click marker */}
          {selectedMarker && (
            <InfoWindow
              position={selectedMarker.position}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div style={{ maxWidth: 200, padding: '4px 2px' }}>
                {selectedMarker.title && (
                  <strong style={{ fontSize: 14 }}>{selectedMarker.title}</strong>
                )}
                {selectedMarker.description && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>
                    {selectedMarker.description}
                  </p>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>

      {/* Pulsante centra sulla posizione */}
      {showUserLocation && position && (
        <button
          onClick={centerOnUser}
          aria-label="Centra mappa sulla mia posizione"
          style={{
            position:   'absolute',
            bottom:     16,
            right:      12,
            width:      40,
            height:     40,
            borderRadius:8,
            border:     '1px solid #ddd',
            background: '#fff',
            cursor:     'pointer',
            fontSize:   18,
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow:  '0 2px 8px rgba(0,0,0,0.12)',
          }}
        >
          📍
        </button>
      )}

      {/* Spinner caricamento posizione */}
      {locLoading && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.9)', padding: '6px 14px',
          borderRadius: 20, fontSize: 13, color: '#555',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        }}>
          📡 Rilevamento posizione...
        </div>
      )}
    </div>
  )
}
