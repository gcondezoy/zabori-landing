// Carta: con Supabase se lee/edita la tabla menu_items; sin Supabase se usa el menú de ejemplo
// y los cambios del panel quedan en este navegador (modo demo).
import { supabase, supabaseConfigurado } from './supabase'
import { items as seed } from '../data/menu'

const KEY = 'zabori-menu-v2' // v2: Bebidas pasó a Shots
const TONES = ['#034d5b', '#0b6b7a', '#a87400', '#1f6f5c', '#7a5a14', '#b3541e', '#2c4a7a', '#5f8a1c']

const toneFor = (id) => {
  const known = seed.find((s) => s.id === id)
  if (known) return known.tone
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TONES[h % TONES.length]
}

// Foto de ejemplo de los platos de la carta inicial (los platos nuevos no tienen foto aún)
const imgFor = (id) => seed.find((s) => s.id === id)?.img || ''

// Fila de la base -> plato de la interfaz
const fromRow = (r) => ({
  id: r.id, cat: r.cat, name: r.name, desc: r.descr, price: Number(r.price),
  active: r.active, tag: r.tag || '', sort: r.sort ?? 0, tone: toneFor(r.id), img: imgFor(r.id),
})

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}
const writeLocal = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
}

const localMenu = () =>
  (readLocal() || seed.map((s, i) => ({ ...s, active: true, tag: s.tag || '', sort: i + 1 })))

// includeInactive: el panel ve también los platos ocultos
export async function loadMenu({ includeInactive = false } = {}) {
  if (supabaseConfigurado) {
    const { data, error } = await supabase.from('menu_items').select('*').order('sort').order('name')
    if (error || !data?.length) return localMenuFallback(includeInactive)
    return data.map(fromRow).filter((i) => includeInactive || i.active)
  }
  return localMenuFallback(includeInactive)
}

const localMenuFallback = (includeInactive) =>
  localMenu().map((i) => ({ ...i, tone: toneFor(i.id), img: imgFor(i.id) })).filter((i) => includeInactive || i.active)

// item = { id?, cat, name, desc, price, active, tag }
export async function saveMenuItem(item) {
  const id = item.id || 'p' + Date.now().toString(36)
  const price = Math.max(0, Number(item.price) || 0)
  if (supabaseConfigurado) {
    const { error } = await supabase.from('menu_items').upsert({
      id, cat: item.cat, name: item.name.trim(), descr: (item.desc || '').trim(),
      price, active: item.active, tag: (item.tag || '').trim(), sort: item.sort ?? 99,
    })
    if (error) throw new Error(error.message)
    return
  }
  const list = localMenu()
  const next = { id, cat: item.cat, name: item.name.trim(), desc: (item.desc || '').trim(),
    price, active: item.active, tag: (item.tag || '').trim(), sort: item.sort ?? 99 }
  const exists = list.some((i) => i.id === id)
  writeLocal(exists ? list.map((i) => (i.id === id ? { ...i, ...next } : i)) : [...list, next])
}
