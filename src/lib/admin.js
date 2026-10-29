// Datos del panel: pedidos y comprobación de administrador.
// Con Supabase todo pasa por RLS (solo admins). En modo demo se usan los pedidos guardados en este navegador.
import { supabase, supabaseConfigurado } from './supabase'

const LOCAL_KEY = 'zabori-orders'

export const STATUS = {
  pendiente: 'Pendiente', preparando: 'Preparando', en_camino: 'En camino',
  listo: 'Listo para recoger', entregado: 'Entregado', cancelado: 'Cancelado',
}
export const PAYMENT = { pendiente: 'Por cobrar', procesando: 'Procesando', pagado: 'Pagado', fallido: 'Fallido' }

// Siguiente paso del pedido según la modalidad
export function nextStatus(order) {
  const flow = order.mode === 'delivery'
    ? ['pendiente', 'preparando', 'en_camino', 'entregado']
    : ['pendiente', 'preparando', 'listo', 'entregado']
  const i = flow.indexOf(order.status)
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null
}

export const isOpen = (o) => o.status !== 'entregado' && o.status !== 'cancelado'
export const isUnpaid = (o) => o.payment !== 'pagado' && o.status !== 'cancelado'

// Mensaje listo para avisar al cliente por WhatsApp
const MESSAGES = {
  pendiente: 'recibimos tu pedido {code}. Te avisamos cuando empecemos a prepararlo.',
  preparando: 'tu pedido {code} ya se está preparando.',
  en_camino: 'tu pedido {code} va en camino. ¡Ya casi llega!',
  listo: 'tu pedido {code} está listo para recoger.',
  entregado: 'gracias por tu compra en Zabori. ¡Buen provecho!',
  cancelado: 'tu pedido {code} fue cancelado. Escríbenos si tienes alguna duda.',
}
export function whatsappLink(order) {
  const digits = order.phone.replace(/\D/g, '')
  const phone = digits.length === 9 ? '51' + digits : digits
  const first = (order.name || '').split(' ')[0]
  const text = `Hola ${first}, ${(MESSAGES[order.status] || '').replace('{code}', order.code)}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [] } catch { return [] }
}
const writeLocal = (list) => {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)) } catch {}
}

export async function isAdmin() {
  if (!supabaseConfigurado) return true // en demo el acceso lo controla un PIN en la interfaz
  const { data, error } = await supabase.rpc('is_admin')
  return !error && data === true
}

// Pedido normalizado:
// { id, code, userId, name, phone, email, mode, address, notes, subtotal, fee, total,
//   status, payment, paymentRef, createdAt, history: [{ type, value, at }], items: [{ name, qty, price }] }
export async function listOrders() {
  if (supabaseConfigurado) {
    const since = new Date(Date.now() - 120 * 864e5).toISOString() // últimos 120 días
    const { data, error } = await supabase
      .from('orders')
      .select('id, code, user_id, customer_name, phone, email, mode, address, lat, lng, notes, subtotal, delivery_fee, total, status, payment_status, payment_method, payment_ref, history, created_at, order_items(name, detail, qty, price)')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000)
    if (error) throw new Error(error.message)
    return data.map((o) => ({
      id: o.id, code: o.code, userId: o.user_id, name: o.customer_name, phone: o.phone, email: o.email,
      mode: o.mode, address: o.address, lat: o.lat != null ? Number(o.lat) : null, lng: o.lng != null ? Number(o.lng) : null, notes: o.notes, subtotal: Number(o.subtotal),
      fee: Number(o.delivery_fee), total: Number(o.total), status: o.status, payment: o.payment_status, method: o.payment_method || 'tarjeta',
      paymentRef: o.payment_ref, createdAt: o.created_at, history: o.history || [],
      items: o.order_items.map((i) => ({ name: i.name, detail: i.detail || '', qty: i.qty, price: Number(i.price) })),
    }))
  }
  return readLocal().map((o) => ({
    id: o.code, code: o.code, userId: o.userId, name: o.name, phone: o.phone, email: o.email,
    mode: o.mode, address: o.address, lat: o.lat ?? null, lng: o.lng ?? null, notes: o.notes, subtotal: o.subtotal, fee: o.fee, total: o.total,
    status: o.status, payment: o.payment || 'pendiente', method: o.paymentMethod || 'tarjeta', paymentRef: o.paymentRef || null,
    createdAt: o.createdAt, history: o.history || [], items: o.items,
  }))
}

// fields: { status } o { payment }
export async function updateOrder(order, fields) {
  if (supabaseConfigurado) {
    const patch = {}
    if (fields.status) patch.status = fields.status
    if (fields.payment) { patch.payment_status = fields.payment; patch.payment_ref = 'manual' }
    const { error } = await supabase.from('orders').update(patch).eq('id', order.id)
    if (error) throw new Error(error.message)
    return
  }
  const at = new Date().toISOString()
  writeLocal(readLocal().map((o) => {
    if (o.code !== order.code) return o
    const history = [...(o.history || [])]
    const next = { ...o }
    if (fields.status) { next.status = fields.status; history.push({ type: 'status', value: fields.status, at }) }
    if (fields.payment) { next.payment = fields.payment; next.paymentRef = 'manual'; history.push({ type: 'payment', value: fields.payment, at }) }
    return { ...next, history }
  }))
}
