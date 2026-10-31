import { useEffect, useState } from 'react'
import { CaretRight } from '@phosphor-icons/react'
import { lastOrder, TRACK_EVENT } from '../lib/whatsapp'
import { trackOrder } from '../lib/track'
import { onOrderPush } from '../lib/push'

const LABELS = {
  pendiente: 'Pedido recibido',
  preparando: 'Preparando tu comida',
  en_camino: 'En camino',
  listo: 'Listo para recoger',
}
const REFRESH_MS = 20000 // para quien no activó las notificaciones

// Solo aparece con un pedido en curso en este navegador: de un toque se ve cómo va
export default function OrderStrip() {
  const [order, setOrder] = useState(null)

  useEffect(() => {
    let alive = true
    let finished = null // pedido ya entregado o cancelado: no se vuelve a consultar
    const check = async () => {
      const saved = lastOrder()
      if (!saved || saved.code === finished || document.hidden) return // sin pedido o en segundo plano no se gasta tráfico
      try {
        const o = await trackOrder(saved.code, saved.phone)
        if (!alive) return
        const active = o && LABELS[o.status]
        if (!active) finished = saved.code
        setOrder(active ? o : null)
      } catch { /* sin conexión: se queda como estaba */ }
    }
    check()
    const t = setInterval(check, REFRESH_MS)
    const offPush = onOrderPush(() => { finished = null; check() }) // la notificación actualiza la franja al momento
    window.addEventListener(TRACK_EVENT, check)
    document.addEventListener('visibilitychange', check)
    return () => {
      alive = false
      clearInterval(t)
      offPush()
      window.removeEventListener(TRACK_EVENT, check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  if (!order) return null
  const paid = order.payment === 'pagado'
  const label = order.status === 'pendiente' ? (paid ? 'Pago confirmado' : 'Confirmando tu pago') : LABELS[order.status]
  return (
    <a href="#/seguir" className="order-strip" aria-label={`Tu pedido ${order.code}: ${label}. Ver cómo va`}>
      <span className="wrap order-strip-in">
        <span className="order-strip-dot" aria-hidden="true" />
        <span className="order-strip-text"><b key={label} className="order-strip-label">{label}</b><small>{order.code}</small></span>
        <span className="order-strip-go">Ver <CaretRight size={14} weight="bold" /></span>
      </span>
    </a>
  )
}
