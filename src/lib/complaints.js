// Libro de Reclamaciones virtual. Con Supabase: tabla complaints (etapa 12) y correos con la función complaint-email.
// Sin Supabase quedan en este navegador (modo demo).
import { supabase, supabaseConfigurado } from './supabase'

const KEY = 'zabori-reclamos-v1'
export const RESPONSE_DAYS = 15 // días hábiles para responder (D.S. 101-2022-PCM)

export const KINDS = {
  reclamo: { label: 'Reclamo', help: 'Disconformidad con los productos o el servicio que recibiste.' },
  queja: { label: 'Queja', help: 'Malestar con la atención, sin relación directa con el producto o servicio.' },
}
export const DOC_TYPES = ['DNI', 'CE', 'Pasaporte', 'RUC']

// Fecha límite: 15 días hábiles (lunes a viernes) desde la hoja. No descuenta feriados, así que nunca se pasa del plazo real.
export function dueDate(createdAt) {
  const d = new Date(createdAt)
  let n = 0
  while (n < RESPONSE_DAYS) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) n++
  }
  return d
}

// Días hábiles que quedan hasta la fecha límite (negativo = vencida)
export function businessDaysLeft(createdAt, now = new Date()) {
  const due = dueDate(createdAt)
  const d = new Date(now); d.setHours(0, 0, 0, 0)
  const end = new Date(due); end.setHours(0, 0, 0, 0)
  const sign = d <= end ? 1 : -1
  let n = 0
  while (sign > 0 ? d < end : d > end) {
    d.setDate(d.getDate() + sign)
    if (d.getDay() !== 0 && d.getDay() !== 6) n += sign
  }
  return n
}

const fromRow = (r) => ({
  code: r.code, kind: r.kind, name: r.name, docType: r.doc_type, docNumber: r.doc_number, address: r.address,
  phone: r.phone, email: r.email, guardian: r.guardian || '', itemType: r.item_type, orderCode: r.order_code || '',
  amount: r.amount == null ? null : Number(r.amount), itemDescr: r.item_descr, detail: r.detail, request: r.request,
  status: r.status, response: r.response || '', respondedAt: r.responded_at, emailedAt: r.emailed_at, createdAt: r.created_at,
})

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
}
const writeLocal = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {} }

const clean = (s) => String(s || '').trim()

// Misma validación que la base de datos, con mensajes claros antes de enviar
export function checkComplaint(f) {
  if (clean(f.name).length < 3) return 'Escribe tu nombre completo.'
  if (!/^[A-Za-z0-9]{6,15}$/.test(clean(f.docNumber))) return 'Revisa el número de documento.'
  if (clean(f.address).length < 5) return 'Escribe tu domicilio.'
  if (clean(f.phone).replace(/\D/g, '').length < 6) return 'Revisa tu celular.'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean(f.email))) return 'Revisa tu correo: ahí te enviaremos la respuesta.'
  if (f.minor && clean(f.guardian).length < 3) return 'Escribe el nombre del padre, madre o apoderado.'
  if (f.amount !== '' && !(Number(f.amount) >= 0)) return 'El monto debe ser un número.'
  if (clean(f.itemDescr).length < 3) return 'Describe el producto o servicio.'
  if (clean(f.detail).length < 10) return 'Cuéntanos con más detalle qué pasó.'
  if (clean(f.request).length < 3) return 'Escribe qué solicitas.'
  return ''
}

export async function createComplaint(f) {
  const problem = checkComplaint(f)
  if (problem) throw new Error(problem)
  const p = {
    kind: f.kind, name: clean(f.name), doc_type: f.docType, doc_number: clean(f.docNumber), address: clean(f.address),
    phone: clean(f.phone), email: clean(f.email).toLowerCase(), guardian: f.minor ? clean(f.guardian) : '',
    item_type: f.itemType, order_code: clean(f.orderCode).toUpperCase(), amount: f.amount === '' ? '' : String(Number(f.amount)),
    item_descr: clean(f.itemDescr), detail: clean(f.detail), request: clean(f.request),
  }
  if (supabaseConfigurado) {
    const { data, error } = await supabase.rpc('create_complaint', { p })
    if (error) {
      const msg = error.message || ''
      throw new Error(/Revisa|varias/.test(msg) ? msg : 'No se pudo registrar la hoja. Inténtalo de nuevo o escríbenos por WhatsApp.')
    }
    const emailed = await supabase.functions.invoke('complaint-email', { body: { type: 'receipt', code: data.code } })
      .then(({ data: r }) => r?.sent === true).catch(() => false)
    return { ...fromRow({ ...p, amount: p.amount === '' ? null : p.amount, code: data.code, status: 'pendiente', created_at: data.created_at }), emailed }
  }
  const list = readLocal()
  const year = new Date().getFullYear()
  const n = list.filter((c) => c.code.startsWith(`LR-${year}-`)).length + 1
  const row = fromRow({ ...p, amount: p.amount === '' ? null : p.amount, code: `LR-${year}-${String(n).padStart(5, '0')}`, status: 'pendiente', created_at: new Date().toISOString() })
  writeLocal([row, ...list])
  return { ...row, emailed: false }
}

export async function listComplaints() {
  if (supabaseConfigurado) {
    const { data, error } = await supabase.from('complaints').select('*').order('created_at', { ascending: false })
    if (error) throw new Error('No se pudieron cargar los reclamos. Revisa que el SQL de la etapa 12 esté ejecutado.')
    return data.map(fromRow)
  }
  return readLocal()
}

export async function pendingComplaints() {
  if (supabaseConfigurado) {
    const { count, error } = await supabase.from('complaints').select('code', { count: 'exact', head: true }).eq('status', 'pendiente')
    return error ? 0 : count || 0
  }
  return readLocal().filter((c) => c.status === 'pendiente').length
}

// Guarda la respuesta y la envía al correo del consumidor. Devuelve si el correo salió.
export async function answerComplaint(code, response) {
  const text = clean(response)
  if (text.length < 10) throw new Error('Escribe la respuesta completa antes de guardarla.')
  const respondedAt = new Date().toISOString()
  if (supabaseConfigurado) {
    const { error } = await supabase.from('complaints').update({ status: 'respondido', response: text, responded_at: respondedAt }).eq('code', code)
    if (error) throw new Error(error.message)
    return supabase.functions.invoke('complaint-email', { body: { type: 'response', code } })
      .then(({ data, error: e }) => !e && data?.sent === true).catch(() => false)
  }
  writeLocal(readLocal().map((c) => (c.code === code ? { ...c, status: 'respondido', response: text, respondedAt } : c)))
  return false
}
