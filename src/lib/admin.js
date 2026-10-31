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
export const RECENT_DAYS = 35 // cubre los reportes de 30 días sin descargar todo el historial
const PAGE_SIZE = 1000 // Supabase devuelve como máximo 1000 filas por consulta

// Trae todas las páginas. Termina con una página vacía (no con una corta) por si el proyecto tiene un máximo menor.
export async function allPages(fetchPage) {
  const rows = []
  for (;;) {
    const page = await fetchPage(rows.length, rows.length + PAGE_SIZE - 1)
    if (!page.length) return rows
    rows.push(...page)
  }
}

// Por defecto trae los últimos RECENT_DAYS días; `all` trae todo el historial y `changedSince` solo lo que
// cambió desde esa hora, para que actualizar el panel cada pocos segundos casi no gaste tráfico.
export async function listOrders({ changedSince, all } = {}) {
  if (supabaseConfigurado) {
    const since = new Date(Date.now() - RECENT_DAYS * 864e5).toISOString()
    const fetchPage = async (from, to) => {
      let query = supabase
        .from('orders')
        .select('id, code, user_id, customer_name, phone, email, mode, address, lat, lng, notes, subtotal, delivery_fee, total, status, payment_status, payment_method, payment_ref, history, created_at, updated_at, order_items(name, detail, qty, price)')
      if (changedSince) query = query.gt('updated_at', changedSince)
      else if (!all) query = query.gte('created_at', since)
      const { data, error } = await query.order('created_at', { ascending: false }).order('id').range(from, to)
      if (error) throw new Error(error.message)
      return data
    }
    // Si entra un pedido mientras se pagina, uno puede repetirse entre páginas: mergeOrders lo deja una vez
    return mergeOrders([], (await allPages(fetchPage)).map((o) => ({
      id: o.id, code: o.code, userId: o.user_id, name: o.customer_name, phone: o.phone, email: o.email,
      mode: o.mode, address: o.address, lat: o.lat != null ? Number(o.lat) : null, lng: o.lng != null ? Number(o.lng) : null, notes: o.notes, subtotal: Number(o.subtotal),
      fee: Number(o.delivery_fee), total: Number(o.total), status: o.status, payment: o.payment_status, method: o.payment_method || 'tarjeta',
      paymentRef: o.payment_ref, createdAt: o.created_at, updatedAt: o.updated_at, history: o.history || [],
      items: o.order_items.map((i) => ({ name: i.name, detail: i.detail || '', qty: i.qty, price: Number(i.price) })),
    })))
  }
  return readLocal().map((o) => ({
    id: o.code, code: o.code, userId: o.userId, name: o.name, phone: o.phone, email: o.email,
    mode: o.mode, address: o.address, lat: o.lat ?? null, lng: o.lng ?? null, notes: o.notes, subtotal: o.subtotal, fee: o.fee, total: o.total,
    status: o.status, payment: o.payment || 'pendiente', method: o.paymentMethod || 'tarjeta', paymentRef: o.paymentRef || null,
    createdAt: o.createdAt, history: o.history || [], items: o.items,
  }))
}

// Desde qué hora pedir cambios: el último visto menos un margen, porque un pedido puede guardarse
// con una hora algo anterior a la de otro que ya se leyó. null = hay que cargar todo.
const OVERLAP_MS = 60000
export function changesSince(list) {
  if (!supabaseConfigurado || !list?.length) return null
  const last = list.reduce((max, o) => Math.max(max, new Date(o.updatedAt).getTime() || 0), 0)
  return last ? new Date(last - OVERLAP_MS).toISOString() : null
}

// Une los pedidos cambiados con la lista; si llega una respuesta atrasada no pisa datos más nuevos
export function mergeOrders(list, changed) {
  const byId = new Map(list.map((o) => [o.id, o]))
  changed.forEach((o) => {
    const old = byId.get(o.id)
    if (!old || new Date(o.updatedAt) >= new Date(old.updatedAt)) byId.set(o.id, o)
  })
  return [...byId.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
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
