import { site } from '../config/site'

// Enlace al WhatsApp de Zabori con un mensaje ya escrito
export const zaboriWhatsapp = (text) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`

export const METHODS = {
  tarjeta: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
}

// Para la página "Sigue tu pedido": se guarda en la sesión (no en la URL) el pedido recién hecho
export const TRACK_KEY = 'zabori-track'
export function rememberOrder(code, phone) {
  try { sessionStorage.setItem(TRACK_KEY, JSON.stringify({ code, phone })) } catch {}
}
export function lastOrder() {
  try { return JSON.parse(sessionStorage.getItem(TRACK_KEY)) } catch { return null }
}
