/**
 * maps.tsx — Mobile (Expo) — Geolocalizzazione + Google Maps
 *
 * Componenti e hook per:
 * - Mappa interattiva Google Maps / Apple Maps
 * - Posizione corrente dell'utente
 * - Geocoding (coordinate → indirizzo e viceversa)
 * - Marker personalizzati e cluster
 * - Calcolo distanze e direzioni
 *
 * Dipendenze:
 *   npx expo install react-native-maps expo-location
 *
 * Configurazione app.json:
 *   {
 *     "expo": {
 *       "ios": { "config": { "googleMapsApiKey": "AIza..." } },
 *       "android": { "config": { "googleMaps": { "apiKey": "AIza..." } } },
 *       "plugins": [
 *         ["expo-location", {
 *           "locationAlwaysAndWhenInUsePermission": "Per mostrarti i risultati vicino a te"
 *         }]
 *       ]
 *     }
 *   }
 *
 * Note sicurezza API Key:
 *   - Usa chiavi diverse per iOS, Android e Web
 *   - Restringi ogni chiave alle API necessarie nella Google Cloud Console
 *   - Aggiungi restriction per bundle identifier (iOS) e package name (Android)
 *   - Non committare le chiavi — usare app.config.js con process.env
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { StyleSheet, View, Text, TouchableOpacity,
         ActivityIndicator, Alert, Platform }       from 'react-native'
import MapView, { Marker, Callout, Circle,
                  PROVIDER_GOOGLE, Region }          from 'react-native-maps'
import * as Location                                 from 'expo-location'
import * as Haptics                                  from 'expo-haptics'
import { useTheme }                                  from '../../hooks/useTheme'

// ── Tipi ──────────────────────────────────────────────────────────────────

export interface Coordinate {
  latitude:  number
  longitude: number
}

export interface MapMarker extends Coordinate {
  id:          string
  title?:      string
  description?: string
  color?:      string
  data?:       Record<string, unknown>
}

// ── Hook: posizione corrente ──────────────────────────────────────────────

/**
 * useCurrentLocation — ottieni e segui la posizione GPS dell'utente.
 *
 *   const { location, loading, error, refresh } = useCurrentLocation()
 */
export function useCurrentLocation(options?: {
  watchPosition?: boolean
  accuracy?:      Location.LocationAccuracy
}) {
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string>()
  const watchSub                = useRef<Location.LocationSubscription>()

  const requestAndGet = useCallback(async () => {
    setLoading(true)
    setError(undefined)

    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      setError('Permesso posizione negato')
      setLoading(false)
      return
    }

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: options?.accuracy ?? Location.Accuracy.Balanced,
      })
      setLocation(loc)

      // Aggiornamenti continui (es. navigazione)
      if (options?.watchPosition) {
        watchSub.current = await Location.watchPositionAsync(
          { accuracy: options.accuracy ?? Location.Accuracy.Balanced, distanceInterval: 10 },
          setLocation
        )
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [options?.watchPosition, options?.accuracy])

  useEffect(() => {
    requestAndGet()
    return () => { watchSub.current?.remove() }
  }, [])

  return {
    location,
    loading,
    error,
    refresh:    requestAndGet,
    coordinate: location
      ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
      : null,
  }
}

// ── Geocoding ─────────────────────────────────────────────────────────────

/**
 * Converte coordinate in indirizzo leggibile.
 */
export async function reverseGeocode(coord: Coordinate): Promise<string> {
  try {
    const [result] = await Location.reverseGeocodeAsync(coord)
    if (!result) return 'Indirizzo non trovato'

    const parts = [
      result.street,
      result.streetNumber,
      result.city,
      result.region,
      result.country,
    ].filter(Boolean)

    return parts.join(', ')
  } catch {
    return 'Errore geocoding'
  }
}

/**
 * Converte un indirizzo in coordinate.
 */
export async function geocodeAddress(address: string): Promise<Coordinate | null> {
  try {
    const results = await Location.geocodeAsync(address)
    if (results.length === 0) return null
    return { latitude: results[0].latitude, longitude: results[0].longitude }
  } catch {
    return null
  }
}

// ── Utilità distanza ──────────────────────────────────────────────────────

/**
 * Calcola la distanza in km tra due punti (formula Haversine).
 */
