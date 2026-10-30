// Menú semanal: qué menús salen cada día y en qué orden (el primero es el destacado en la web).
// El plan se repite cada semana hasta que se cambie. Con Supabase vive en la tabla weekly_menu;
// sin Supabase queda en este navegador (modo demo).
import { supabase, supabaseConfigurado } from './supabase'
import { site } from '../config/site'
import { drinkSeed, weekSeed } from '../data/menu'

const KEY = 'zabori-week-v2' // v2: cada día lleva segundos y entradas
const DRINKS_KEY = 'zabori-drinks-v1'
export const DEFAULT_DRINK = 'Refresco del día'

export const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

// Días de atención empezando por el lunes
export const weekDays = () => [...site.openDays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))

// Día cuyo menú se muestra: hoy mientras se atiende; fuera de horario, el próximo día de atención
export function menuDay(now = new Date()) {
  const h = now.getHours() + now.getMinutes() / 60
  const today = site.openDays.includes(now.getDay()) && h < site.closeHour
  const date = new Date(now)
  if (!today) {
    for (let i = 0; i < 7; i++) {
      date.setDate(date.getDate() + 1)
      if (site.openDays.includes(date.getDay())) break
    }
  }
  return { day: date.getDay(), date, today }
}

// Carta pública de un día: sus segundos y entradas en orden + lo demás (shots, Arma tu plato).
// week = null (no se pudo leer el plan): se muestra todo.
export function forDay(items, week, day) {
  if (!week) return items
  const planned = (week[day] || []).map((id) => items.find((i) => i.id === id)).filter(Boolean)
  const of = (cat) => planned.filter((i) => i.cat === cat)
  return [...of('menu'), ...of('entrada'), ...items.filter((i) => i.cat !== 'menu' && i.cat !== 'entrada')]
}

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}

// Devuelve { 1: ['m1', 'm2'], 2: [...] } (día -> ids en orden)
export async function loadWeek() {
  if (supabaseConfigurado) {
    const { data, error } = await supabase.from('weekly_menu').select('day, item_id').order('sort')
    if (error) return null
    return data.reduce((w, r) => ({ ...w, [r.day]: [...(w[r.day] || []), r.item_id] }), {})
  }
  return readLocal() || weekSeed
}

// Devuelve { 1: 'Chicha morada', ... } (día -> bebida incluida)
export async function loadDrinks() {
  if (supabaseConfigurado) {
    const { data, error } = await supabase.from('weekly_drink').select('day, name')
    return error ? {} : Object.fromEntries(data.map((r) => [r.day, r.name]))
  }
  try { return JSON.parse(localStorage.getItem(DRINKS_KEY)) || drinkSeed } catch { return drinkSeed }
}

export async function saveDrink(day, name) {
  const n = name.trim()
  if (supabaseConfigurado) {
    const { error } = await supabase.from('weekly_drink').upsert({ day, name: n })
    if (error) throw new Error(error.message)
    return
  }
  try {
    localStorage.setItem(DRINKS_KEY, JSON.stringify({ ...(await loadDrinks()), [day]: n }))
  } catch {
    throw new Error('No se pudo guardar en este navegador.')
  }
}

// Guarda los segundos y entradas de un día en el orden indicado
export async function saveWeekDay(day, ids) {
  if (supabaseConfigurado) {
    if (ids.length) {
      const { error } = await supabase.from('weekly_menu')
        .upsert(ids.map((item_id, sort) => ({ day, item_id, sort })))
      if (error) throw new Error(error.message)
    }
    let del = supabase.from('weekly_menu').delete().eq('day', day)
    if (ids.length) del = del.not('item_id', 'in', `(${ids.join(',')})`)
    const { error } = await del
    if (error) throw new Error(error.message)
    return
  }
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...(readLocal() || weekSeed), [day]: ids }))
  } catch {
    throw new Error('No se pudo guardar en este navegador.')
  }
}
