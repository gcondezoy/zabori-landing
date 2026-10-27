import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabaseConfigurado } from '../../lib/supabase'
import { isAdmin } from '../../lib/admin'
import { site } from '../../config/site'

export const DEMO_SESSION = 'zabori-admin-demo'

// Acceso al panel: PIN en modo demo; cuenta de la tabla "admins" con Supabase
export default function Gate({ onOk }) {
  const { user, ready, setModal, signOut } = useAuth()
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!supabaseConfigurado || !user) return
    let alive = true
    setChecking(true)
    isAdmin().then((ok) => { if (alive) { setChecking(false); ok ? onOk() : setErr('Esta cuenta no tiene acceso al panel.') } })
    return () => { alive = false }
  }, [user, onOk])

  if (!supabaseConfigurado) {
    const submit = (e) => {
      e.preventDefault()
      if (pin === site.adminDemoPin) {
        try { sessionStorage.setItem(DEMO_SESSION, '1') } catch {}
        onOk()
      } else setErr('PIN incorrecto.')
    }
    return (
      <form className="gate" onSubmit={submit}>
        <h2>Panel Zabori</h2>
        <p className="muted">Modo demo: ingresa el PIN de prueba (<code>{site.adminDemoPin}</code>).</p>
        <label>PIN<input type="password" value={pin} onChange={(e) => { setPin(e.target.value); setErr('') }} autoFocus /></label>
        {err && <p className="form-err" role="alert">{err}</p>}
        <button className="btn primary block">Entrar</button>
      </form>
    )
  }

  return (
    <div className="gate">
      <h2>Panel Zabori</h2>
      {!ready || checking ? <p className="muted">Verificando acceso…</p>
        : !user ? (
          <>
            <p className="muted">Inicia sesión con una cuenta de administrador.</p>
            <button className="btn primary block" onClick={() => setModal('login')}>Iniciar sesión</button>
          </>
        ) : (
          <>
            {err && <p className="form-err" role="alert">{err}</p>}
            <button className="btn ghost block" onClick={signOut}>Cambiar de cuenta</button>
          </>
        )}
    </div>
  )
}
