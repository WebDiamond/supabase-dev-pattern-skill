// src/lib/supabase.ts
import { createClient }  from '@supabase/supabase-js'
import * as SecureStore  from 'expo-secure-store'
import { AppState }      from 'react-native'
import type { Database } from '../types/database'

// SecureStore: keychain iOS / EncryptedSharedPreferences Android
// Molto più sicuro di AsyncStorage (che salva in chiaro)
// Chiavi: max 255 caratteri
const SecureStoreAdapter = {
  getItem:    (key: string) => SecureStore.getItemAsync(key.slice(0, 255)),
  setItem:    (key: string, value: string) => SecureStore.setItemAsync(key.slice(0, 255), value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key.slice(0, 255)),
}

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage:            SecureStoreAdapter,
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: false,  // gestito manualmente con Linking su mobile
    },
  }
)

// Auto-refresh quando l'app torna in foreground
AppState.addEventListener('change', (state) => {
  state === 'active'
    ? supabase.auth.startAutoRefresh()
    : supabase.auth.stopAutoRefresh()
})
