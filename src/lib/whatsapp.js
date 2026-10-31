import { site } from '../config/site'

// Enlace al WhatsApp de Zabori con un mensaje ya escrito
export const zaboriWhatsapp = (text) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`

export const METHODS = {
  tarjeta: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
}

// Para "Sigue tu pedido": este navegador recuerda el último pedido por un día (no va en la URL),
// así se puede volver a verlo aunque se cierre la pestaña. Del celular solo se guardan los últimos 4 dígitos.
export const TRACK_KEY = 'zabori-track'
export const TRACK_EVENT = 'zabori-track-change'
const TRACK_MS = 24 * 60 * 60 * 1000
export function rememberOrder(code, phone) {
  try { localStorage.setItem(TRACK_KEY, JSON.stringify({ code, phone: (phone || '').replace(/\D/g, '').slice(-4), at: Date.now() })) } catch {}
  window.dispatchEvent(new Event(TRACK_EVENT))
}
export function lastOrder() {
  try {
    const o = JSON.parse(localStorage.getItem(TRACK_KEY))
    return o && Date.now() - o.at < TRACK_MS ? o : null
  } catch { return null }
}
