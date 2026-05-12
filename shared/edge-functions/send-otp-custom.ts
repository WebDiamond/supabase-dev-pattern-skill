// supabase/functions/send-otp-custom/index.ts
// Per provider SMS non supportati nativamente da Supabase (es. Infobip, AWS SNS)
// Deploy: supabase functions deploy send-otp-custom
// Secrets: supabase secrets set SMS_PROVIDER_KEY=xxx SUPABASE_SERVICE_ROLE_KEY=xxx

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  const { phone, userId } = await req.json()

  if (!phone || !userId) {
    return new Response(
      JSON.stringify({ error: 'phone e userId sono obbligatori' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Genera OTP a 6 cifre
  const otp       = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  // In produzione: salva l'hash bcrypt dell'OTP, non il plain text
  await supabase.from('otp_codes').upsert({
    user_id:    userId,
    phone,
    code:       otp,
    expires_at: expiresAt.toISOString(),
    used:       false,
  })

  // Invia tramite provider custom
  const smsRes = await fetch('https://api.provider.com/sms/send', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SMS_PROVIDER_KEY')}`,
    },
    body: JSON.stringify({
      to:   phone,
      text: `Il tuo codice di verifica è: ${otp}. Valido 10 minuti.`,
    }),
  })

  if (!smsRes.ok) {
    return new Response(
      JSON.stringify({ error: 'Invio SMS fallito' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ sent: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
