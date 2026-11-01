// Horarios de entrega y stock del día. El servidor es quien decide al crear el pedido (create_order);
// esto solo le muestra al cliente qué puede pedir. Sin Supabase se calcula en este navegador (modo demo).
import { supabase, supabaseConfigurado } from './supabase'
import { loadMenu } from './menu'
import { todayLima } from './promos'

const SLOTS_KEY = 'zabori-slots-v1'
const ORDERS_KEY = 'zabori-orders'
const OPEN_DAYS = [1, 2, 3, 4, 5, 6]
const SLOT_IDS = ['12:00-12:30', '12:30-13:00', '13:00-13:30', '13:30-14:00', '14:00-14:30', '14:30-15:00']

const hhmm = (t) => {
  const [h, m] = t.split(':').map(Number)
  return `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')}`
}
// '12:30-13:00' -> '12:30 – 1:00 p. m.'
export function slotLabel(id) {
  if (!id) return ''
  const [from, to] = id.split('-')
  return `${hhmm(from)} – ${hhmm(to)} ${Number(to.split(':')[0]) >= 12 ? 'p. m.' : 'a. m.'}`
}

const parse = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
const localSlots = () => {
  const saved = parse(SLOTS_KEY, {})
  return SLOT_IDS.map((id) => ({ id, end: saved[id]?.end ?? id.slice(6), capacity: saved[id]?.capacity ?? 20, days: saved[id]?.days ?? OPEN_DAYS }))
}

const nowLima = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }).format(new Date())
const dayLima = () => new Date(`${todayLima()}T12:00:00Z`).getUTCDay()

async function localAvailability() {
  const today = todayLima()
  const orders = parse(ORDERS_KEY, []).filter((o) => o.deliveryDate === today && o.status !== 'cancelado')
  const taken = {}
  const sold = {}
  orders.forEach((o) => {
    taken[o.deliverySlot] = (taken[o.deliverySlot] || 0) + 1
    o.items.forEach((i) => {
      if (i.itemId) sold[i.itemId] = (sold[i.itemId] || 0) + i.qty
      if (i.entradaId) sold[i.entradaId] = (sold[i.entradaId] || 0) + i.qty
    })
  })
  const stock = {}
  ;(await loadMenu({ includeInactive: true })).forEach((m) => {
    if (m.dailyStock != null) stock[m.id] = Math.max(m.dailyStock - (sold[m.id] || 0), 0)
  })
  const time = nowLima()
  const slots = localSlots().map((s) => {
    const n = taken[s.id] || 0
    const status = !s.days.includes(dayLima()) ? 'closed' : s.end <= time ? 'past' : n >= s.capacity ? 'full' : 'open'
    return { id: s.id, status }
  })
  return { slots, stock, admin: { taken, sold } }
}

// { slots: [{ id, status: 'open' | 'full' | 'past' | 'closed' }], stock: { idDelPlato: unidadesQueQuedan }, admin? }
export async function loadAvailability() {
  if (supabaseConfigurado) {
    const { data, error } = await supabase.rpc('availability')
    if (error) throw new Error('No pudimos consultar los horarios.')
    return data
  }
  return localAvailability()
}

// Cupo de cada rango, para el panel
export async function loadSlotCapacities() {
  if (supabaseConfigurado) {
    const { data, error } = await supabase.from('delivery_slots').select('id, capacity').order('start_at')
    if (error) throw new Error('No se pudieron cargar los horarios. Revisa que el SQL de la etapa 11 esté ejecutado.')
    return data
  }
  return localSlots().map(({ id, capacity }) => ({ id, capacity }))
}

export async function saveSlotCapacity(id, capacity) {
  const n = Math.max(0, Math.round(Number(capacity) || 0))
  if (supabaseConfigurado) {
    const { error } = await supabase.from('delivery_slots').update({ capacity: n }).eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  const saved = parse(SLOTS_KEY, {})
  localStorage.setItem(SLOTS_KEY, JSON.stringify({ ...saved, [id]: { ...saved[id], capacity: n } }))
}

// Modo demo: las mismas reglas que create_order en el servidor
export async function assertAvailable(slotId, lines) {
  const { slots, stock } = await localAvailability()
  const slot = slots.find((s) => s.id === slotId)
  if (!slot) throw new Error('Elige tu horario de entrega')
  if (slot.status === 'full') throw new Error('Ese horario ya se llenó. Elige otro.')
  if (slot.status !== 'open') throw new Error('Ese horario ya no está disponible. Elige otro.')
  const need = {}
  const names = {}
  lines.forEach(({ item, n }) => {
    if (item.isCustom) return
    const id = item.baseId || item.id
    need[id] = (need[id] || 0) + n
    names[id] = item.name
    if (item.entrada) {
      need[item.entrada] = (need[item.entrada] || 0) + n
      names[item.entrada] = (item.detail || '').match(/Entrada: ([^·]+)/)?.[1]?.trim() || 'la entrada'
    }
  })
  Object.entries(need).forEach(([id, n]) => {
    const left = stock[id]
    if (left === undefined) return
    if (left <= 0) throw new Error(`Se agotó por hoy: ${names[id]}`)
    if (n > left) throw new Error(`Solo quedan ${left} de ${names[id]}`)
  })
}
