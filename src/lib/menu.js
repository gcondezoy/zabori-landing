// Carta: con Supabase se lee/edita la tabla menu_items; sin Supabase se usa el menú de ejemplo
// y los cambios del panel quedan en este navegador (modo demo).
import { supabase, supabaseConfigurado } from './supabase'
import { items as seed } from '../data/menu'
import { site } from '../config/site'
import { compressPhoto } from './images'

const KEY = 'zabori-menu-v4' // v2: Bebidas pasó a Shots · v3: precio único del menú · v4: entradas
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
  active: r.active, tag: r.tag || '', sort: r.sort ?? 0, tone: toneFor(r.id), img: r.img || imgFor(r.id),
})

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}
const writeLocal = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { throw new Error('No hay espacio en este navegador para guardar más fotos.') }
}

const localMenu = () =>
  (readLocal() || seed.map((s, i) => ({ ...s, active: true, tag: s.tag || '', sort: i + 1 })))

// Todos los menús del día cuestan lo mismo: el precio único se guarda en cada fila 'menu'
export const menuPrice = (list) => list.find((i) => i.cat === 'menu')?.price ?? site.menuPrice
const samePrice = (list) => {
  const p = menuPrice(list)
  return list.map((i) => (i.cat === 'menu' ? { ...i, price: p } : i))
}

// includeInactive: el panel ve también los platos ocultos
export async function loadMenu({ includeInactive = false } = {}) {
  if (supabaseConfigurado) {
    const { data, error } = await supabase.from('menu_items').select('*').order('sort').order('name')
    if (error || !data?.length) return localMenuFallback(includeInactive)
    return samePrice(data.map(fromRow)).filter((i) => includeInactive || i.active)
  }
  return localMenuFallback(includeInactive)
}

const localMenuFallback = (includeInactive) =>
  samePrice(localMenu().map((i) => ({ ...i, tone: toneFor(i.id), img: i.img || imgFor(i.id) }))).filter((i) => includeInactive || i.active)

// Cambia el precio de todos los menús del día a la vez
export async function saveMenuPrice(price) {
  const p = Math.max(0, Number(price) || 0)
  if (supabaseConfigurado) {
    const { error } = await supabase.from('menu_items').update({ price: p }).eq('cat', 'menu')
    if (error) throw new Error(error.message)
    return
  }
  writeLocal(localMenu().map((i) => (i.cat === 'menu' ? { ...i, price: p } : i)))
}

// item = { id?, cat, name, desc, price, active, tag, img }. Devuelve el id del plato.
export async function saveMenuItem(item) {
  const id = item.id || 'p' + Date.now().toString(36)
  const price = Math.max(0, Number(item.price) || 0)
  if (supabaseConfigurado) {
    const { error } = await supabase.from('menu_items').upsert({
      id, cat: item.cat, name: item.name.trim(), descr: (item.desc || '').trim(),
      price, active: item.active, tag: (item.tag || '').trim(), sort: item.sort ?? 99, img: item.img || '',
    })
    if (error) throw new Error(error.message)
    return id
  }
  const list = localMenu()
  const next = { id, cat: item.cat, name: item.name.trim(), desc: (item.desc || '').trim(),
    price, active: item.active, tag: (item.tag || '').trim(), sort: item.sort ?? 99, img: item.img || '' }
  const exists = list.some((i) => i.id === id)
  writeLocal(exists ? list.map((i) => (i.id === id ? { ...i, ...next } : i)) : [...list, next])
  return id
}

// Sube la foto de un plato y devuelve la dirección para guardarla en el plato
export async function uploadMenuPhoto(file) {
  if (supabaseConfigurado) {
    const blob = await compressPhoto(file)
    // Cada foto tiene nombre propio y no cambia: se puede guardar en caché todo un año y ahorrar tráfico
    const path = `${Date.now().toString(36)}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`
    const { error } = await supabase.storage.from('menu').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' })
    if (error) throw new Error(error.message)
    return supabase.storage.from('menu').getPublicUrl(path).data.publicUrl
  }
  // Modo demo: la foto queda dentro del navegador, más pequeña
  const blob = await compressPhoto(file, 480)
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = () => rej(new Error('No pudimos leer esa imagen.'))
    r.readAsDataURL(blob)
  })
}

// Elimina un plato. Si ya tiene pedidos en el historial no se puede borrar: queda oculto (devuelve 'hidden').
export async function deleteMenuItem(id) {
  if (supabaseConfigurado) {
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (!error) return 'deleted'
    if (error.code !== '23503') throw new Error(error.message)
    const res = await supabase.from('menu_items').update({ active: false }).eq('id', id)
    if (res.error) throw new Error(res.error.message)
    return 'hidden'
  }
  writeLocal(localMenu().filter((i) => i.id !== id))
  return 'deleted'
}
