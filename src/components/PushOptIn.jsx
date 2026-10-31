import { useState } from 'react'
import { Bell, CheckCircle } from '@phosphor-icons/react'
import { enablePush, pushState } from '../lib/push'

// Ofrece recibir en el celular los cambios de estado de un pedido
export default function PushOptIn({ code, phone }) {
  const [state, setState] = useState(() => pushState(code))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (state === 'off' || state === 'unsupported') return null

  if (state === 'done') {
    return <p className="push-optin ok"><CheckCircle size={20} weight="fill" /> Te avisaremos aquí cuando cambie tu pedido.</p>
  }

  if (state === 'denied') {
    return <p className="push-optin">Las notificaciones están bloqueadas. Si las quieres, actívalas en los ajustes de tu navegador.</p>
  }

  if (state === 'ios-install') {
    return (
      <div className="push-optin">
        <p><b><Bell size={18} weight="fill" /> ¿Quieres avisos en tu iPhone?</b></p>
        <ol>
          <li>Toca <b>Compartir</b> y luego <b>Agregar a inicio</b>.</li>
          <li>Abre Zabori desde tu pantalla de inicio.</li>
          <li>Entra a <b>Sigue tu pedido</b> con el código <b>{code}</b> y activa los avisos.</li>
        </ol>
      </div>
    )
  }

  const activate = async () => {
    setBusy(true); setErr('')
    try {
      const result = await enablePush(code, phone)
      setState(result === 'granted' ? 'done' : pushState(code))
    } catch (e) {
      setErr(e.message || 'No pudimos activar los avisos.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="push-optin">
      <button type="button" className="btn ghost block" disabled={busy} onClick={activate}>
        <Bell size={18} weight="bold" /> {busy ? 'Activando…' : 'Avísame cómo va mi pedido'}
      </button>
      {err && <p className="form-err" role="alert">{err}</p>}
    </div>
  )
}
