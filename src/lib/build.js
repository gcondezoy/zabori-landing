// "Arma tu plato": con Supabase se lee de build_groups / build_options y el precio base de menu_items('arma');
// sin Supabase se usa el ejemplo de data/build.js y los cambios del panel quedan en este navegador.
import { supabase, supabaseConfigurado } from './supabase'
import { buildSeed } from '../data/build'

const KEY = 'zabori-build-v2' // v2: versión fit con gramajes
export const BUILD_ID = 'arma'
export const CART_PREFIX = 'arma|'

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}
const writeLocal = (b) => {
  try { localStorage.setItem(KEY, JSON.stringify({ basePrice: b.basePrice, options: b.options })) } catch {}
}
const localBuild = () => {
  const saved = readLocal()
  if (!saved) return { ...buildSeed }
  // Opciones nuevas del ejemplo (p. ej. un grupo agregado después) que aún no estaban guardadas
  const missing = buildSeed.options.filter((o) => !saved.options?.some((x) => x.id === o.id))
  return { ...buildSeed, ...saved, options: [...(saved.options || []), ...missing] }
}

const bySort = (a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name)

// includeInactive: el panel ve también las opciones ocultas
export async function loadBuild({ includeInactive = false } = {}) {
  let b = localBuild()
  if (supabaseConfigurado) {
    const [g, o, base] = await Promise.all([
      supabase.from('build_groups').select('*').order('sort'),
      supabase.from('build_options').select('*').order('sort'),
      supabase.from('menu_items').select('price, active').eq('id', BUILD_ID).maybeSingle(),
    ])
    if (!g.error && !o.error && g.data?.length) {
      b = {
        ...buildSeed,
        basePrice: Number(base.data?.price ?? buildSeed.basePrice),
        available: base.data ? base.data.active : true,
        groups: g.data.map((x) => ({ id: x.id, label: x.label, min: x.min_sel, max: x.max_sel, sort: x.sort })),
        options: o.data.map((x) => ({
          id: x.id, grp: x.grp, name: x.name, price: Number(x.price), active: x.active, sort: x.sort, img: x.img || '',
          sizes: (x.sizes || []).map((s) => ({ g: Number(s.g), price: Number(s.price) })),
        })),
      }
    }
  }
  return {
    ...b,
    available: b.available ?? true,
    groups: [...b.groups].sort((x, y) => x.sort - y.sort),
    options: b.options.filter((o) => includeInactive || o.active).sort(bySort),
  }
}

export async function saveBuildOption(opt) {
  const id = opt.id || `${opt.grp.charAt(0)}-${Date.now().toString(36)}`
  const sizes = (opt.sizes || [])
    .map((s) => ({ g: Math.round(Number(s.g) || 0), price: Math.max(0, Number(s.price) || 0) }))
    .filter((s) => s.g > 0)
    .sort((a, b) => a.g - b.g)
  const row = { id, grp: opt.grp, name: opt.name.trim(), price: Math.max(0, Number(opt.price) || 0), active: opt.active, sort: opt.sort ?? 99, img: (opt.img || '').trim(), sizes }
  if (supabaseConfigurado) {
    const { error } = await supabase.from('build_options').upsert(row)
    if (error) throw new Error(error.message)
    return
  }
  const b = localBuild()
  const exists = b.options.some((o) => o.id === id)
  writeLocal({ ...b, options: exists ? b.options.map((o) => (o.id === id ? { ...o, ...row } : o)) : [...b.options, row] })
}

export async function saveBasePrice(price) {
  const p = Math.max(0, Number(price) || 0)
  if (supabaseConfigurado) {
    const { error } = await supabase.from('menu_items').update({ price: p }).eq('id', BUILD_ID)
    if (error) throw new Error(error.message)
    return
  }
  writeLocal({ ...localBuild(), basePrice: p })
}

/* ---------- Cálculos (los mismos que hace el servidor en create_order) ---------- */

const optionMap = (build) => Object.fromEntries(build.options.map((o) => [o.id, o]))

// Una opción con porciones se elige como "p-pollo@180" (id @ gramos)
export const SIZE_SEP = '@'
export const sizeId = (id, g) => `${id}${SIZE_SEP}${g}`
export const parseId = (full) => {
  const [id, g] = full.split(SIZE_SEP)
  return { id, g: g ? Number(g) : null }
}
export const hasSizes = (o) => Array.isArray(o.sizes) && o.sizes.length > 0
export const sizeLabel = (name, g) => `${name} ${g} g`

// Opciones elegidas ordenadas por grupo. Las de porción vuelven con su precio y nombre con gramos.
// Si un id no es válido (opción oculta, porción inexistente), se omite: la línea queda inválida.
export function chosen(build, ids) {
  const map = optionMap(build)
  const gsort = Object.fromEntries(build.groups.map((g) => [g.id, g.sort]))
  return ids.map((full) => {
    const { id, g } = parseId(full)
    const o = map[id]
    if (!o) return null
    if (hasSizes(o)) {
      const s = o.sizes.find((x) => x.g === g)
      return s ? { ...o, id: full, baseId: o.id, g, price: s.price, name: sizeLabel(o.name, g), baseName: o.name } : null
    }
    return g == null ? { ...o, baseId: o.id, baseName: o.name } : null
  }).filter(Boolean).sort((a, b) => gsort[a.grp] - gsort[b.grp] || bySort(a, b))
}

// Precio más bajo posible del plato (sin contar el táper): para mostrar "Desde S/ …"
export function fromPrice(build) {
  return build.basePrice + build.groups.filter((g) => g.min > 0 && g.id !== 'taper').reduce((sum, g) => {
    const prices = build.options.filter((o) => o.grp === g.id)
      .flatMap((o) => (hasSizes(o) ? o.sizes.map((s) => s.price) : [o.price]))
    return sum + (prices.length ? Math.min(...prices) : 0)
  }, 0)
}

export const buildPrice = (build, ids) => build.basePrice + chosen(build, ids).reduce((s, o) => s + o.price, 0)
export const buildDetail = (build, ids) => chosen(build, ids).map((o) => o.name).join(' · ')

// Primer grupo que no cumple su mínimo (o null si está completo)
export function missingGroup(build, ids) {
  const picked = chosen(build, ids)
  return build.groups.find((g) => picked.filter((o) => o.grp === g.id).length < g.min) || null
}

/* ---------- Táper de los menús del día ---------- */
export const TAPER_GROUP = 'taper'
export const TAPER_SEP = '~'
export const taperOptions = (build) => build.options.filter((o) => o.grp === TAPER_GROUP && o.active !== false)
// Los menús del día se piden con táper (si hay alguno disponible); bebidas no
export const needsTaper = (item, build) => item.cat === 'menu' && taperOptions(build).length > 0
export const taperKey = (itemId, taperId) => `${itemId}${TAPER_SEP}${taperId}`

// Clave estable del carrito para un plato armado (mismas opciones = misma línea)
export const cartKey = (ids) => CART_PREFIX + [...ids].sort().join(',')
export const idsFromKey = (key) => key.slice(CART_PREFIX.length).split(',').filter(Boolean)
