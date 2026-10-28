// "Arma tu plato": con Supabase se lee de build_groups / build_options y el precio base de menu_items('arma');
// sin Supabase se usa el ejemplo de data/build.js y los cambios del panel quedan en este navegador.
import { supabase, supabaseConfigurado } from './supabase'
import { buildSeed } from '../data/build'

const KEY = 'zabori-build'
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
  return { ...buildSeed, ...(saved || {}) }
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
        options: o.data.map((x) => ({ id: x.id, grp: x.grp, name: x.name, price: Number(x.price), active: x.active, sort: x.sort })),
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
  const row = { id, grp: opt.grp, name: opt.name.trim(), price: Math.max(0, Number(opt.price) || 0), active: opt.active, sort: opt.sort ?? 99 }
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

// Opciones elegidas ordenadas por grupo
export function chosen(build, ids) {
  const map = optionMap(build)
  const gsort = Object.fromEntries(build.groups.map((g) => [g.id, g.sort]))
  return ids.map((id) => map[id]).filter(Boolean).sort((a, b) => gsort[a.grp] - gsort[b.grp] || bySort(a, b))
}

export const buildPrice = (build, ids) => build.basePrice + chosen(build, ids).reduce((s, o) => s + o.price, 0)
export const buildDetail = (build, ids) => chosen(build, ids).map((o) => o.name).join(' · ')

// Primer grupo que no cumple su mínimo (o null si está completo)
export function missingGroup(build, ids) {
  const picked = chosen(build, ids)
  return build.groups.find((g) => picked.filter((o) => o.grp === g.id).length < g.min) || null
}

// Clave estable del carrito para un plato armado (mismas opciones = misma línea)
export const cartKey = (ids) => CART_PREFIX + [...ids].sort().join(',')
export const idsFromKey = (key) => key.slice(CART_PREFIX.length).split(',').filter(Boolean)
