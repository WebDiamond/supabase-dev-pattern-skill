// src/features/auth/authService.ts
import { supabase } from '../../lib/supabase'

export const authService = {
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(), password,
      options: { data: { username },
                 emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw new Error(error.message)
    return data
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password,
    })
    if (error) throw new Error(error.message)
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw new Error(error.message)
  },
}

// OAuth
export async function signInWithOAuth(provider: 'google' | 'github' | 'apple') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw new Error(error.message)
  return data
}

// Magic Link
export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw new Error(error.message)
}

// OTP SMS
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

// 2FA TOTP
export const mfaService = {
  async enroll() {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType:   'totp',
      friendlyName: `Browser ${new Date().toLocaleDateString('it-IT')}`,
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
