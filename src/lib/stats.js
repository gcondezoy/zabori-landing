// Cálculos del panel a partir de la lista de pedidos normalizada (ver lib/admin.js).

export const RANGES = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'todo', label: 'Todo' },
]

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}` }

export function inRange(order, range) {
  if (range === 'todo') return true
  const days = range === 'hoy' ? 0 : range === '7d' ? 6 : 29
  const from = startOfDay()
  from.setDate(from.getDate() - days)
  return new Date(order.createdAt) >= from
}

// Ventas = pedidos no cancelados. Cobrado = pagados.
export function summarize(orders) {
  const valid = orders.filter((o) => o.status !== 'cancelado')
  const sales = valid.reduce((s, o) => s + o.total, 0)
  const paid = valid.filter((o) => o.payment === 'pagado').reduce((s, o) => s + o.total, 0)
  return {
    count: valid.length,
    sales,
    paid,
    pending: sales - paid,
    avg: valid.length ? sales / valid.length : 0,
    delivery: valid.filter((o) => o.mode === 'delivery').length,
    recojo: valid.filter((o) => o.mode === 'recojo').length,
    cancelled: orders.length - valid.length,
    dishes: valid.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0),
  }
}

// Ventas por día (rango de N días) o por hora (si el rango es "hoy")
export function salesSeries(orders, range) {
  const valid = orders.filter((o) => o.status !== 'cancelado')
  if (range === 'hoy') {
    const hours = Array.from({ length: 24 }, (_, h) => ({ key: h, label: `${h}h`, full: `${h}:00 a ${h}:59`, total: 0, count: 0 }))
    valid.forEach((o) => { const h = new Date(o.createdAt).getHours(); hours[h].total += o.total; hours[h].count++ })
    // Solo el tramo con actividad (por defecto el horario de almuerzo)
    const active = hours.filter((h) => h.count > 0).map((h) => h.key)
    const from = Math.min(10, ...active)
    const to = Math.max(16, ...active)
    return hours.slice(from, to + 1)
  }
  const n = range === '7d' ? 7 : range === '30d' ? 30 : Math.max(7, Math.min(60, daysSpan(valid)))
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = startOfDay(); d.setDate(d.getDate() - i)
    out.push({
      key: dayKey(d),
      label: d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }).replace('.', ''),
      full: d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }),
      total: 0, count: 0,
    })
  }
  const byKey = Object.fromEntries(out.map((x) => [x.key, x]))
  valid.forEach((o) => { const b = byKey[dayKey(o.createdAt)]; if (b) { b.total += o.total; b.count++ } })
  return out
}

function daysSpan(orders) {
  if (!orders.length) return 7
  const oldest = Math.min(...orders.map((o) => new Date(o.createdAt).getTime()))
  return Math.ceil((Date.now() - oldest) / 864e5) + 1
}

// Platos más vendidos (por unidades)
export function topItems(orders, limit = 8) {
  const map = {}
  orders.filter((o) => o.status !== 'cancelado').forEach((o) => o.items.forEach((i) => {
    const m = (map[i.name] ||= { name: i.name, qty: 0, revenue: 0 })
    m.qty += i.qty
    m.revenue += (i.price || 0) * i.qty
  }))
  return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, limit)
}

// Unidades vendidas por nombre de plato (para la pestaña Carta)
export function unitsByName(orders) {
  const map = {}
  orders.filter((o) => o.status !== 'cancelado').forEach((o) => o.items.forEach((i) => { map[i.name] = (map[i.name] || 0) + i.qty }))
  return map
}

// Clientes agrupados por celular
export function customers(orders) {
  const map = {}
  orders.forEach((o) => {
    const key = o.phone.replace(/\D/g, '').replace(/^51(?=\d{9}$)/, '')
    const c = (map[key] ||= { key, name: o.name, phone: o.phone, email: '', registered: false, orders: [], spent: 0, last: o.createdAt })
    c.orders.push(o)
    if (o.status !== 'cancelado') c.spent += o.total
    if (o.email && !c.email) c.email = o.email
    if (o.userId) c.registered = true
    if (new Date(o.createdAt) > new Date(c.last)) { c.last = o.createdAt; c.name = o.name }
  })
  return Object.values(map).map((c) => ({
    ...c,
    count: c.orders.filter((o) => o.status !== 'cancelado').length,
    favorite: topItems(c.orders, 1)[0]?.name || '—',
  })).sort((a, b) => new Date(b.last) - new Date(a.last))
}

// CSV para abrir en Excel (separador ; y BOM para tildes)
export function ordersCSV(orders, STATUS, PAYMENT) {
  const head = ['Código', 'Fecha', 'Hora', 'Cliente', 'Celular', 'Correo', 'Modalidad', 'Dirección', 'Platos', 'Subtotal', 'Delivery', 'Total', 'Pago', 'Estado', 'Notas']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = orders.map((o) => {
    const d = new Date(o.createdAt)
    return [
      o.code, d.toLocaleDateString('es-PE'), d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      o.name, o.phone, o.email, o.mode === 'delivery' ? 'Delivery' : 'Recojo', o.address,
      o.items.map((i) => `${i.qty}x ${i.name}`).join(', '),
      o.subtotal?.toFixed(2), o.fee?.toFixed(2), o.total.toFixed(2),
      `${PAYMENT[o.payment] || o.payment} (${o.method || 'tarjeta'})`, STATUS[o.status] || o.status, o.notes,
    ].map(esc).join(';')
  })
  return '﻿' + [head.map(esc).join(';'), ...rows].join('\r\n')
}

export function download(name, text, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const timeAgo = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000))
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  return h < 24 ? `hace ${h} h` : new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
