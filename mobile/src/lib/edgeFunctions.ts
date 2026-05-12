// src/lib/edgeFunctions.ts
import { supabase } from './supabase'

export async function callEdgeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (error) throw new Error(error.message)
  return data!
}

export const api = {
  sendEmail: (to: string, subject: string, html: string) =>
    callEdgeFunction('send-email', { to, subject, html }),
  sendOTP: (phone: string, userId: string) =>
    callEdgeFunction('send-otp-custom', { phone, userId }),
}
