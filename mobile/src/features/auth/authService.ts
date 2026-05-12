// src/features/auth/authService.ts
import { supabase }    from '../../lib/supabase'
import * as WebBrowser from 'expo-web-browser'
import * as Linking    from 'expo-linking'

WebBrowser.maybeCompleteAuthSession()

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password,
    })
    if (error) throw new Error(error.message)
    return data
  },
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(), password,
      options: { data: { username } },
    })
    if (error) throw new Error(error.message)
    return data
  },
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  },
}

export async function signInWithOAuth(provider: 'google' | 'apple') {
  const redirectTo = Linking.createURL('auth/callback')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider, options: { redirectTo, skipBrowserRedirect: true },
  })
  if (error) throw new Error(error.message)

  const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo)
  if (result.type !== 'success') throw new Error('Autenticazione annullata')

  const code = new URL(result.url).searchParams.get('code')
  if (!code) throw new Error('Codice OAuth mancante')

  const { data: session, error: se } = await supabase.auth.exchangeCodeForSession(code)
  if (se) throw new Error(se.message)
  return session
}

export const smsService = {
  async sendOTP(phone: string) {
    const { error } = await supabase.auth.signInWithOtp({
      phone: phone.replace(/[^\d+]/g, ''),
    })
    if (error) throw new Error(error.message)
  },
  async verifyOTP(phone: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone.replace(/[^\d+]/g, ''), token, type: 'sms',
    })
    if (error) throw new Error('Codice non valido o scaduto')
    return data
  },
}

export const mfaService = {
  async enroll() {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Dispositivo ${new Date().toLocaleDateString('it-IT')}`,
    })
    if (error) throw new Error(error.message)
    return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
  },
  async verify(factorId: string, code: string) {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) throw new Error('Codice non valido')
    return data
  },
  async unenroll(factorId: string) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) throw new Error(error.message)
  },
}
