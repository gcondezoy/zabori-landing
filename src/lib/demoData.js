// Pedidos de ejemplo para mostrar el panel en modo demo (solo se guardan en este navegador).
import { site } from '../config/site'

const KEY = 'zabori-orders'

const PEOPLE = [
  ['María Quispe', '987111222'], ['Jorge Ramos', '986333444'], ['Lucía Torres', '985555666'],
  ['Carlos Huamán', '984777888'], ['Ana Gutiérrez', '987654321'], ['Rosa Mendoza', '983999000'],
  ['Pedro Salazar', '982121314'], ['Valeria Castro', '981515161'],
]
const STREETS = ['Av. Universitaria', 'Jr. Las Begonias', 'Av. Carlos Izaguirre', 'Calle Los Pinos', 'Av. Naranjal']
const NOTES = ['Sin ají, por favor', 'Tocar el timbre 2 veces', 'Cubiertos descartables', 'Dejar en portería']

export function seedDemoOrders(menu, days = 14) {
  const mains = menu.filter((i) => i.cat === 'menu' && i.active !== false)
  const extras = menu.filter((i) => i.cat !== 'menu' && i.active !== false)
  if (!mains.length) return 0

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
  const code = () => 'ZAB-' + Math.random().toString(36).slice(2, 7).toUpperCase()
  const plus = (d, min) => new Date(d.getTime() + min * 60000).toISOString()
  const orders = []

  for (let d = 0; d < days; d++) {
    const n = d === 0 ? 7 : 2 + Math.floor(Math.random() * 6)
    for (let k = 0; k < n; k++) {
      const t = new Date()
      t.setDate(t.getDate() - d)
      t.setHours(11 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0)
      if (t > new Date()) t.setTime(Date.now() - (k + 1) * 9 * 60000) // hoy: solo horas ya pasadas

      const [name, phone] = pick(PEOPLE)
      const main = pick(mains)
      const items = [{ name: main.name, price: main.price, qty: 1 + (Math.random() > 0.7 ? 1 : 0) }]
      if (extras.length && Math.random() > 0.45) { const x = pick(extras); items.push({ name: x.name, price: x.price, qty: 1 }) }
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
      const mode = Math.random() > 0.35 ? 'delivery' : 'recojo'
      const fee = mode === 'delivery' && subtotal < site.freeDeliveryFrom ? site.deliveryFee : 0
      const flow = mode === 'delivery' ? ['preparando', 'en_camino', 'entregado'] : ['preparando', 'listo', 'entregado']

      // Hoy hay pedidos en distintas etapas; los días anteriores casi todos entregados
      let status
      if (d === 0) status = ['pendiente', 'preparando', flow[1], 'pendiente', 'preparando', 'entregado', flow[1]][k % 7]
      else status = Math.random() < 0.12 ? 'cancelado' : 'entregado'
      const payment = status === 'cancelado' ? 'pendiente' : d === 0 && k % 3 === 0 ? 'pendiente' : 'pagado'

      const history = [{ type: 'status', value: 'pendiente', at: t.toISOString() }]
      if (payment === 'pagado') history.push({ type: 'payment', value: 'pagado', at: plus(t, 1) })
      if (status === 'cancelado') history.push({ type: 'status', value: 'cancelado', at: plus(t, 6) })
      else for (let i = 0; i <= flow.indexOf(status); i++) history.push({ type: 'status', value: flow[i], at: plus(t, (i + 1) * 12) })

      orders.push({
        code: code(), userId: name === 'Ana Gutiérrez' ? 'demo' : null, name, phone,
        email: name === 'Ana Gutiérrez' ? 'ana@ejemplo.com' : '', mode,
        address: mode === 'delivery' ? `${pick(STREETS)} ${100 + Math.floor(Math.random() * 900)}, Los Olivos` : '',
        notes: Math.random() > 0.8 ? pick(NOTES) : '',
        subtotal, fee, total: subtotal + fee, status, payment,
        paymentRef: payment === 'pagado' ? (Math.random() > 0.5 ? 'chr_test_demo' : 'manual') : null,
        createdAt: t.toISOString(), history, items,
      })
    }
  }
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  try { localStorage.setItem(KEY, JSON.stringify(orders)) } catch {}
  return orders.length
}

export function clearDemoOrders() {
  try { localStorage.removeItem(KEY) } catch {}
}
