import { useCallback, useEffect, useState } from 'react'
import { EnvelopeSimple } from '@phosphor-icons/react'
import { money } from '../../config/site'
import { KINDS, RESPONSE_DAYS, answerComplaint, businessDaysLeft, dueDate, listComplaints } from '../../lib/complaints'

const FILTERS = [['pendiente', 'Por responder'], ['respondido', 'Respondidos'], ['todos', 'Todos']]
const day = (d) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(d))
const dateTime = (d) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d))

function Deadline({ c }) {
  if (c.status === 'respondido') return <span className="lr-badge done">Respondido {day(c.respondedAt)}</span>
  const left = businessDaysLeft(c.createdAt)
  const label = left < 0 ? `Vencido hace ${-left} día${left === -1 ? '' : 's'} hábil${left === -1 ? '' : 'es'}`
    : left === 0 ? 'Vence hoy'
    : `Quedan ${left} día${left === 1 ? '' : 's'} hábil${left === 1 ? '' : 'es'}`
  return <span className={`lr-badge${left <= 3 ? ' late' : ''}`} title={`Fecha límite: ${day(dueDate(c.createdAt))}`}>{label}</span>
}

// Por si el correo automático no está activo: abre el correo del negocio con la respuesta lista
const mailto = (c, text) => `mailto:${c.email}?subject=${encodeURIComponent(`Respuesta a tu ${c.kind} · Hoja ${c.code}`)}&body=${encodeURIComponent(`Hola, ${c.name.split(/\s+/)[0]}.\n\nRespecto a tu ${c.kind} registrado en la hoja ${c.code} el ${day(c.createdAt)}:\n\n${text}\n\nZabori`)}`

function Sheet({ c, onSaved }) {
  const [text, setText] = useState(c.response)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const save = async (e) => {
    e.preventDefault()
    if (!window.confirm(`¿Guardar esta respuesta y enviarla a ${c.email}? Luego no se podrá cambiar.`)) return
    setBusy(true); setErr('')
    try { const sent = await answerComplaint(c.code, text); await onSaved({ c, text: text.trim(), sent }) } catch (error) { setErr(error.message) } finally { setBusy(false) }
  }

  const rows = [
    ['Documento', `${c.docType} ${c.docNumber}`], ['Celular', c.phone], ['Correo', c.email], ['Domicilio', c.address],
    c.guardian && ['Apoderado', c.guardian],
    ['Bien', `${c.itemType === 'producto' ? 'Producto' : 'Servicio'}${c.orderCode ? ` · pedido ${c.orderCode}` : ''}`],
    c.amount != null && ['Monto', money(c.amount)],
    ['Descripción', c.itemDescr], ['Detalle', c.detail], ['Pide', c.request],
  ].filter(Boolean)

  return (
    <details className="lr-adm">
      <summary>
        <span className="lr-adm-main">
          <b>{c.code}</b>
          <span className={`lr-kind k-${c.kind}`}>{KINDS[c.kind].label}</span>
          <span className="lr-adm-name">{c.name}</span>
        </span>
        <span className="lr-adm-side">
          <small>{dateTime(c.createdAt)}</small>
          <Deadline c={c} />
        </span>
      </summary>
      <dl className="lr-adm-sheet">
        {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      {c.status === 'respondido' ? (
        <div className="lr-adm-answer">
          <h4>Respuesta del {dateTime(c.respondedAt)}</h4>
          <p>{c.response}</p>
          <a className="btn ghost small" href={mailto(c, c.response)}><EnvelopeSimple size={16} /> Enviar desde mi correo</a>
        </div>
      ) : (
        <form className="lr-adm-form" onSubmit={save}>
          <label>Respuesta y acciones tomadas
            <textarea rows={4} maxLength={3000} value={text} onChange={(e) => { setErr(''); setText(e.target.value) }}
              placeholder="Qué revisaron, qué solución se da y cuándo" />
          </label>
          {err && <p className="form-err" role="alert">{err}</p>}
          <button className="btn primary small" disabled={busy || text.trim().length < 10}>{busy ? 'Guardando…' : 'Guardar y enviar respuesta'}</button>
        </form>
      )}
    </details>
  )
}

export default function ReclamosAdmin({ onChange }) {
  const [list, setList] = useState(null)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('pendiente')
  const [notice, setNotice] = useState(null) // última respuesta guardada: { c, text, sent }

  const refresh = useCallback(async () => {
    try { setList(await listComplaints()); setErr('') } catch (e) { setList([]); setErr(e.message) }
    onChange?.()
  }, [onChange])
  useEffect(() => { refresh() }, [refresh])

  const pending = (list || []).filter((c) => c.status === 'pendiente')
  const late = pending.filter((c) => businessDaysLeft(c.createdAt) <= 3).length
  const shown = (list || []).filter((c) => filter === 'todos' || c.status === filter)

  return (
    <section>
      <div className="section-head">
        <h2>Libro de Reclamaciones</h2>
        <div className="seg-tabs" role="group" aria-label="Filtro">
          {FILTERS.map(([id, label]) => (
            <button key={id} className={filter === id ? 'on' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
      </div>
      <p className="muted">
        {list && pending.length > 0 && <><b>{pending.length} por responder{late ? `, ${late} con 3 días hábiles o menos` : ''}.</b> </>}
        Hay que responder en un máximo de {RESPONSE_DAYS} días hábiles. Las hojas no se borran: la ley pide guardarlas al menos 2 años.
      </p>
      {err && <p className="form-err" role="alert">{err}</p>}
      {notice && (
        <p className={`lr-adm-notice${notice.sent ? ' ok' : ''}`} role="status">
          {notice.sent
            ? <>Respuesta a la hoja {notice.c.code} guardada y enviada a {notice.c.email}.</>
            : <>Respuesta a la hoja {notice.c.code} guardada, pero el correo automático no está activo.{' '}
              <a href={mailto(notice.c, notice.text)}>Enviarla desde mi correo</a></>}
        </p>
      )}
      {list === null ? <p className="muted">Cargando…</p>
        : shown.length === 0 && !err ? <p className="muted empty-box">{filter === 'pendiente' ? 'No hay reclamos por responder.' : 'Aún no hay hojas aquí.'}</p>
        : shown.map((c) => <Sheet key={c.code + c.status} c={c} onSaved={async (n) => { setNotice(n); await refresh() }} />)}
    </section>
  )
}
