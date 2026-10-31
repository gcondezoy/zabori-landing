import { useEffect, useState } from 'react'
import { Bell, X, Phone, WhatsappLogo, EnvelopeSimple, MapPin, CheckCircle, Circle, UserCircle, MapTrifold } from '@phosphor-icons/react'
import { STATUS, PAYMENT, nextStatus, updateOrder, whatsappLink } from '../../lib/admin'
import { fmtDateTime } from '../../lib/stats'
import { notifyOrder, pushConfigurado, pushCount } from '../../lib/push'
import { mapsLink } from '../../lib/geo'
import { money } from '../../config/site'
import { StatusPill, PayPill } from './ui'

export default function OrderDetail({ order: o, onClose, refresh }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [notify, setNotify] = useState(false) // tras cambiar el estado, sugerir avisar al cliente
  const [pushes, setPushes] = useState(null) // dispositivos con avisos activos en este pedido
  const [pushSent, setPushSent] = useState(false)
  const closed = o.status === 'entregado' || o.status === 'cancelado'
  const unpaid = o.payment !== 'pagado' && o.status !== 'cancelado' // un pedido entregado sin pagar aún se puede cobrar
  const next = unpaid ? null : nextStatus(o) // primero se confirma el pago, luego avanza el pedido
  const wallet = { yape: 'Yape', plin: 'Plin' }[o.method]

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let alive = true
    pushCount(o.id).then((n) => { if (alive) setPushes(n) })
    return () => { alive = false }
  }, [o.id])

  const act = async (fields) => {
    setBusy(true); setErr(''); setPushSent(false)
    try {
      await updateOrder(o, fields)
      const result = await notifyOrder(o.code, fields.payment ? 'payment' : 'status')
      const sent = result?.sent > 0
      setPushSent(sent)
      if (result) setPushes(fields.status === 'entregado' || fields.status === 'cancelado' ? 0 : result.total)
      await refresh()
      if (fields.status && !sent) setNotify(true) // sin notificación: queda el aviso manual por WhatsApp
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const history = [...(o.history || [])].sort((a, b) => new Date(a.at) - new Date(b.at))

  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer detail" role="dialog" aria-label={`Pedido ${o.code}`} onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <h3>{o.code}</h3>
            <span className="muted">{fmtDateTime(o.createdAt)} · {o.mode === 'delivery' ? 'Delivery' : 'Recojo en local'}</span>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={22} /></button>
        </div>

        <div className="detail-body">
          <div className="pills-row"><StatusPill status={o.status} /><PayPill payment={o.payment} method={o.method} /></div>

          {(!closed || unpaid) && (
            <div className="o-actions">
              {unpaid && <button className="btn primary small" disabled={busy}
                onClick={() => window.confirm(`¿Ya recibiste ${money(o.total)}${wallet ? ` por ${wallet}` : ''}?`) && act({ payment: 'pagado' })}>
                {wallet ? `Confirmar pago ${wallet}` : 'Marcar pagado'}
              </button>}
              {next && <button className="btn primary small" disabled={busy} onClick={() => act({ status: next })}>Pasar a: {STATUS[next]}</button>}
              {!closed && <button className="btn ghost small danger" disabled={busy}
                onClick={() => window.confirm(`¿Cancelar el pedido ${o.code}?`) && act({ status: 'cancelado' })}>Cancelar</button>}
            </div>
          )}
          {unpaid && !closed && <p className="muted">Primero confirma el pago. Después podrás pasarlo a {STATUS[nextStatus(o)]}.</p>}
          {err && <p className="form-err" role="alert">{err}</p>}
          {pushConfigurado && pushes !== null && !closed && (
            <p className={`push-state${pushes > 0 ? ' on' : ''}`}>
              <Bell size={16} weight={pushes > 0 ? 'fill' : 'regular'} />
              {pushes > 0 ? 'Avisos activos: se notifica solo al cambiar el estado.' : 'Sin avisos activos: este cliente no recibe notificaciones.'}
            </p>
          )}
          {pushSent && <p className="push-state on" role="status"><Bell size={16} weight="fill" /> Notificación enviada al cliente.</p>}
          {notify && (
            <a className="notify" href={whatsappLink(o)} target="_blank" rel="noreferrer" onClick={() => setNotify(false)}>
              <WhatsappLogo size={18} weight="fill" /> Avisar al cliente: “{STATUS[o.status]}”
            </a>
          )}

          <section className="d-block">
            <h4>Cliente</h4>
            <p className="d-name"><UserCircle size={18} /> {o.name} <span className="muted">{o.userId ? '· con cuenta' : '· invitado'}</span></p>
            <p><a href={`tel:${o.phone}`}><Phone size={16} /> {o.phone}</a></p>
            <p><a href={whatsappLink(o)} target="_blank" rel="noreferrer"><WhatsappLogo size={16} /> Escribir por WhatsApp</a></p>
            {o.email && <p><a href={`mailto:${o.email}`}><EnvelopeSimple size={16} /> {o.email}</a></p>}
            {o.mode === 'delivery' && (
              <>
                <p><MapPin size={16} /> {o.address}</p>
                {/* Con ubicación marcada en el mapa, el enlace lleva al punto exacto; si no, se busca por texto */}
                <p><a href={o.lat != null ? mapsLink(o.lat, o.lng) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address + ', Lima')}`}
                  target="_blank" rel="noreferrer">
                  <MapTrifold size={16} /> {o.lat != null ? 'Abrir ubicación exacta en Google Maps' : 'Buscar dirección en Google Maps'}
                </a></p>
              </>
            )}
            {o.notes && <p className="note">“{o.notes}”</p>}
          </section>

          <section className="d-block">
            <h4>Detalle del pedido</h4>
            <table className="d-items">
              <thead><tr><th>Plato</th><th className="num">Cant.</th><th className="num">P. unit.</th><th className="num">Importe</th></tr></thead>
              <tbody>
                {o.items.map((i, k) => (
                  <tr key={k}><td>{i.name}{i.detail && <small className="line-detail">{i.detail}</small>}</td><td className="num">{i.qty}</td><td className="num">{money(i.price || 0)}</td><td className="num">{money((i.price || 0) * i.qty)}</td></tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3}>Subtotal</td><td className="num">{money(o.subtotal ?? o.total - (o.fee || 0))}</td></tr>
                {o.mode === 'delivery' && <tr><td colSpan={3}>Delivery</td><td className="num">{o.fee ? money(o.fee) : 'Gratis'}</td></tr>}
                <tr className="tot"><td colSpan={3}>Total</td><td className="num">{money(o.total)}</td></tr>
              </tfoot>
            </table>
            <p className="muted">
              Pago: {PAYMENT[o.payment] || o.payment} · {{ tarjeta: 'Tarjeta', yape: 'Yape', plin: 'Plin' }[o.method] || 'Tarjeta'}
              {o.paymentRef && ` · ${o.paymentRef === 'manual' ? 'marcado a mano' : `Culqi ${o.paymentRef}`}`}
            </p>
          </section>

          <section className="d-block">
            <h4>Historial</h4>
            {history.length === 0 ? <p className="muted">Sin historial registrado.</p> : (
              <ol className="timeline">
                {history.map((h, k) => (
                  <li key={k} className={k === history.length - 1 ? 'last' : ''}>
                    {k === history.length - 1 ? <CheckCircle size={18} weight="fill" /> : <Circle size={18} />}
                    <span>{h.type === 'payment' ? `Pago: ${PAYMENT[h.value] || h.value}` : STATUS[h.value] || h.value}</span>
                    <time>{fmtDateTime(h.at)}</time>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}
