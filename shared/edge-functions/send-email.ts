// supabase/functions/send-email/index.ts
// Deploy: supabase functions deploy send-email
// Secrets: supabase secrets set RESEND_API_KEY=re_xxx

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req: Request) => {
  const { to, subject, html } = await req.json()

  if (!to || !subject || !html) {
    return new Response(
      JSON.stringify({ error: 'to, subject e html sono obbligatori' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    },
    body: JSON.stringify({
      from:    'no-reply@tuodominio.com',
      to,
      subject,
      html,
    }),
  })

  const data = await res.json()

  return new Response(JSON.stringify(data), {
    status:  res.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  })
})