export function distanceKm(a: Coordinate, b: Coordinate): number {
  const R   = 6371
  const dLat = ((b.latitude  - a.latitude)  * Math.PI) / 180
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos((a.latitude  * Math.PI) / 180) *
            Math.cos((b.latitude  * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
}

// ── Componente mappa ──────────────────────────────────────────────────────

interface InteractiveMapProps {
  markers?:          MapMarker[]
  initialRegion?:    Region
  showUserLocation?: boolean
  onMarkerPress?:    (marker: MapMarker) => void
  onMapPress?:       (coord: Coordinate) => void
  /** Raggio cerchio intorno alla posizione utente (metri) */
  userRadius?:       number
  style?:            object
}

export function InteractiveMap({
  markers           = [],
  initialRegion,
  showUserLocation  = true,
  onMarkerPress,
  onMapPress,
  userRadius,
  style,
}: InteractiveMapProps) {
  const theme    = useTheme()
  const mapRef   = useRef<MapView>(null)
  const { coordinate, loading, error } = useCurrentLocation()

  const defaultRegion: Region = initialRegion ?? {
    latitude:       coordinate?.latitude  ?? 41.9028,  // Roma di default
    longitude:      coordinate?.longitude ?? 12.4964,
    latitudeDelta:  0.05,
    longitudeDelta: 0.05,
  }

  // Centra mappa sulla posizione utente
  const centerOnUser = useCallback(async () => {
    if (!coordinate || !mapRef.current) return
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    mapRef.current.animateToRegion({
      ...coordinate,
      latitudeDelta:  0.01,
      longitudeDelta: 0.01,
    }, 500)
  }, [coordinate])

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surfaceSecondary }, style]}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={{ color: theme.colors.textSecondary, marginTop: 8, fontSize: theme.fontSize.sm }}>
          Caricamento mappa...
        </Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surfaceSecondary }, style]}>
        <Text style={{ color: theme.colors.error, textAlign: 'center', fontSize: theme.fontSize.sm }}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={() => Alert.alert('Posizione', 'Abilita la posizione nelle impostazioni')}
          accessible accessibilityRole="button"
        >
          <Text style={{ color: theme.colors.primary, marginTop: 8, fontSize: theme.fontSize.sm }}>
            Impostazioni
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={defaultRegion}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}   // usiamo il nostro pulsante custom
        showsCompass
        showsScale
        onPress={(e) => onMapPress?.(e.nativeEvent.coordinate)}
        accessible
        accessibilityLabel="Mappa interattiva"
      >
        {/* Cerchio raggio utente */}
        {coordinate && userRadius && (
          <Circle
            center={coordinate}
            radius={userRadius}
            fillColor={theme.colors.primary + '22'}
            strokeColor={theme.colors.primary}
            strokeWidth={1.5}
          />
        )}

        {/* Marker personalizzati */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            pinColor={marker.color ?? theme.colors.primary}
            onPress={() => onMarkerPress?.(marker)}
            accessible
            accessibilityLabel={marker.title ?? `Marker ${marker.id}`}
          >
            {/* Callout personalizzato */}
            {(marker.title || marker.description) && (
              <Callout tooltip>
                <View style={[
                  styles.callout,
                  { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
                    borderColor: theme.colors.border, borderWidth: 1,
                    padding: theme.spacing.md, ...theme.shadow.md },
                ]}>
                  {marker.title && (
                    <Text style={{ color: theme.colors.textPrimary, fontWeight: theme.fontWeight.semibold,
                                    fontSize: theme.fontSize.sm, marginBottom: 2 }}>
                      {marker.title}
                    </Text>
                  )}
                  {marker.description && (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.xs }}>
                      {marker.description}
                    </Text>
                  )}
                </View>
              </Callout>
            )}
          </Marker>
        ))}
      </MapView>

      {/* Pulsante "Centra su di me" */}
      {showUserLocation && coordinate && (
        <TouchableOpacity
          style={[
            styles.centerBtn,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border,
              borderWidth: 1, borderRadius: theme.radius.md, ...theme.shadow.md },
          ]}
          onPress={centerOnUser}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Centra mappa sulla mia posizione"
        >
          <Text style={{ fontSize: 18 }}>📍</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, overflow: 'hidden' },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  callout:    { maxWidth: 200 },
  centerBtn:  { position: 'absolute', bottom: 24, right: 16,
                width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
})
