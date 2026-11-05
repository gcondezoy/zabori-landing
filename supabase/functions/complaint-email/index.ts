// Edge Function: correos del Libro de Reclamaciones.
//  - { type: 'receipt', code }: copia de la hoja al correo de quien reclama (una sola vez, en la primera hora).
//  - { type: 'response', code }: la respuesta del negocio. Solo la puede pedir un administrador.
// El destinatario siempre sale de la base de datos: el navegador no elige a quién se escribe ni el texto.
//
// Despliegue:  supabase functions deploy complaint-email --no-verify-jwt
// Secretos:    RESEND_API_KEY, MAIL_FROM y SITE_URL (los mismos de welcome-email)
//              COMPLAINTS_BCC=correo@negocio.pe  (opcional: el negocio recibe copia de cada hoja)
//              LEGAL_NAME, LEGAL_RUC, LEGAL_ADDRESS (opcionales: datos del proveedor en la constancia)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const HOUR_MS = 36e5
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const fmtDate = (d) => new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'short' }).format(new Date(d))
const fmtDay = (d) => new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'long' }).format(d)

// 15 días hábiles (lunes a viernes) desde la fecha de la hoja. No descuenta feriados: el plazo real es igual o mayor.
function dueDate(created) {
  const d = new Date(created)
  let n = 0
  while (n < 15) {
    d.setUTCDate(d.getUTCDate() + 1)
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) n++
  }
  return d
}

function sheetRows(c) {
  const rows = [
    ['N.° de hoja', c.code],
    ['Fecha', fmtDate(c.created_at)],
    ['Tipo', c.kind === 'reclamo' ? 'Reclamo' : 'Queja'],
    ['Nombre', c.name],
    ['Documento', `${c.doc_type} ${c.doc_number}`],
    ['Domicilio', c.address],
    ['Celular', c.phone],
    ['Correo', c.email],
    c.guardian && ['Padre, madre o apoderado', c.guardian],
    ['Bien contratado', `${c.item_type === 'producto' ? 'Producto' : 'Servicio'}${c.order_code ? ` · pedido ${c.order_code}` : ''}`],
    c.amount != null && ['Monto reclamado', `S/ ${Number(c.amount).toFixed(2)}`],
    ['Descripción', c.item_descr],
    ['Detalle', c.detail],
    ['Pedido del consumidor', c.request],
  ]
  return rows.filter(Boolean)
}

function layout(site, title, intro, rows, outro) {
  const table = rows.map(([k, v]) => `<tr><td style="padding:6px 0;font-size:13px;color:#4d6a71;vertical-align:top;width:38%">${escapeHtml(k)}</td><td style="padding:6px 0;font-size:14px;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`).join('')
  return `<!doctype html><html lang="es"><body style="margin:0;padding:24px 12px;background:#fffaea;font-family:Arial,Helvetica,sans-serif;color:#04323c">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#034d5b;padding:20px 28px"><img src="${site}/logo-zabori-amarillo.png" alt="Zabori" height="36" style="display:block;height:36px"></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:22px;color:#034d5b">${escapeHtml(title)}</h1>
<p style="margin:0 0 18px;font-size:15px;line-height:1.5">${intro}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${table}</table>
<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#4d6a71">${outro}</p>
</td></tr>
<tr><td style="padding:16px 28px;background:#fffaea;font-size:12px;color:#4d6a71">Zabori · Libro de Reclamaciones</td></tr>
</table></td></tr></table></body></html>`
}

const asText = (title, rows, outro) => [title, ...rows.map(([k, v]) => `${k}: ${v}`), outro].join('\n\n')

function provider() {
  const name = Deno.env.get('LEGAL_NAME')
  const ruc = Deno.env.get('LEGAL_RUC')
  const addr = Deno.env.get('LEGAL_ADDRESS')
  return [name && ['Proveedor', name], ruc && ['RUC', ruc], addr && ['Domicilio del proveedor', addr]].filter(Boolean)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('MAIL_FROM')
  if (!key || !from) return json({ error: 'El correo no está configurado.' }, 500)
  const site = (Deno.env.get('SITE_URL') || 'https://zabori-dk.com').replace(/\/$/, '')
  const bcc = Deno.env.get('COMPLAINTS_BCC')

  let body
  try { body = await req.json() } catch { return json({ error: 'Datos inválidos' }, 400) }
  const code = String(body?.code || '').trim().toUpperCase()
  if (!/^LR-\d{4}-\d{5}$/.test(code)) return json({ error: 'Código inválido' }, 400)

  const db = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  let subject, html, text, to, release = null

  if (body.type === 'receipt') {
    // Reserva atómica: solo la primera llamada envía la copia
    const since = new Date(Date.now() - HOUR_MS).toISOString()
    const { data: c, error } = await db.from('complaints').update({ emailed_at: new Date().toISOString() })
      .eq('code', code).is('emailed_at', null).gte('created_at', since).select('*').maybeSingle()
    if (error) return json({ error: error.message }, 500)
    if (!c) return json({ ok: true, sent: false })
    release = () => db.from('complaints').update({ emailed_at: null }).eq('code', code)
    to = c.email
    const rows = [...provider(), ...sheetRows(c)]
    const due = fmtDay(dueDate(c.created_at))
    const outro = `Te responderemos a este correo en un plazo máximo de 15 días hábiles (hasta el ${due}). La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.`
    subject = `Recibimos tu ${c.kind} · Hoja ${c.code}`
    html = layout(site, `Recibimos tu ${c.kind}`, 'Esta es la copia de la hoja que registraste en nuestro Libro de Reclamaciones. Guárdala como constancia.', rows, escapeHtml(outro))
    text = asText(`Recibimos tu ${c.kind}`, rows, outro)
  } else if (body.type === 'response') {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: auth } = await db.auth.getUser(token)
    const uid = auth?.user?.id
    if (!uid) return json({ error: 'No autorizado' }, 401)
    const { data: admin } = await db.from('admins').select('user_id').eq('user_id', uid).maybeSingle()
    if (!admin) return json({ error: 'No autorizado' }, 403)
    const { data: c, error } = await db.from('complaints').select('*').eq('code', code).maybeSingle()
    if (error) return json({ error: error.message }, 500)
    if (!c || c.status !== 'respondido' || !c.response.trim()) return json({ error: 'La hoja aún no tiene respuesta guardada.' }, 400)
    const rows = [['N.° de hoja', c.code], ['Fecha de la hoja', fmtDate(c.created_at)], ['Tu ' + c.kind, c.detail], ['Nuestra respuesta', c.response]]
    const outro = 'Si no estás conforme con la respuesta, puedes acudir al INDECOPI o a otras vías de solución de controversias.'
    subject = `Respuesta a tu ${c.kind} · Hoja ${c.code}`
    html = layout(site, `Respuesta a tu ${c.kind}`, `Hola, ${escapeHtml(c.name.split(/\s+/)[0])}. Esta es nuestra respuesta a la hoja ${escapeHtml(c.code)}.`, rows, escapeHtml(outro))
    text = asText(`Respuesta a tu ${c.kind}`, rows, outro)
    to = c.email
  } else {
    return json({ error: 'Tipo inválido' }, 400)
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], ...(bcc ? { bcc: [bcc] } : {}), subject, text, html }),
  })
  if (!res.ok) {
    if (release) await release() // se puede reintentar
    return json({ error: 'No se pudo enviar el correo.' }, 502)
  }
  return json({ ok: true, sent: true })
})
