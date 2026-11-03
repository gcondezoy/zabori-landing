import { useEffect, useRef, useState } from 'react'
import { X } from '@phosphor-icons/react'
import { useAuth } from '../context/AuthContext'
import { listMyOrders } from '../lib/orders'
import { supabaseConfigurado } from '../lib/supabase'
import { money } from '../config/site'
import { useExit } from '../lib/useExit'

const STATUS = {
  pendiente: 'Pendiente', preparando: 'Preparando', en_camino: 'En camino',
  listo: 'Listo para recoger', entregado: 'Entregado', cancelado: 'Cancelado',
}

// Botón para volver a enviar el correo de confirmación
function ResendConfirm({ email }) {
  const { resendConfirm } = useAuth()
  const [state, setState] = useState('') // '' | 'busy' | 'sent' | mensaje de error
  const send = async () => {
    setState('busy')
    try { await resendConfirm(email); setState('sent') } catch (e) { setState(e.message) }
  }
  if (state === 'sent') return <p className="form-ok" role="status">Te lo enviamos de nuevo a {email}.</p>
  return (
    <p className="auth-resend">
      ¿No te llegó? <button type="button" className="link" disabled={state === 'busy'} onClick={send}>{state === 'busy' ? 'Enviando…' : 'Reenviar el correo'}</button>
      {state && state !== 'busy' && <span className="form-err">{state}</span>}
    </p>
  )
}

// Pedir el enlace para cambiar la contraseña
function ForgotForm() {
  const { resetPassword, setModal } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    try { await resetPassword(email.trim()); setSent(true) } catch (error) { setErr(error.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit}>
      <h3>Recupera tu contraseña</h3>
      {sent ? (
        <p className="form-ok" role="status">Si {email} tiene una cuenta, te llegará un correo con un enlace para elegir una contraseña nueva. Revisa también la carpeta de spam.</p>
      ) : (
        <>
          <p className="guest">Escribe el correo con el que te registraste y te enviamos un enlace.</p>
          <label>Correo<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          {err && <p className="form-err" role="alert">{err}</p>}
          <button className="btn primary block" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button>
        </>
      )}
      <p className="switch"><button type="button" className="link" onClick={() => setModal('login')}>Volver a iniciar sesión</button></p>
    </form>
  )
}

// Elegir la contraseña nueva (al llegar desde el correo)
function NewPasswordForm() {
  const { updatePassword, setModal, setNotice } = useAuth()
  const [f, setF] = useState({ password: '', repeat: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (f.password !== f.repeat) { setErr('Las dos contraseñas no coinciden.'); return }
    setErr(''); setBusy(true)
    try {
      await updatePassword(f.password)
      setNotice('Listo, tu contraseña quedó cambiada.')
      setModal(null)
      window.location.hash = '#/cuenta'
    } catch (error) { setErr(error.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit}>
      <h3>Elige tu nueva contraseña</h3>
      <label>Contraseña nueva<input required type="password" minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></label>
      <label>Repítela<input required type="password" minLength={6} value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value })} autoComplete="new-password" /></label>
      {err && <p className="form-err" role="alert">{err}</p>}
      <button className="btn primary block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
    </form>
  )
}

// Aviso simple (por ejemplo, un enlace de correo vencido)
function Notice() {
  const { notice, setNotice, setModal } = useAuth()
  const close = () => { setNotice(''); setModal('login') }
  return (
    <div className="auth-notice">
      <h3>Aviso</h3>
      <p>{notice}</p>
      <button className="btn primary block" onClick={close}>Ir a iniciar sesión</button>
    </div>
  )
}

function AuthForm({ mode }) {
  const { signIn, signUp, setModal } = useAuth()
  const registro = mode === 'registro'
  const [f, setF] = useState({ name: '', phone: '', email: '', password: '', marketing: false, terms: false })
  const [err, setErr] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [sentTo, setSentTo] = useState('') // correo al que se envió la confirmación
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setUnconfirmed(false); setBusy(true)
    try {
      if (registro) {
        const { needsConfirm } = await signUp({ ...f, email: f.email.trim() })
        if (needsConfirm) setSentTo(f.email.trim())
        else setModal(null)
      } else {
        await signIn({ ...f, email: f.email.trim() })
        setModal(null)
      }
    } catch (error) {
      setErr(error.message)
      setUnconfirmed(Boolean(error.unconfirmed))
    } finally {
      setBusy(false)
    }
  }

  // Cuenta creada: falta confirmar el correo
  if (sentTo) {
    return (
      <div className="auth-sent">
        <h3>Revisa tu correo</h3>
        <p>Te enviamos un enlace a <b>{sentTo}</b> para confirmar tu cuenta. Ábrelo desde este celular o computadora y entrarás directo.</p>
        <p className="muted">Si no lo ves en unos minutos, revisa la carpeta de spam o promociones.</p>
        <ResendConfirm email={sentTo} />
        <button type="button" className="btn ghost block" onClick={() => setModal(null)}>Entendido</button>
      </div>
    )
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
      {!registro && <button type="button" className="link auth-forgot" onClick={() => setModal('recuperar')}>¿Olvidaste tu contraseña?</button>}
      {registro && (
        <label className="consent">
          <input type="checkbox" required checked={f.terms} onChange={(e) => setF({ ...f, terms: e.target.checked })} />
          <span>Acepto los <a href="#/terminos" target="_blank" rel="noreferrer">Términos y Condiciones</a> y la <a href="#/privacidad" target="_blank" rel="noreferrer">Política de Privacidad</a>.</span>
        </label>
      )}
      {registro && (
        <label className="consent">
          <input type="checkbox" checked={f.marketing} onChange={(e) => setF({ ...f, marketing: e.target.checked })} />
          <span>Opcional: quiero recibir promociones y novedades de Zabori por correo. Puedo dejar de recibirlas cuando quiera.</span>
        </label>
      )}
      {err && <p className="form-err" role="alert">{err}</p>}
      {unconfirmed && <ResendConfirm email={f.email.trim()} />}
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
  const { shown, leaving } = useExit(modal)
  const lastView = useRef(null)
  if (!shown) return null
  const close = () => setModal(null)
  // Mientras sale conserva lo que mostraba: al iniciar sesión no debe asomarse otra vista
  // Cambiar la contraseña desde el correo deja una sesión abierta: esa vista va primero
  const special = modal === 'nueva-clave' || modal === 'aviso'
  if (!leaving) lastView.current = special ? modal : user ? 'cuenta' : modal === 'cuenta' ? 'login' : modal
  const view = lastView.current
  return (
    <div className={`overlay center${leaving ? ' leaving' : ''}`} onClick={close}>
      <div className="modal" role="dialog" aria-label="Cuenta" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn close" onClick={close} aria-label="Cerrar"><X size={22} /></button>
        {view === 'cuenta' ? <Account />
          : view === 'recuperar' ? <ForgotForm />
          : view === 'nueva-clave' ? <NewPasswordForm />
          : view === 'aviso' ? <Notice />
          : <AuthForm key={view} mode={view} />}
      </div>
    </div>
  )
}
