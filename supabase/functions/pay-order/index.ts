// Edge Function: cobra un pedido con Culqi.
// El navegador solo manda { code, token, email }. El MONTO sale siempre de la tabla orders,
// y la llave secreta de Culqi vive solo aquí (CULQI_SECRET_KEY), nunca en el frontend.
//
// Despliegue:  supabase functions deploy pay-order
// Secreto:     supabase secrets set CULQI_SECRET_KEY=sk_test_xxx
// (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya los inyecta Supabase.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const secret = Deno.env.get('CULQI_SECRET_KEY')
  if (!secret) return json({ error: 'El pago no está configurado.' }, 500)

  let input: { code?: string; token?: string; email?: string }
  try {
    input = await req.json()
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }
  const code = String(input.code || '').trim()
  const token = String(input.token || '').trim()
  const email = String(input.email || '').trim()
  if (!code || !token || !/^\S+@\S+\.\S+$/.test(email)) {
    return json({ error: 'Faltan datos para procesar el pago.' }, 400)
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Reserva atómica: solo UN intento puede pasar de pendiente/fallido a procesando (evita doble cobro).
  const { data: order, error: claimErr } = await db
    .from('orders')
    .update({ payment_status: 'procesando' })
    .eq('code', code)
    .in('payment_status', ['pendiente', 'fallido'])
    .neq('status', 'cancelado')
    .select('id, code, total')
    .maybeSingle()

  if (claimErr) return json({ error: 'No pudimos procesar el pago.' }, 500)
  if (!order) return json({ error: 'Este pedido ya fue pagado, está en proceso o no existe.' }, 409)

  const amount = Math.round(Number(order.total) * 100) // Culqi trabaja en céntimos

  let charge: any
  try {
    const res = await fetch('https://api.culqi.com/v2/charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        amount,
        currency_code: 'PEN',
        email,
        source_id: token,
        description: `Zabori ${order.code}`,
        metadata: { order_code: order.code },
      }),
    })
    charge = await res.json()
    if (!res.ok || charge.object === 'error') {
      await db.from('orders').update({ payment_status: 'fallido' }).eq('id', order.id)
      return json({ error: charge.user_message || charge.merchant_message || 'El pago fue rechazado.' }, 402)
    }
  } catch {
    await db.from('orders').update({ payment_status: 'fallido' }).eq('id', order.id)
    return json({ error: 'No pudimos contactar a la pasarela de pago. Inténtalo de nuevo.' }, 502)
  }

  await db.from('orders').update({ payment_status: 'pagado', payment_ref: charge.id }).eq('id', order.id)
  return json({ ok: true, code: order.code, total: Number(order.total) })
})
