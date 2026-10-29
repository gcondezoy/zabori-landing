import { supabase, supabaseConfigurado } from './supabase'
import { site } from '../config/site'

const LOCAL_KEY = 'zabori-orders'

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [] } catch { return [] }
}
const writeLocal = (list) => {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)) } catch {}
}

// Crea el pedido y devuelve { code, total }. Con Supabase el total lo calcula el servidor.
// form = { name, phone, email, mode, address, notes }; lines = [{ item, n }]
export async function createOrder(form, lines, userId) {
  const subtotal = lines.reduce((s, l) => s + l.item.price * l.n, 0)
  const fee = form.mode === 'delivery' && subtotal < site.freeDeliveryFrom ? site.deliveryFee : 0

  if (supabaseConfigurado) {
    const { data, error } = await supabase.rpc('create_order', {
      p: {
        ...form,
        items: lines.map((l) => (l.item.isCustom
          ? { id: 'arma', qty: l.n, options: l.item.options } // el servidor recalcula el precio
          : l.item.taper
            ? { id: l.item.baseId, qty: l.n, taper: l.item.taper }
            : { id: l.item.id, qty: l.n })),
      },
    })
    if (error) throw new Error(error.message)
    return { code: data, total: subtotal + fee }
  }

  const code = 'ZAB-' + Math.random().toString(36).slice(2, 7).toUpperCase()
  const order = {
    code, userId: userId || null, ...form, subtotal, fee, total: subtotal + fee,
    status: 'pendiente', payment: 'pendiente', paymentMethod: form.payment_method || 'tarjeta', createdAt: new Date().toISOString(),
    history: [{ type: 'status', value: 'pendiente', at: new Date().toISOString() }],
    items: lines.map((l) => ({
      itemId: l.item.isCustom ? 'arma' : l.item.baseId || l.item.id, // para "Volver a pedir"
      name: l.item.name, detail: l.item.detail || '', price: l.item.price, qty: l.n,
    })),
  }
  writeLocal([order, ...readLocal()])
  return { code, total: order.total }
}

// Pedidos del cliente registrado, ya normalizados (para "Mi cuenta")
// { code, mode, total, status, payment, method, phone, createdAt, history, items: [{ itemId, name, detail, qty }] }
export async function listMyOrders(userId) {
  if (supabaseConfigurado) {
    const { data, error } = await supabase
      .from('orders')
      .select('code, mode, total, status, payment_status, payment_method, phone, history, created_at, order_items(item_id, name, detail, qty)')
      .eq('user_id', userId) // un admin puede leer todos los pedidos; aquí solo los suyos
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return data.map((o) => ({
      code: o.code, mode: o.mode, total: Number(o.total), status: o.status, payment: o.payment_status,
      method: o.payment_method, phone: o.phone, createdAt: o.created_at, history: o.history || [],
      items: o.order_items.map((i) => ({ itemId: i.item_id, name: i.name, detail: i.detail || '', qty: i.qty })),
    }))
  }
  return readLocal().filter((o) => o.userId === userId).map((o) => ({
    code: o.code, mode: o.mode, total: o.total, status: o.status, payment: o.payment || 'pendiente',
    method: o.paymentMethod || 'tarjeta', phone: o.phone, createdAt: o.createdAt, history: o.history || [],
    items: o.items.map((i) => ({ itemId: i.itemId || null, name: i.name, detail: i.detail || '', qty: i.qty })),
  }))
}
