// "Sigue tu pedido": con Supabase usa la función track_order (código + últimos 4 dígitos del celular);
// en modo demo busca en los pedidos guardados en este navegador.
import { supabase, supabaseConfigurado } from './supabase'

const digits = (s) => (s || '').replace(/\D/g, '')

export async function trackOrder(code, phone) {
  const c = (code || '').trim().toUpperCase()
  const last4 = digits(phone).slice(-4)
  if (!c || last4.length < 4) return null

  if (supabaseConfigurado) {
    const { data, error } = await supabase.rpc('track_order', { p_code: c, p_phone: last4 })
    if (error) throw new Error('No pudimos consultar tu pedido. Inténtalo de nuevo.')
    return data ? { ...data, total: Number(data.total) } : null
  }

  let list = []
  try { list = JSON.parse(localStorage.getItem('zabori-orders')) || [] } catch {}
  const o = list.find((x) => x.code === c && digits(x.phone).slice(-4) === last4)
  if (!o) return null
  return {
    code: o.code, status: o.status, payment: o.payment || 'pendiente', method: o.paymentMethod || 'tarjeta',
    mode: o.mode, total: o.total, createdAt: o.createdAt, history: o.history || [],
    items: o.items.map((i) => ({ name: i.name, detail: i.detail || '', qty: i.qty })),
  }
}
