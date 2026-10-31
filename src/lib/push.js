// Notificaciones del navegador para seguir un pedido, con o sin cuenta.
// Cada pedido guarda su propia suscripción; la función notify-order las usa al cambiar el estado.
import { supabase, supabaseConfigurado } from './supabase'

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
const DONE_KEY = 'zabori-push-orders'
const PHONE_KEY = 'zabori-push-phones' // para abrir el seguimiento directo al tocar la notificación

export const pushConfigurado = Boolean(PUBLIC_KEY && supabaseConfigurado)

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const doneList = () => {
  try { return JSON.parse(localStorage.getItem(DONE_KEY)) || [] } catch { return [] }
}

// 'off' | 'ios-install' | 'unsupported' | 'denied' | 'done' | 'ready'
export function pushState(code) {
  if (!pushConfigurado) return 'off'
  if (isIos() && !isInstalled()) return 'ios-install' // en iPhone solo funciona con la web instalada
  if (!supported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'granted' && doneList().includes(code)) return 'done'
  return 'ready'
}

function keyBytes(base64url) {
  const raw = atob(base64url.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

// Debe llamarse al tocar un botón: los navegadores no piden permiso de otra forma
export async function enablePush(code, phone) {
  const registration = await navigator.serviceWorker.register('/sw.js')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission
  const ready = await navigator.serviceWorker.ready
  const subscription = await ready.pushManager.getSubscription()
    || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) })
  const { data, error } = await supabase.rpc('save_push_subscription', {
    p_code: code, p_phone: (phone || '').replace(/\D/g, '').slice(-4), p_sub: subscription.toJSON(),
  })
  if (error || data !== true) throw new Error('No pudimos activar los avisos. Inténtalo de nuevo.')
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify([...doneList().slice(-19), code]))
    const phones = JSON.parse(localStorage.getItem(PHONE_KEY)) || {}
    localStorage.setItem(PHONE_KEY, JSON.stringify({ ...phones, [code]: (phone || '').replace(/\D/g, '').slice(-4) }))
  } catch { /* solo evita repetir el botón */ }
  return 'granted'
}

export function pushPhone(code) {
  try { return (JSON.parse(localStorage.getItem(PHONE_KEY)) || {})[code] || '' } catch { return '' }
}

/* ---------- Panel ---------- */

// Cuántos dispositivos recibirán los avisos de este pedido (null si no se pudo saber)
export async function pushCount(orderId) {
  if (!pushConfigurado) return null
  const { count, error } = await supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('order_id', orderId)
  return error ? null : count
}

// event: 'status' | 'payment'. Devuelve { sent, total }, o null si no se pudo avisar: nunca frena el cambio de estado.
export async function notifyOrder(code, event = 'status') {
  if (!pushConfigurado) return null
  try {
    const { data, error } = await supabase.functions.invoke('notify-order', { body: { code, event } })
    return error ? null : data
  } catch {
    return null
  }
}
