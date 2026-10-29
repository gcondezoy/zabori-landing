import { useEffect, useState } from 'react'
import { X, CheckCircle, CreditCard, DeviceMobile, WhatsappLogo, Copy, Check, MapTrifold } from '@phosphor-icons/react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { createOrder } from '../lib/orders'
import { supabaseConfigurado } from '../lib/supabase'
import { culqiConfigurado, pedirToken, cobrar } from '../lib/culqi'
import { zaboriWhatsapp, rememberOrder } from '../lib/whatsapp'
import { money, site } from '../config/site'
import AddressPicker from './AddressPicker'

const empty = { name: '', phone: '', email: '', mode: 'delivery', address: '', lat: null, lng: null, notes: '' }

const PAY_OPTIONS = [
  { id: 'yape', label: 'Yape', icon: DeviceMobile },
  { id: 'plin', label: 'Plin', icon: DeviceMobile },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
]

// Datos para pagar con Yape o Plin + botón para enviar la captura
function WalletPay({ done }) {
  const w = site.wallets[done.method]
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(w.number.replace(/\s/g, '')); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }
  return (
    <div className="wallet">
      <p className="wallet-step">Paga <strong>{money(done.total)}</strong> con {w.label}</p>
      {w.qr
        ? <img className="wallet-qr" src={w.qr} alt={`QR de ${w.label} de ${site.name}`} width="220" height="220" />
        : <div className="wallet-qr empty">QR de {w.label}<br /><small>(se agrega con los datos reales)</small></div>}
      <div className="wallet-number">
        <span><small>Número {w.label}</small><b>{w.number}</b><small>{w.holder}</small></span>
        <button type="button" className="icon-btn" onClick={copy} aria-label="Copiar número">
          {copied ? <Check size={18} weight="bold" /> : <Copy size={18} />}
        </button>
      </div>
      <a className="btn wa block" target="_blank" rel="noreferrer"
        href={zaboriWhatsapp(`Hola, hice el pedido ${done.code} por ${money(done.total)}. Te envío la captura de mi pago con ${w.label}.`)}>
        <WhatsappLogo size={20} weight="fill" /> Enviar captura por WhatsApp
      </a>
      <p className="demo-note">Preparamos tu pedido apenas confirmemos el pago.</p>
    </div>
  )
}

export default function Checkout() {
  const { checkout, setCheckout, lines, subtotal, deliveryFor, clear } = useCart()
  const { user, setModal, saveProfile } = useAuth()
  const [f, setF] = useState(empty)
  const [method, setMethod] = useState('yape')
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
  const card = method === 'tarjeta'
  const needsEmail = card && culqiConfigurado // Culqi exige correo

  const close = () => { setCheckout(false); setDone(null); setErr(''); setPending(null) }
  const openAuth = (m) => { setCheckout(false); setModal(m) }
  const goTrack = () => { close(); window.location.hash = '#/seguir' }

  const finish = (order) => {
    rememberOrder(order.code, order.phone)
    setDone({ ...order, paid: order.method === 'tarjeta' && culqiConfigurado })
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
      const deliver = f.mode === 'delivery'
      const form = { ...f, address: deliver ? f.address : '', lat: deliver ? f.lat : null, lng: deliver ? f.lng : null, email: card ? f.email : '', payment_method: method }
      const res = await createOrder(form, lines, user?.id)
      if (user && f.mode === 'delivery' && f.address && f.address !== user.address) {
        saveProfile({ address: f.address }).catch(() => {})
      }
      const order = { code: res.code, total: res.total, mode: f.mode, email: f.email, phone: f.phone, method }
      if (!card || !culqiConfigurado) {
        // Yape/Plin: se paga fuera y se confirma en el panel. Tarjeta sin Culqi: modo demo.
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

  const wallet = done && done.method !== 'tarjeta'

  return (
    <div className="overlay center" onClick={close}>
      <div className="modal" role="dialog" aria-label="Finalizar pedido" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn close" onClick={close} aria-label="Cerrar"><X size={22} /></button>
        {done ? (
          <div className="done">
            <CheckCircle size={56} weight="fill" />
            <h3>{wallet ? '¡Pedido registrado!' : '¡Pedido recibido!'}</h3>
            <p>Código <strong>{done.code}</strong> · {money(done.total)}</p>

            {wallet ? <WalletPay done={done} /> : (
              <>
                <p>{done.mode === 'delivery' ? 'Te avisaremos cuando salga tu delivery.' : 'Te avisaremos cuando esté listo para recoger.'}</p>
                {done.paid
                  ? <p className="demo-note">Pago con tarjeta confirmado. Gracias por tu compra.</p>
                  : <p className="demo-note">Pago en modo demo: no se realizó ningún cobro real.</p>}
                <a className="btn wa block" target="_blank" rel="noreferrer"
                  href={zaboriWhatsapp(`Hola, acabo de hacer el pedido ${done.code}. ¿Me avisan cuando esté en camino?`)}>
                  <WhatsappLogo size={20} weight="fill" /> Seguir mi pedido por WhatsApp
                </a>
              </>
            )}

            <button type="button" className="btn ghost block" onClick={goTrack}><MapTrifold size={18} /> Ver el estado de mi pedido</button>
            <button type="button" className="link" onClick={close}>Volver a la carta</button>
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
                Pides como <strong>invitado</strong>, sin crear cuenta.{' '}
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
            {f.mode === 'delivery' && (
              <AddressPicker address={f.address} lat={f.lat} lng={f.lng}
                onChange={(a) => setF((cur) => ({ ...cur, ...a }))} />
            )}
            <label>{f.mode === 'delivery' ? 'Referencia (opcional)' : 'Indicaciones (opcional)'}
              <textarea rows={2} value={f.notes} onChange={set('notes')}
                placeholder={f.mode === 'delivery' ? 'Ej. portón negro, 2.º piso, tocar timbre' : ''} />
            </label>

            <fieldset className="paymethod">
              <legend>¿Cómo pagas?</legend>
              <div className="pm-options">
                {PAY_OPTIONS.map(({ id, label, icon: Icon }) => (
                  <label key={id} className={`pm-${id}${method === id ? ' on' : ''}`}>
                    <input type="radio" name="method" value={id} checked={method === id} onChange={() => setMethod(id)} />
                    <Icon size={20} weight={method === id ? 'fill' : 'regular'} /> {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {card && (
              <label>Correo{needsEmail ? '' : ' (opcional)'}
                <input type="email" required={needsEmail} value={f.email} onChange={set('email')} autoComplete="email" placeholder="Para el comprobante del pago" />
              </label>
            )}

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
              {!card
                ? `Al confirmar te mostramos el QR y número de ${site.wallets[method].label} para pagar.`
                : culqiConfigurado
                  ? 'Pago seguro con tarjeta a través de Culqi. Tus datos de tarjeta no pasan por Zabori.'
                  : `Modo demo: no se cobra nada.${supabaseConfigurado ? ' Falta la llave de Culqi para cobrar de verdad.' : ' Los pedidos se guardan solo en este navegador.'}`}
            </div>
            {err && <p className="form-err" role="alert">{err}</p>}
            <button className="btn primary block" disabled={paying}>
              {paying ? 'Procesando…' : card ? `Pagar ${money(total)}${culqiConfigurado ? '' : ' (demo)'}` : `Confirmar pedido · ${money(total)}`}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
