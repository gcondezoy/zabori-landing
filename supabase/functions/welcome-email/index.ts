// Edge Function: envía una sola vez el correo de bienvenida a quien acaba de registrarse.
// Solo le escribe al usuario de la sesión: el navegador no elige el destinatario ni el texto.
//
// Despliegue:  supabase functions deploy welcome-email --no-verify-jwt
// Secretos:    supabase secrets set RESEND_API_KEY=re_xxx MAIL_FROM="Zabori <hola@tu-dominio.pe>" SITE_URL=https://tu-dominio.pe
// (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya los inyecta Supabase.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const WEEK_MS = 7 * 864e5

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function message(name, marketing, site) {
  const first = String(name || '').trim().split(/\s+/)[0]
  const hello = first ? `¡Hola, ${first}!` : '¡Hola!'
  const promos = marketing
    ? 'Como lo pediste, te avisaremos de promociones y novedades. Puedes dejar de recibirlas cuando quieras desde Mi cuenta.'
    : ''
  const text = [
    hello,
    'Gracias por registrarte en Zabori. Tus datos ya quedan guardados para pedir más rápido, y en Mi cuenta puedes ver tus pedidos.',
    promos,
    `Ver el menú: ${site}/#menu`,
    'Zabori · El sabor de elegir bien',
  ].filter(Boolean).join('\n\n')
  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:24px 12px;background:#fffaea;font-family:Arial,Helvetica,sans-serif;color:#04323c">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#034d5b;padding:20px 28px"><img src="${site}/logo-zabori-amarillo.png" alt="Zabori" height="36" style="display:block;height:36px"></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:24px;color:#034d5b">${escapeHtml(hello)}</h1>
<p style="margin:0 0 14px;font-size:16px;line-height:1.5">Gracias por registrarte en Zabori. Tus datos ya quedan guardados para pedir más rápido, y en Mi cuenta puedes ver tus pedidos.</p>
${promos ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.5;color:#4d6a71">${promos}</p>` : ''}
<p style="margin:22px 0 0"><a href="${site}/#menu" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#fdc52a;color:#034d5b;font-weight:bold;text-decoration:none">Ver el menú</a></p>
</td></tr>
<tr><td style="padding:16px 28px;background:#fffaea;font-size:12px;color:#4d6a71">Zabori · El sabor de elegir bien</td></tr>
</table></td></tr></table></body></html>`
  return { text, html }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('MAIL_FROM')
  if (!key || !from) return json({ error: 'El correo no está configurado.' }, 500)
  const site = (Deno.env.get('SITE_URL') || 'https://zabori-landing.vercel.app').replace(/\/$/, '')

  const db = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: auth, error: authErr } = await db.auth.getUser(token)
  const user = auth?.user
  if (authErr || !user?.email) return json({ error: 'No autorizado' }, 401)

  // Reserva atómica: si llegan dos llamadas a la vez, solo una envía el correo
  const { data: claimed, error: claimErr } = await db
    .from('profiles')
    .update({ welcomed_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('welcomed_at', null)
    .select('name, accepts_marketing')
    .maybeSingle()
  if (claimErr) return json({ error: claimErr.message }, 500)
  if (!claimed) return json({ ok: true, sent: false })

  // Cuentas creadas antes de activar el correo: se marcan sin escribirles un "gracias por registrarte" tardío
  if (Date.now() - new Date(user.created_at).getTime() > WEEK_MS) return json({ ok: true, sent: false })

  const { text, html } = message(claimed.name, claimed.accepts_marketing, site)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [user.email], subject: 'Gracias por registrarte en Zabori', text, html }),
  })
  if (!res.ok) {
    // Se libera la reserva para reintentar en la próxima visita
    await db.from('profiles').update({ welcomed_at: null }).eq('id', user.id)
    return json({ error: 'No se pudo enviar el correo.' }, 502)
  }
  return json({ ok: true, sent: true })
})
