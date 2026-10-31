import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { deletePromo, loadPromos, promoStatus, savePromo } from '../../lib/promos'
import { PhotoField } from './MenuAdmin'

const STATUS = { live: 'Se ve ahora', soon: 'Programada', past: 'Vencida', off: 'Oculta' }
const empty = { title: '', desc: '', img: '', startsOn: '', endsOn: '', active: true }

function PromoCard({ promo, onSaved, onCancel }) {
  const [f, setF] = useState(promo)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)
  const isNew = !promo.id
  const dirty = JSON.stringify(f) !== JSON.stringify(promo)
  const status = promoStatus(f)
  const change = (patch) => { setSaved(false); setErr(''); setF((x) => ({ ...x, ...patch })) }
  const set = (k) => (e) => change({ [k]: e.target.value })

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await savePromo(f); setSaved(true); await onSaved() } catch (error) { setErr(error.message) } finally { setBusy(false) }
  }

  const remove = async () => {
    if (!window.confirm(`¿Eliminar la promoción "${promo.title}"?`)) return
    setBusy(true); setErr('')
    try { await deletePromo(promo.id); await onSaved() } catch (error) { setErr(error.message); setBusy(false) }
  }

  return (
    <form className={`m-card promo-card${isNew ? ' new' : ''}${status === 'live' ? '' : ' off'}`} onSubmit={save}>
      <div className="m-fields">
        <PhotoField value={f.img} onChange={(img) => change({ img })} />
        <label className="promo-wide">Título<input required maxLength={80} value={f.title} onChange={set('title')} placeholder="Ej. Martes de ají de gallina" autoFocus={isNew} /></label>
        <label className="promo-wide">Descripción<textarea rows={2} maxLength={300} value={f.desc} onChange={set('desc')} placeholder="Qué incluye y cómo se aprovecha" /></label>
        <label>Desde (opcional)<input type="date" value={f.startsOn} max={f.endsOn || undefined} onChange={set('startsOn')} /></label>
        <label>Hasta (opcional)<input type="date" value={f.endsOn} min={f.startsOn || undefined} onChange={set('endsOn')} /></label>
      </div>
      <div className="m-side">
        <span className={`promo-status s-${status}`}>{STATUS[status]}</span>
        <label className="chk"><input type="checkbox" checked={f.active} onChange={(e) => change({ active: e.target.checked })} /> Visible para clientes</label>
        <button className="btn primary small" disabled={(!dirty && !isNew) || busy}>{busy ? 'Guardando…' : isNew ? 'Publicar' : saved && !dirty ? 'Guardado ✓' : 'Guardar'}</button>
        {isNew
          ? <button type="button" className="btn ghost small" onClick={onCancel}>Cancelar</button>
          : <button type="button" className="m-delete" disabled={busy} onClick={remove}><Trash size={14} /> Eliminar</button>}
        {err && <span className="form-err">{err}</span>}
      </div>
    </form>
  )
}

export default function PromosAdmin() {
  const [list, setList] = useState(null)
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')

  const refresh = useCallback(async () => {
    try { setList(await loadPromos({ all: true })); setErr('') } catch (e) { setList([]); setErr(e.message) }
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const live = (list || []).filter((p) => promoStatus(p) === 'live').length

  return (
    <section>
      <div className="section-head">
        <h2>Promociones</h2>
        <button className="btn primary small" onClick={() => setAdding((v) => !v)}><Plus size={16} weight="bold" /> Agregar</button>
      </div>
      <p className="muted">
        {list ? `${live} visible${live === 1 ? '' : 's'} ahora. ` : ''}
        Los clientes las ven en su cuenta. Solo informan: el precio del pedido no cambia solo, así que un descuento habría que coordinarlo con el cliente.
      </p>
      {err && <p className="form-err" role="alert">{err}</p>}

      {adding && <PromoCard promo={empty} onCancel={() => setAdding(false)} onSaved={async () => { setAdding(false); await refresh() }} />}

      {list === null ? <p className="muted">Cargando…</p>
        : list.length === 0 && !adding && !err ? <p className="muted empty-box">Aún no hay promociones. Publica la primera con "Agregar".</p>
        : list.map((p) => <PromoCard key={p.id + JSON.stringify(p)} promo={p} onSaved={refresh} />)}
    </section>
  )
}
