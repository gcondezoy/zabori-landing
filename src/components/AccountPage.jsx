import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowClockwise, CheckCircle, Circle, MapTrifold, SignOut, UserCircle, Receipt, Heart, Gift, Star,
} from '@phosphor-icons/react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useMenu } from '../context/MenuContext'
import { listMyOrders } from '../lib/orders'
import { reorderLines } from '../lib/reorder'
import { rememberOrder, METHODS } from '../lib/whatsapp'
import { supabaseConfigurado } from '../lib/supabase'
import { money } from '../config/site'
import AddressPicker from './AddressPicker'

const REFRESH_MS = 20000
const STATUS = {
  pendiente: 'Recibido', preparando: 'Preparando', en_camino: 'En camino',
  listo: 'Listo para recoger', entregado: 'Entregado', cancelado: 'Cancelado',
}
const FLOW = { delivery: ['pendiente', 'preparando', 'en_camino', 'entregado'], recojo: ['pendiente', 'preparando', 'listo', 'entregado'] }
const isOpen = (o) => o.status !== 'entregado' && o.status !== 'cancelado'
const fecha = (iso) => new Date(iso).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
const hora = (iso) => new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

/* ---------- Sin sesión: invitación ---------- */
function Welcome() {
  const { setModal } = useAuth()
  const perks = [
    [Receipt, 'Sigue tus pedidos en vivo', 'Ve en qué paso está tu almuerzo sin preguntar.'],
    [ArrowClockwise, 'Vuelve a pedir en un toque', 'Tu pedido de siempre, con el mismo táper y opciones.'],
    [Heart, 'Tus datos guardados', 'Dirección, referencia y celular se completan solos.'],
  ]
  return (
    <div className="acc-welcome">
      <UserCircle size={56} weight="duotone" />
      <h1>Tu cuenta Zabori</h1>
      <p className="sub">Pedir sin cuenta siempre es posible. Con cuenta, pides más rápido.</p>
      <ul className="acc-perks">
        {perks.map(([Icon, t, d]) => (
          <li key={t}><Icon size={24} weight="duotone" /><span><b>{t}</b><small>{d}</small></span></li>
        ))}
      </ul>
      <div className="acc-cta">
        <button className="btn primary" onClick={() => setModal('registro')}>Crear mi cuenta</button>
        <button className="btn ghost" onClick={() => setModal('login')}>Ya tengo cuenta</button>
      </div>
    </div>
  )
}

/* ---------- Pedido en curso ---------- */
function LiveOrder({ o }) {
  const steps = FLOW[o.mode] || FLOW.delivery
  const current = steps.indexOf(o.status)
  const at = (s) => [...(o.history || [])].reverse().find((h) => h.type === 'status' && h.value === s)?.at || (s === 'pendiente' ? o.createdAt : null)
  const track = () => { rememberOrder(o.code, o.phone); window.location.hash = '#/seguir' }
  const unpaid = o.payment !== 'pagado'
  return (
    <article className="acc-live">
      <header>
        <span><small>Pedido {o.code}</small><b>{STATUS[o.status]}</b></span>
        <strong>{money(o.total)}</strong>
      </header>
      {unpaid && <p className="acc-pay">Pago por confirmar · {METHODS[o.method] || 'Tarjeta'}</p>}
      <ol className="acc-steps" aria-label="Progreso del pedido">
        {steps.map((s, i) => (
          <li key={s} className={i < current ? 'is-done' : i === current ? 'is-now' : 'is-next'}>
            {i <= current ? <CheckCircle size={20} weight="fill" /> : <Circle size={20} />}
            <span>{STATUS[s]}</span>
            <small>{i <= current && at(s) ? hora(at(s)) : ''}</small>
          </li>
        ))}
      </ol>
      <p className="acc-items">{o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}</p>
      <button className="link" onClick={track}><MapTrifold size={16} /> Ver seguimiento completo</button>
    </article>
  )
}

/* ---------- Historial ---------- */
function PastOrder({ o, onReorder }) {
  return (
    <li className="acc-past">
      <div className="acc-past-main">
        <span className="acc-date">{fecha(o.createdAt)} · {o.mode === 'delivery' ? 'Delivery' : 'Recojo'}</span>
        <ul>
          {o.items.map((i, k) => (
            <li key={k}><b>{i.qty}× {i.name}</b>{i.detail && <small>{i.detail}</small>}</li>
          ))}
        </ul>
      </div>
      <div className="acc-past-side">
        <strong>{money(o.total)}</strong>
        <span className={`acc-status s-${o.status}`}>{STATUS[o.status]}</span>
        {o.status !== 'cancelado' && (
          <button className="btn small primary" onClick={() => onReorder(o)}><ArrowClockwise size={16} weight="bold" /> Volver a pedir</button>
        )}
      </div>
    </li>
  )
}

