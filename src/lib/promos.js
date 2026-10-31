// Promociones: el cliente las publica desde el panel y se ven en la cuenta. Solo informan: no cambian precios.
// Con Supabase se usa la tabla promotions; sin Supabase quedan en este navegador (modo demo).
import { supabase, supabaseConfigurado } from './supabase'

const KEY = 'zabori-promos-v1'

// Fecha de hoy en Lima, como AAAA-MM-DD (igual que la regla de la base de datos)
export const todayLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())

// 'live' | 'soon' | 'past' | 'off'
export function promoStatus(p, today = todayLima()) {
  if (!p.active) return 'off'
  if (p.startsOn && p.startsOn > today) return 'soon'
  if (p.endsOn && p.endsOn < today) return 'past'
  return 'live'
}

const fromRow = (r) => ({
  id: r.id, title: r.title, desc: r.descr, img: r.img || '',
  startsOn: r.starts_on || '', endsOn: r.ends_on || '', active: r.active, createdAt: r.created_at,
})

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
}
const writeLocal = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { throw new Error('No hay espacio en este navegador para guardar más fotos.') }
}

// all: el panel ve también las ocultas, programadas y vencidas
export async function loadPromos({ all = false } = {}) {
  let list
  if (supabaseConfigurado) {
    const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false })
    if (error) throw new Error('No se pudieron cargar las promociones. Revisa que el SQL de la etapa 10 esté ejecutado.')
    list = data.map(fromRow)
  } else {
    list = readLocal()
  }
  return all ? list : list.filter((p) => promoStatus(p) === 'live') // un admin también puede ver la web como cliente
}

export async function savePromo(p) {
  const title = (p.title || '').trim()
  const desc = (p.desc || '').trim()
  if (!title) throw new Error('Escribe un título.')
  if (p.startsOn && p.endsOn && p.endsOn < p.startsOn) throw new Error('La fecha final no puede ser anterior a la inicial.')
  if (supabaseConfigurado) {
    const row = { title, descr: desc, img: p.img || '', starts_on: p.startsOn || null, ends_on: p.endsOn || null, active: p.active }
    const { error } = p.id
      ? await supabase.from('promotions').update(row).eq('id', p.id)
      : await supabase.from('promotions').insert(row)
    if (error) throw new Error(error.message)
    return
  }
  const next = { ...p, title, desc }
  const list = readLocal()
  writeLocal(p.id
    ? list.map((x) => (x.id === p.id ? next : x))
    : [{ ...next, id: 'pr' + Date.now().toString(36), createdAt: new Date().toISOString() }, ...list])
}

export async function deletePromo(id) {
  if (supabaseConfigurado) {
    const { error } = await supabase.from('promotions').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  writeLocal(readLocal().filter((p) => p.id !== id))
}
