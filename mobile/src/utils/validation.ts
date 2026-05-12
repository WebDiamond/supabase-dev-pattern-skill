// src/utils/validation.ts
import { z } from 'zod'
import * as SecureStore from 'expo-secure-store'
import { supabase }     from '../lib/supabase'

export const phoneSchema    = z.string()
  .regex(/^\+?[\d\s\-().]{7,20}$/, 'Numero non valido')
  .transform(v => v.replace(/[^\d+]/g, ''))

export const otpSchema      = z.string().length(6).regex(/^\d+$/, 'Solo cifre')
export const emailSchema    = z.string().email('Email non valida').toLowerCase().trim()
export const passwordSchema = z.string()
  .min(8, 'Almeno 8 caratteri')
  .regex(/[A-Z]/, 'Almeno una maiuscola')
  .regex(/[0-9]/, 'Almeno un numero')

/** Logout sicuro — cancella sessione e tutti i dati sensibili */
export async function secureLogout() {
  await supabase.auth.signOut()
  await SecureStore.deleteItemAsync('supabase.auth.token').catch(() => {})
}
