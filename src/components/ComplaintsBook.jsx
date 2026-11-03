import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle, EnvelopeSimple, Printer } from '@phosphor-icons/react'
import { site, money } from '../config/site'
import { useAuth } from '../context/AuthContext'
import { KINDS, DOC_TYPES, RESPONSE_DAYS, createComplaint, dueDate } from '../lib/complaints'

const longDate = (d) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(new Date(d))
const dateTime = (d) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(d))

// Lo que el negocio aún no entrega se ve resaltado, igual que en Términos
const Pending = ({ value, label }) => value || <mark className="legal-todo">{label}</mark>

function Provider({ date }) {
  const { razonSocial, ruc, domicilio } = site.legal
  return (
    <dl className="lr-provider">
      <div><dt>Proveedor</dt><dd><Pending value={razonSocial} label="Razón social" /> ({site.name})</dd></div>
      <div><dt>RUC</dt><dd><Pending value={ruc} label="RUC" /></dd></div>
      <div><dt>Domicilio</dt><dd><Pending value={domicilio} label="Domicilio legal" /></dd></div>
      <div><dt>Fecha</dt><dd>{date}</dd></div>
    </dl>
  )
}

const LEGAL_NOTE = 'La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.'

function Receipt({ c }) {
  const rows = [
    ['Tipo', KINDS[c.kind].label],
    ['Nombre', c.name],
    ['Documento', `${c.docType} ${c.docNumber}`],
    ['Domicilio', c.address],
    ['Celular', c.phone],
    ['Correo', c.email],
    c.guardian && ['Padre, madre o apoderado', c.guardian],
    ['Bien contratado', `${c.itemType === 'producto' ? 'Producto' : 'Servicio'}${c.orderCode ? ` · pedido ${c.orderCode}` : ''}`],
    c.amount != null && ['Monto reclamado', money(c.amount)],
    ['Descripción', c.itemDescr],
    ['Detalle', c.detail],
    ['Pedido', c.request],
  ].filter(Boolean)

  return (
    <div className="lr-receipt">
      <div className="lr-done">
        <CheckCircle size={44} weight="fill" aria-hidden="true" />
        <div>
          <h1>Registramos tu {c.kind}</h1>
          <p>Hoja N.° <strong>{c.code}</strong> · {dateTime(c.createdAt)}</p>
        </div>
      </div>
      <p className={`lr-mail${c.emailed ? ' ok' : ''}`}>
        <EnvelopeSimple size={20} aria-hidden="true" />
        <span>{c.emailed
          ? <>Te enviamos una copia a <b>{c.email}</b>. Ahí también te llegará nuestra respuesta.</>
          : <>Guarda esta constancia con el botón de abajo. Te responderemos a <b>{c.email}</b>.</>}
        </span>
      </p>
      <p className="lr-due">Te responderemos en un plazo máximo de {RESPONSE_DAYS} días hábiles: a más tardar el <b>{longDate(dueDate(c.createdAt))}</b>.</p>

      <Provider date={longDate(c.createdAt)} />
      <dl className="lr-sheet">
        {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <p className="lr-note">{LEGAL_NOTE}</p>

      <div className="lr-actions">
        <button type="button" className="btn primary" onClick={() => window.print()}><Printer size={18} weight="bold" /> Imprimir o guardar en PDF</button>
        <a href="#top" className="btn ghost">Volver a la web</a>
      </div>
    </div>
  )
}

const empty = {
  kind: 'reclamo', name: '', docType: 'DNI', docNumber: '', address: '', phone: '', email: '', minor: false, guardian: '',
  itemType: 'producto', orderCode: '', amount: '', itemDescr: '', detail: '', request: '', accept: false,
}

export default function ComplaintsBook() {
  const { user } = useAuth()
  const [f, setF] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(null)

  useEffect(() => {
    const previous = document.title
    document.title = `Libro de Reclamaciones | ${site.name}`
    return () => { document.title = previous }
  }, [])

  // Con sesión iniciada, los datos de contacto ya vienen llenos (se pueden cambiar)
  useEffect(() => {
    if (!user) return
    setF((cur) => ({
      ...cur,
      name: cur.name || user.name || '', phone: cur.phone || user.phone || '',
      email: cur.email || user.email || '', address: cur.address || user.address || '',
    }))
  }, [user])

  const set = (k) => (e) => { setErr(''); setF((cur) => ({ ...cur, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })) }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const c = await createComplaint(f)
      setDone(c)
      window.scrollTo(0, 0)
    } catch (error) {
      setErr(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="section legal lr">
      <div className="wrap legal-in">
        <a href="#top" className="back-link lr-noprint"><ArrowLeft size={16} weight="bold" /> Volver a la web</a>
        {done ? <Receipt c={done} /> : (
          <>
            <h1>Libro de Reclamaciones</h1>
            <p className="sub">Hoja de reclamación virtual. Conforme al Código de Protección y Defensa del Consumidor, puedes registrar aquí un reclamo o una queja.</p>
            <Provider date={longDate(new Date())} />

            <form className="lr-form" onSubmit={submit} noValidate>
              <fieldset>
                <legend><span>1</span> Tus datos</legend>
                <label className="lr-wide">Nombres y apellidos<input value={f.name} onChange={set('name')} autoComplete="name" maxLength={120} required /></label>
                <div className="lr-doc">
                  <label>Documento
                    <select value={f.docType} onChange={set('docType')}>{DOC_TYPES.map((d) => <option key={d}>{d}</option>)}</select>
                  </label>
                  <label>Número<input value={f.docNumber} onChange={set('docNumber')} inputMode={f.docType === 'DNI' || f.docType === 'RUC' ? 'numeric' : 'text'} maxLength={15} required /></label>
                </div>
                <label>Celular<input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" maxLength={20} required /></label>
                <label className="lr-wide">Correo<input type="email" value={f.email} onChange={set('email')} autoComplete="email" maxLength={120} required /></label>
                <label className="lr-wide">Domicilio<input value={f.address} onChange={set('address')} autoComplete="street-address" maxLength={200} required /></label>
                <label className="consent lr-wide"><input type="checkbox" checked={f.minor} onChange={set('minor')} /><span>Soy menor de edad</span></label>
                {f.minor && <label className="lr-wide">Nombre del padre, madre o apoderado<input value={f.guardian} onChange={set('guardian')} maxLength={120} required /></label>}
              </fieldset>

              <fieldset>
                <legend><span>2</span> Qué contrataste</legend>
                <div className="seg lr-wide">
                  {[['producto', 'Producto'], ['servicio', 'Servicio']].map(([v, l]) => (
                    <label key={v} className={f.itemType === v ? 'on' : ''}>
                      <input type="radio" name="itemType" value={v} checked={f.itemType === v} onChange={set('itemType')} /> {l}
                    </label>
                  ))}
                </div>
                <label>Código del pedido (opcional)<input value={f.orderCode} onChange={set('orderCode')} maxLength={20} placeholder="Ej. ZAB-4F2K9" /></label>
                <label>Monto reclamado (opcional)<input type="number" inputMode="decimal" min="0" step="0.01" value={f.amount} onChange={set('amount')} placeholder="S/" /></label>
                <label className="lr-wide">Descripción<input value={f.itemDescr} onChange={set('itemDescr')} maxLength={500} placeholder="Ej. Menú del día con delivery" required /></label>
              </fieldset>

              <fieldset>
                <legend><span>3</span> Tu reclamo o queja</legend>
                <div className="lr-kinds lr-wide" role="radiogroup" aria-label="Tipo">
                  {Object.entries(KINDS).map(([id, k]) => (
                    <label key={id} className={f.kind === id ? 'on' : ''}>
                      <input type="radio" name="kind" value={id} checked={f.kind === id} onChange={set('kind')} />
                      <span><b>{k.label}</b><small>{k.help}</small></span>
                    </label>
                  ))}
                </div>
                <label className="lr-wide">Detalle<textarea rows={4} value={f.detail} onChange={set('detail')} maxLength={2000} placeholder="Qué pasó, cuándo y cómo" required /></label>
                <label className="lr-wide">Tu pedido<textarea rows={2} value={f.request} onChange={set('request')} maxLength={1000} placeholder="Qué solicitas para resolverlo" required /></label>
              </fieldset>

              <p className="lr-note">
                Te responderemos por correo en un plazo máximo de {RESPONSE_DAYS} días hábiles. {LEGAL_NOTE}
              </p>
              <label className="consent">
                <input type="checkbox" checked={f.accept} onChange={set('accept')} required />
                <span>Declaro que los datos son verdaderos y acepto que se usen para atender esta hoja, según la <a href="#/privacidad" target="_blank" rel="noreferrer">Política de Privacidad</a>.</span>
              </label>
              {err && <p className="form-err" role="alert">{err}</p>}
              <button className="btn primary block" disabled={busy || !f.accept}>{busy ? 'Registrando…' : `Enviar ${KINDS[f.kind].label.toLowerCase()}`}</button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
