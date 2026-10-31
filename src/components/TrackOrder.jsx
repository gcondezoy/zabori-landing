import { useCallback, useEffect, useState } from 'react'
import { MagnifyingGlass, CheckCircle, Circle, WhatsappLogo, ArrowLeft, XCircle } from '@phosphor-icons/react'
import { trackOrder } from '../lib/track'
import { zaboriWhatsapp, lastOrder, METHODS } from '../lib/whatsapp'
import { money } from '../config/site'
import { onOrderPush, pushPhone } from '../lib/push'
import PushOptIn from './PushOptIn'

const REFRESH_MS = 20000

const STEPS = {
  delivery: [
    ['pendiente', 'Pedido recibido'], ['preparando', 'Preparando tu comida'], ['en_camino', 'En camino'], ['entregado', 'Entregado'],
  ],
  recojo: [
    ['pendiente', 'Pedido recibido'], ['preparando', 'Preparando tu comida'], ['listo', 'Listo para recoger'], ['entregado', 'Entregado'],
  ],
}

const hora = (iso) => new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

// Hora en que el pedido llegó a cada estado (según el historial)
function reachedAt(order, status) {
  const h = (order.history || []).filter((x) => x.type === 'status' && x.value === status)
  return h.length ? h[h.length - 1].at : status === 'pendiente' ? order.createdAt : null
}

// Al tocar una notificación se llega con #/seguir?codigo=ZAB-XXXXX
function codeFromLink() {
  return new URLSearchParams(window.location.hash.split('?')[1] || '').get('codigo')?.toUpperCase() || ''
}

export default function TrackOrder() {
  const linked = codeFromLink()
  const saved = linked ? { code: linked, phone: lastOrder()?.code === linked ? lastOrder().phone : pushPhone(linked) } : lastOrder()
  const [code, setCode] = useState(saved?.code || '')
  const [phone, setPhone] = useState((saved?.phone || '').replace(/\D/g, '').slice(-4))
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [updated, setUpdated] = useState(null)

  const look = useCallback(async (c = code, p = phone, quiet = false) => {
    if (!quiet) { setBusy(true); setErr('') }
    try {
      const o = await trackOrder(c, p)
      if (!o) { if (!quiet) { setOrder(null); setErr('No encontramos un pedido con ese código y celular. Revisa los datos.') } return }
      setOrder(o)
      setUpdated(new Date())
    } catch (e) {
      if (!quiet) setErr(e.message)
    } finally {
      if (!quiet) setBusy(false)
    }
  }, [code, phone])

  // Si viene de hacer un pedido, se consulta solo
  useEffect(() => { if (saved?.code && saved?.phone) look(saved.code, saved.phone) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Se actualiza solo mientras el pedido siga en curso: al momento si llega la notificación o se vuelve a la pestaña
  useEffect(() => {
    if (!order || order.status === 'entregado' || order.status === 'cancelado') return
    const refresh = () => { if (!document.hidden) look(order.code, phone, true) } // sin gastar tráfico en segundo plano
    const t = setInterval(refresh, REFRESH_MS)
    const offPush = onOrderPush((c) => { if (c === order.code) refresh() })
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(t)
      offPush()
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [order, phone, look])

  const submit = (e) => { e.preventDefault(); look() }
  const steps = order ? STEPS[order.mode] || STEPS.delivery : []
  const current = order ? steps.findIndex(([s]) => s === order.status) : -1
  const cancelled = order?.status === 'cancelado'
  const waitingPay = order && order.payment !== 'pagado' && !cancelled

  return (
    <main className="track section">
      <div className="wrap track-in">
        <a href="#top" className="back-link"><ArrowLeft size={16} /> Volver a la carta</a>
        <h1>Sigue tu pedido</h1>
        <p className="sub">Ingresa el código de tu pedido y los últimos 4 dígitos de tu celular.</p>

        <form className="track-form" onSubmit={submit}>
          <label>Código<input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ZAB-XXXXX" autoComplete="off" /></label>
          <label>Celular (últimos 4)<input required inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="4321" autoComplete="tel" /></label>
          <button className="btn primary" disabled={busy}><MagnifyingGlass size={18} weight="bold" /> {busy ? 'Buscando…' : 'Consultar'}</button>
        </form>
        {err && <p className="form-err" role="alert">{err}</p>}

        {order && (
          <section className="track-card" aria-live="polite">
            <header>
              <div>
                <small>Pedido</small>
                <h2>{order.code}</h2>
              </div>
              <div className="track-total">
                <small>{order.mode === 'delivery' ? 'Delivery' : 'Recojo'} · {METHODS[order.method] || order.method}{order.payment === 'pagado' && ' · Pagado'}</small>
                <strong>{money(order.total)}</strong>
              </div>
            </header>

            {waitingPay && (
              <p className="track-alert">
                {order.method === 'tarjeta'
                  ? 'Aún no vemos el pago con tarjeta de este pedido.'
                  : `Estamos confirmando tu pago con ${METHODS[order.method]}. Si ya pagaste, envíanos la captura por WhatsApp.`}
              </p>
            )}

            {cancelled ? (
              <p className="track-cancel"><XCircle size={22} weight="fill" /> Este pedido fue cancelado. Escríbenos si tienes dudas.</p>
            ) : (
              <ol className="track-steps">
                {steps.map(([s, label], i) => {
                  const at = reachedAt(order, s)
                  const state = i < current ? 'is-done' : i === current ? 'is-now' : 'is-next'
                  return (
                    <li key={s} className={state}>
                      <span key={state} className="ts-dot">{state === 'is-next' ? <Circle size={22} /> : <CheckCircle size={22} weight="fill" />}</span>
                      <span className="ts-label">{label}</span>
                      <span className="ts-time">{state !== 'is-next' && at ? hora(at) : ''}</span>
                    </li>
                  )
                })}
              </ol>
            )}

            <ul className="track-items">
              {order.items.map((i, k) => (
                <li key={k}><b>{i.qty}× {i.name}</b>{i.detail && <small>{i.detail}</small>}</li>
              ))}
            </ul>

            {!cancelled && order.status !== 'entregado' && <PushOptIn code={order.code} phone={phone} />}

            <div className="track-foot">
              <a className="btn wa" target="_blank" rel="noreferrer" href={zaboriWhatsapp(`Hola, tengo una consulta sobre mi pedido ${order.code}.`)}>
                <WhatsappLogo size={20} weight="fill" /> Escríbenos por WhatsApp
              </a>
              {updated && <small className="muted">Actualizado {hora(updated)} · se actualiza solo</small>}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
