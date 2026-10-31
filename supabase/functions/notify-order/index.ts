// Edge Function: avisa al celular del cliente cuando cambia su pedido.
// Solo la puede llamar un administrador; el texto sale del estado guardado, no del navegador.
//
// Despliegue:  supabase functions deploy notify-order --no-verify-jwt
// Secretos:    supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:correo@negocio.pe
// (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya los inyecta Supabase.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendWebPush } from './webpush.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const STATUS_TITLES = {
  preparando: 'Estamos preparando tu pedido',
  en_camino: 'Tu pedido va en camino',
  listo: 'Tu pedido está listo para recoger',
  entregado: 'Pedido entregado. ¡Buen provecho!',
  cancelado: 'Tu pedido fue cancelado',
}
const FINAL = ['entregado', 'cancelado']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const vapid = {
    publicKey: Deno.env.get('VAPID_PUBLIC_KEY'),
    privateKey: Deno.env.get('VAPID_PRIVATE_KEY'),
    subject: Deno.env.get('VAPID_SUBJECT'),
  }
  if (!vapid.publicKey || !vapid.privateKey || !vapid.subject) return json({ error: 'Los avisos no están configurados.' }, 500)

  const db = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await db.auth.getUser(token)
  if (!auth?.user) return json({ error: 'No autorizado' }, 401)
  const { data: admin } = await db.from('admins').select('user_id').eq('user_id', auth.user.id).maybeSingle()
  if (!admin) return json({ error: 'No autorizado' }, 403)

  let input
  try { input = await req.json() } catch { return json({ error: 'Solicitud inválida.' }, 400) }
  const { data: order } = await db.from('orders').select('id, code, status, payment_status')
    .eq('code', String(input.code || '').trim().toUpperCase()).maybeSingle()
  if (!order) return json({ error: 'Pedido no encontrado.' }, 404)

  const title = input.event === 'payment'
    ? (order.payment_status === 'pagado' ? 'Confirmamos tu pago' : null)
    : STATUS_TITLES[order.status]
  if (!title) return json({ sent: 0, total: 0 })

  const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('order_id', order.id)
  const list = subs || []
  const text = JSON.stringify({ title, body: `Pedido ${order.code}`, code: order.code, url: `/#/seguir?codigo=${order.code}` })

  const results = await Promise.all(list.map(async (s) => {
    try {
      const status = await sendWebPush(s, text, vapid)
      if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', s.id)
      return status >= 200 && status < 300
    } catch {
      return false
    }
  }))

  // Con el pedido terminado ya no hay nada que avisar: no se conservan estos datos
  if (input.event !== 'payment' && FINAL.includes(order.status)) {
    await db.from('push_subscriptions').delete().eq('order_id', order.id)
  }
  return json({ sent: results.filter(Boolean).length, total: list.length })
})