/* ---------- Mis datos ---------- */
function MyData() {
  const { user, saveProfile } = useAuth()
  const [f, setF] = useState({ name: user.name || '', phone: user.phone || '', address: user.address || '', lat: user.lat ?? null, lng: user.lng ?? null })
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setSaved(false) }
  const save = async (e) => {
    e.preventDefault()
    setErr('')
    try { await saveProfile(f); setSaved(true) } catch (error) { setErr(error.message) }
  }
  // El permiso se guarda al instante: retirarlo no debe depender de completar el resto del formulario
  const toggleMarketing = async (e) => {
    const accepts_marketing = e.target.checked
    setErr('')
    try { await saveProfile({ accepts_marketing }) } catch (error) { setErr(error.message) }
  }
  return (
    <form className="acc-data" onSubmit={save}>
      <label>Nombre<input value={f.name} onChange={set('name')} autoComplete="name" /></label>
      <label>Celular<input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></label>
      <AddressPicker address={f.address} lat={f.lat} lng={f.lng}
        onChange={(a) => { setF((cur) => ({ ...cur, ...a })); setSaved(false) }} />
      <p className="muted small">Correo: {user.email}</p>
      <label className="consent">
        <input type="checkbox" checked={user.accepts_marketing === true} onChange={toggleMarketing} />
        <span>Quiero recibir promociones y novedades de Zabori por correo</span>
      </label>
      {err && <p className="form-err" role="alert">{err}</p>}
      <button className="btn primary">{saved ? 'Guardado ✓' : 'Guardar mis datos'}</button>
    </form>
  )
}

/* ---------- Página ---------- */
export default function AccountPage() {
  const { user, ready, signOut } = useAuth()
  const { add, setOpen } = useCart()
  const { items: catalog, build } = useMenu()
  const [orders, setOrders] = useState(null)
  const [tab, setTab] = useState('pedidos')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    try { setOrders(await listMyOrders(user.id)) } catch { setOrders((o) => o || []) }
  }, [user])

  useEffect(() => { setOrders(null); load() }, [load])

  // Mientras haya pedidos en curso, se actualiza solo
  const live = (orders || []).filter(isOpen)
  useEffect(() => {
    if (!live.length) return
    const t = setInterval(() => { if (!document.hidden) load() }, REFRESH_MS) // sin gastar tráfico en segundo plano
    return () => clearInterval(t)
  }, [live.length, load])

  const stats = useMemo(() => {
    const valid = (orders || []).filter((o) => o.status !== 'cancelado')
    const count = {}
    valid.forEach((o) => o.items.forEach((i) => { count[i.name] = (count[i.name] || 0) + i.qty }))
    const fav = Object.entries(count).sort((a, b) => b[1] - a[1])[0]
    return { total: valid.length, fav: fav ? fav[0] : null }
  }, [orders])

  const reorder = (o) => {
    const { lines, missing } = reorderLines(o.items, catalog, build)
    lines.forEach((l) => add(l.key, l.qty))
    if (lines.length) setOpen(true)
    setNotice(missing.length
      ? `${lines.length ? 'Agregamos lo disponible. ' : ''}Ya no está disponible: ${missing.join(', ')}.`
      : '')
  }

  if (!ready) return <main className="section acc"><div className="wrap"><p className="muted">Cargando…</p></div></main>

  return (
    <main className="section acc">
      <div className="wrap acc-in">
        <a href="#top" className="back-link"><ArrowLeft size={16} /> Volver a la carta</a>

        {!user ? <Welcome /> : (
          <>
            <header className="acc-head">
              <div>
                <h1>Hola, {(user.name || 'cliente').split(' ')[0]}</h1>
                <p className="sub">Aquí ves tus pedidos y tus datos.</p>
              </div>
              <button className="link acc-out" onClick={signOut}><SignOut size={16} /> Cerrar sesión</button>
            </header>

            <div className="acc-stats">
              <div><Receipt size={22} weight="duotone" /><b>{stats.total}</b><small>pedidos</small></div>
              <div><Star size={22} weight="duotone" /><b className="ellipsis">{stats.fav || '—'}</b><small>tu favorito</small></div>
              <div><Gift size={22} weight="duotone" /><b>{live.length}</b><small>en curso</small></div>
            </div>

            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'pedidos'} className={tab === 'pedidos' ? 'tab on' : 'tab'} onClick={() => setTab('pedidos')}>Mis pedidos</button>
              <button role="tab" aria-selected={tab === 'datos'} className={tab === 'datos' ? 'tab on' : 'tab'} onClick={() => setTab('datos')}>Mis datos</button>
            </div>

            {tab === 'datos' ? <MyData /> : orders === null ? <p className="muted">Cargando tus pedidos…</p> : (
              <>
                {notice && <p className="acc-notice" role="status">{notice}</p>}
                {live.length > 0 && (
                  <section className="acc-section">
                    <h2>En curso</h2>
                    <div className="acc-live-list">{live.map((o) => <LiveOrder key={o.code} o={o} />)}</div>
                  </section>
                )}
                <section className="acc-section">
                  <h2>Historial</h2>
                  {orders.filter((o) => !isOpen(o)).length === 0 ? (
                    <div className="empty-box">
                      <p>Aún no tienes pedidos anteriores.</p>
                      <a href="#menu" className="btn primary small">Ver la carta</a>
                    </div>
                  ) : (
                    <ul className="acc-past-list">
                      {orders.filter((o) => !isOpen(o)).map((o) => <PastOrder key={o.code} o={o} onReorder={reorder} />)}
                    </ul>
                  )}
                </section>
                {!supabaseConfigurado && <p className="demo-note">Modo demo: tu cuenta y pedidos se guardan solo en este navegador.</p>}
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
