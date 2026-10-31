import { useEffect, useState } from 'react'
import { X, CheckCircle, CreditCard, WhatsappLogo, Copy, Check, MapTrifold, Storefront } from '@phosphor-icons/react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { createOrder } from '../lib/orders'
import { culqiConfigurado, pedirToken, cobrar } from '../lib/culqi'
import { zaboriWhatsapp, rememberOrder } from '../lib/whatsapp'
import { money, site } from '../config/site'
import AddressPicker from './AddressPicker'

const empty = { name: '', phone: '', email: '', mode: 'delivery', address: '', lat: null, lng: null, notes: '' }

// La tarjeta solo se ofrece con las llaves de Culqi: sin ellas no se puede cobrar
const PAY_OPTIONS = [
  { id: 'yape', label: 'Yape', logo: site.wallets.yape.logo },
  { id: 'plin', label: 'Plin', logo: site.wallets.plin.logo },
  ...(culqiConfigurado ? [{ id: 'tarjeta', label: 'Tarjeta', icon: CreditCard }] : []),
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
      <img className="wallet-logo" src={w.logo} alt="" width="56" height="56" />
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
      lat: cur.address ? cur.lat : user.lat ?? null,
      lng: cur.address ? cur.lng : user.lng ?? null,
    }))
  }, [checkout, user])

  if (!checkout) return null

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const fee = deliveryFor(f.mode)
  const total = subtotal + fee
  const card = method === 'tarjeta'

  const close = () => { setCheckout(false); setDone(null); setErr(''); setPending(null) }
  const openAuth = (m) => { setCheckout(false); setModal(m) }
  const goTrack = () => { close(); window.location.hash = '#/seguir' }

  const finish = (order) => {
    rememberOrder(order.code, order.phone)
    setDone(order)
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
        saveProfile({ address: f.address, lat: f.lat, lng: f.lng }).catch(() => {})
      }
      const order = { code: res.code, total: res.total, mode: f.mode, email: f.email, phone: f.phone, method }
      if (!card) {
        // Yape/Plin: se paga fuera y se confirma en el panel
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

            {done.mode === 'recojo' && (
              <p className="pickup-note"><Storefront size={20} /> <span>Recoges en <b>{site.address}</b><br />{site.schedule}</span></p>
            )}

            {wallet ? <WalletPay done={done} /> : (
              <>
                <p>{done.mode === 'delivery' ? 'Te avisaremos cuando salga tu delivery.' : 'Te avisaremos cuando esté listo para recoger.'}</p>
                <p className="demo-note">Pago con tarjeta confirmado. Gracias por tu compra.</p>
                <a className="btn wa block" target="_blank" rel="noreferrer"
                  href={zaboriWhatsapp(`Hola, acabo de hacer el pedido ${done.code}. ¿Me avisan cuando esté ${done.mode === 'delivery' ? 'en camino' : 'listo para recoger'}?`)}>
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
            {f.mode === 'recojo' && (
              <p className="pickup-note"><Storefront size={20} /> <span>Recoges en <b>{site.address}</b><br />{site.schedule}</span></p>
            )}
            <label>{f.mode === 'delivery' ? 'Referencia (opcional)' : 'Indicaciones (opcional)'}
              <textarea rows={2} value={f.notes} onChange={set('notes')}
                placeholder={f.mode === 'delivery' ? 'Ej. portón negro, 2.º piso, tocar timbre' : ''} />
            </label>

            <fieldset className="paymethod">
              <legend>¿Cómo pagas?</legend>
              <div className="pm-options">
                {PAY_OPTIONS.map(({ id, label, logo, icon: Icon }) => (
                  <label key={id} className={`pm-${id}${method === id ? ' on' : ''}`}>
                    <input type="radio" name="method" value={id} checked={method === id} onChange={() => setMethod(id)} />
                    {logo
                      ? <img className="pm-logo" src={logo} alt="" width="36" height="36" />
                      : <Icon size={36} weight={method === id ? 'fill' : 'regular'} />}
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {card && (
              <label>Correo
                <input type="email" required value={f.email} onChange={set('email')} autoComplete="email" placeholder="Para el comprobante del pago" />
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
                : 'Pago seguro con tarjeta a través de Culqi. Tus datos de tarjeta no pasan por Zabori.'}
            </div>
            {err && <p className="form-err" role="alert">{err}</p>}
            <button className="btn primary block" disabled={paying}>
              {paying ? 'Procesando…' : card ? `Pagar ${money(total)}` : `Confirmar pedido · ${money(total)}`}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
