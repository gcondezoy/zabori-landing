import { useEffect, useState } from 'react'
import { X, CheckCircle } from '@phosphor-icons/react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { createOrder } from '../lib/orders'
import { supabaseConfigurado } from '../lib/supabase'
import { culqiConfigurado, pedirToken, cobrar } from '../lib/culqi'
import { money, site } from '../config/site'

const empty = { name: '', phone: '', email: '', mode: 'delivery', address: '', notes: '' }

export default function Checkout() {
  const { checkout, setCheckout, lines, subtotal, deliveryFor, clear } = useCart()
  const { user, setModal, saveProfile } = useAuth()
  const [f, setF] = useState(empty)
  const [paying, setPaying] = useState(false)
  const [done, setDone] = useState(null)
  const [err, setErr] = useState('')
  const [pending, setPending] = useState(null) // pedido ya creado, esperando el cobro con tarjeta

  // Al abrir el checkout con sesión iniciada, se completan los datos guardados
  useEffect(() => {
    if (!checkout || !user) return
    setF((cur) => ({
      ...cur,
      name: cur.name || user.name || '',
      phone: cur.phone || user.phone || '',
      email: cur.email || user.email || '',
      address: cur.address || user.address || '',
    }))
  }, [checkout, user])

  if (!checkout) return null

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const fee = deliveryFor(f.mode)
  const total = subtotal + fee

  const close = () => { setCheckout(false); setDone(null); setErr(''); setPending(null) }
  const openAuth = (m) => { setCheckout(false); setModal(m) }

  const finish = (order) => {
    setDone({ code: order.code, total: order.total, mode: order.mode, paid: culqiConfigurado })
    setPending(null)
    clear()
    setF(empty)
  }

  // Abre Culqi, tokeniza la tarjeta y pide al servidor que cobre el pedido.
  const charge = async (order) => {
    setErr('')
    try {
      // Mientras el cliente llena la tarjeta el botón sigue activo: si cierra la ventana puede reintentar.
      const token = await pedirToken({ amount: order.total, title: `Zabori ${order.code}` })
      setPaying(true)
      await cobrar({ code: order.code, token, email: order.email })
      finish(order)
    } catch (error) {
      setErr(error.message || 'No pudimos procesar el pago.')
    } finally {
      setPaying(false)
    }
  }

  const pay = async (e) => {
    e.preventDefault()
    setErr('')
    setPaying(true)
    try {
      const form = { ...f, address: f.mode === 'delivery' ? f.address : '' }
      const res = await createOrder(form, lines, user?.id)
      if (user && f.mode === 'delivery' && f.address && f.address !== user.address) {
        saveProfile({ address: f.address }).catch(() => {})
      }
      const order = { code: res.code, total: res.total, mode: f.mode, email: f.email }
      if (!culqiConfigurado) {
        // MODO DEMO: el pedido se guarda, el cobro se simula.
        finish(order)
      } else {
        setPending(order)
        setPaying(false)
        await charge(order)
      }
    } catch (error) {
      setErr(error.message || 'No pudimos registrar tu pedido. Inténtalo de nuevo.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="overlay center" onClick={close}>
      <div className="modal" role="dialog" aria-label="Finalizar pedido" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn close" onClick={close} aria-label="Cerrar"><X size={22} /></button>
        {done ? (
          <div className="done">
            <CheckCircle size={56} weight="fill" />
            <h3>¡Pedido recibido!</h3>
            <p>Código <strong>{done.code}</strong> · {money(done.total)}</p>
            <p>{done.mode === 'delivery' ? 'Te avisaremos cuando salga tu delivery.' : 'Te avisaremos cuando esté listo para recoger.'}</p>
            {!user && <p className="demo-note">Guarda tu código para consultar tu pedido.</p>}
            {done.paid
              ? <p className="demo-note">Pago con tarjeta confirmado. Gracias por tu compra.</p>
              : <p className="demo-note">Pago en modo demo: no se realizó ningún cobro real.</p>}
            <button className="btn primary" onClick={close}>Listo</button>
          </div>
        ) : pending ? (
          <div className="done">
            <h3>Pedido {pending.code}</h3>
            <p>Total a pagar: <strong>{money(pending.total)}</strong></p>
            {err && <p className="form-err" role="alert">{err}</p>}
            <button className="btn primary block" disabled={paying} onClick={() => charge(pending)}>
              {paying ? 'Procesando…' : 'Pagar con tarjeta'}
            </button>
            <p className="demo-note">Si cierras esta ventana sin pagar, tu pedido no se prepara.</p>
          </div>
        ) : lines.length === 0 ? (
          <p className="empty">Tu carrito está vacío.</p>
        ) : (
          <form onSubmit={pay}>
            <h3>Finalizar pedido</h3>
            {user ? (
              <p className="guest">Pides como <strong>{user.name || user.email}</strong>.</p>
            ) : (
              <p className="guest">
                Pagas como <strong>invitado</strong>, sin crear cuenta.{' '}
                <button type="button" className="link" onClick={() => openAuth('login')}>Iniciar sesión</button>
                {' · '}
                <button type="button" className="link" onClick={() => openAuth('registro')}>Crear cuenta</button>
              </p>
            )}

            <div className="seg">
              {[['delivery', 'Delivery'], ['recojo', 'Recojo']].map(([v, l]) => (
                <label key={v} className={f.mode === v ? 'on' : ''}>
                  <input type="radio" name="mode" value={v} checked={f.mode === v} onChange={set('mode')} /> {l}
                </label>
              ))}
            </div>

            <label>Nombre<input required value={f.name} onChange={set('name')} autoComplete="name" /></label>
            <label>Celular<input required type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></label>
            <label>Correo{culqiConfigurado ? '' : ' (opcional)'}<input type="email" required={culqiConfigurado} value={f.email} onChange={set('email')} autoComplete="email" /></label>
            {f.mode === 'delivery' && (
              <label>Dirección de entrega<input required value={f.address} onChange={set('address')} autoComplete="street-address" /></label>
            )}
            <label>Indicaciones (opcional)<textarea rows={2} value={f.notes} onChange={set('notes')} /></label>

            <div className="summary">
              <div className="row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              {f.mode === 'delivery' && (
                <div className="row"><span>Delivery</span><span>{fee ? money(fee) : 'Gratis'}</span></div>
              )}
              <div className="row total"><span>Total</span><strong>{money(total)}</strong></div>
              {f.mode === 'delivery' && fee > 0 && (
                <p className="hint">Delivery gratis desde {money(site.freeDeliveryFrom)}.</p>
              )}
            </div>

            <div className="card-demo">
              {culqiConfigurado
                ? 'Pago seguro con tarjeta a través de Culqi. Tus datos de tarjeta no pasan por Zabori.'
                : `Modo demo: no se cobra nada.${supabaseConfigurado ? ' Falta la llave de Culqi para cobrar de verdad.' : ' Los pedidos se guardan solo en este navegador.'}`}
            </div>
            {err && <p className="form-err" role="alert">{err}</p>}
            <button className="btn primary block" disabled={paying}>{paying ? 'Procesando…' : `Pagar ${money(total)}${culqiConfigurado ? '' : ' (demo)'}`}</button>
          </form>
        )}
      </div>
    </div>
  )
}
