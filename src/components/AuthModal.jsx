import { useEffect, useState } from 'react'
import { X } from '@phosphor-icons/react'
import { useAuth } from '../context/AuthContext'
import { listMyOrders } from '../lib/orders'
import { supabaseConfigurado } from '../lib/supabase'
import { money } from '../config/site'

const STATUS = {
  pendiente: 'Pendiente', preparando: 'Preparando', en_camino: 'En camino',
  listo: 'Listo para recoger', entregado: 'Entregado', cancelado: 'Cancelado',
}

function AuthForm({ mode }) {
  const { signIn, signUp, setModal } = useAuth()
  const registro = mode === 'registro'
  const [f, setF] = useState({ name: '', phone: '', email: '', password: '', marketing: false })
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setInfo(''); setBusy(true)
    try {
      if (registro) {
        const { needsConfirm } = await signUp(f)
        if (needsConfirm) setInfo('Te enviamos un correo para confirmar tu cuenta. Luego podrás iniciar sesión.')
        else setModal(null)
      } else {
        await signIn(f)
        setModal(null)
      }
    } catch (error) {
      setErr(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <h3>{registro ? 'Crea tu cuenta' : 'Inicia sesión'}</h3>
      <p className="guest">
        {registro ? 'Guarda tus datos y revisa tus pedidos. ' : ''}
        También puedes pedir sin cuenta, como invitado.
      </p>
      {registro && (
        <>
          <label>Nombre<input required value={f.name} onChange={set('name')} autoComplete="name" /></label>
          <label>Celular<input required type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></label>
        </>
      )}
      <label>Correo<input required type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
      <label>Contraseña
        <input required type="password" minLength={6} value={f.password} onChange={set('password')}
          autoComplete={registro ? 'new-password' : 'current-password'} />
      </label>
      {registro && (
        <label className="consent">
          <input type="checkbox" checked={f.marketing} onChange={(e) => setF({ ...f, marketing: e.target.checked })} />
          <span>Quiero recibir promociones y novedades de Zabori por correo. Puedo dejar de recibirlas cuando quiera.</span>
        </label>
      )}
      {err && <p className="form-err" role="alert">{err}</p>}
      {info && <p className="form-ok" role="status">{info}</p>}
      <button className="btn primary block" disabled={busy}>
        {busy ? 'Un momento…' : registro ? 'Crear cuenta' : 'Entrar'}
      </button>
      <p className="switch">
        {registro ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
        <button type="button" className="link" onClick={() => setModal(registro ? 'login' : 'registro')}>
          {registro ? 'Inicia sesión' : 'Regístrate'}
        </button>
      </p>
      {!supabaseConfigurado && <p className="demo-note">Modo demo: la cuenta se guarda solo en este navegador.</p>}
    </form>
  )
}

function Account() {
  const { user, signOut, saveProfile, setModal } = useAuth()
  const [orders, setOrders] = useState(null)
  const [f, setF] = useState({ name: user.name, phone: user.phone, address: user.address })
  const [saved, setSaved] = useState(false)
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setSaved(false) }

  useEffect(() => {
    let alive = true
    listMyOrders(user.id).then((o) => alive && setOrders(o)).catch(() => alive && setOrders([]))
    return () => { alive = false }
  }, [user.id])

  const save = async (e) => {
    e.preventDefault()
    await saveProfile(f)
    setSaved(true)
  }

  return (
    <div className="account">
      <h3>Mi cuenta</h3>
      <p className="guest">{user.email}</p>
      <form onSubmit={save}>
        <label>Nombre<input value={f.name} onChange={set('name')} /></label>
        <label>Celular<input type="tel" value={f.phone} onChange={set('phone')} /></label>
        <label>Dirección de entrega<input value={f.address} onChange={set('address')} /></label>
        <button className="btn ghost block">{saved ? 'Guardado ✓' : 'Guardar datos'}</button>
      </form>

      <h4>Mis pedidos</h4>
      {orders === null ? <p className="empty">Cargando…</p>
        : orders.length === 0 ? <p className="empty">Aún no tienes pedidos.</p>
        : (
          <ul className="orders">
            {orders.map((o) => (
              <li key={o.code}>
                <div className="row"><strong>{o.code}</strong><span>{money(o.total)}</span></div>
                <span className="muted">
                  {new Date(o.createdAt).toLocaleDateString('es-PE')} · {o.mode === 'delivery' ? 'Delivery' : 'Recojo'} · {STATUS[o.status] || o.status}
                </span>
                <span className="muted">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      <button className="btn ghost block" onClick={async () => { await signOut(); setModal(null) }}>Cerrar sesión</button>
    </div>
  )
}

export default function AuthModal() {
  const { modal, setModal, user } = useAuth()
  if (!modal) return null
  const close = () => setModal(null)
  const view = user ? 'cuenta' : modal === 'cuenta' ? 'login' : modal
  return (
    <div className="overlay center" onClick={close}>
      <div className="modal" role="dialog" aria-label="Cuenta" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn close" onClick={close} aria-label="Cerrar"><X size={22} /></button>
        {view === 'cuenta' ? <Account /> : <AuthForm key={view} mode={view} />}
      </div>
    </div>
  )
}
