import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { useMenu } from '../../context/MenuContext'
import { loadBuild, saveBuildOption, saveBasePrice } from '../../lib/build'
import { inRange } from '../../lib/stats'
import { money } from '../../config/site'

const rule = (g) => (g.min === 1 && g.max === 1 ? 'Obligatorio · elige 1' : g.min === 0 ? `Opcional · hasta ${g.max}` : `De ${g.min} a ${g.max}`)

// Cuántas veces se eligió cada opción en los últimos 30 días (por nombre, desde el detalle del pedido)
function optionCounts(orders) {
  const counts = {}
  orders.filter((o) => o.status !== 'cancelado' && inRange(o, '30d')).forEach((o) => o.items.forEach((i) => {
    if (!i.detail) return
    i.detail.split(' · ').forEach((name) => { counts[name] = (counts[name] || 0) + i.qty })
  }))
  return counts
}

function OptionRow({ opt, uses, onSaved, withImg }) {
  const [f, setF] = useState(opt)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const dirty = JSON.stringify(f) !== JSON.stringify(opt)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const save = async () => {
    setBusy(true); setErr('')
    try { await saveBuildOption(f); await onSaved() } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <div className={`bo-row${f.active ? '' : ' off'}${withImg ? ' with-img' : ''}`}>
      {withImg && (f.img ? <img className="bo-thumb" src={f.img} alt="" width="64" height="48" /> : <span className="bo-thumb empty" aria-hidden="true" />)}
      <input aria-label="Nombre de la opción" value={f.name} onChange={set('name')} />
      <label className="bo-price">+ S/<input type="number" min="0" step="0.5" value={f.price} onChange={set('price')} aria-label="Adicional" /></label>
      <span className="bo-uses" title="Veces elegida en los últimos 30 días">{uses || 0} en 30 días</span>
      <label className="chk"><input type="checkbox" checked={f.active} onChange={set('active')} /> Disponible</label>
      <button className="btn primary small" disabled={!dirty || busy || !f.name.trim()} onClick={save}>{busy ? '…' : 'Guardar'}</button>
      {withImg && (
        <input className="bo-img" aria-label="Imagen (ruta o enlace)" placeholder="/img/taper/mi-taper.webp"
          value={f.img || ''} onChange={set('img')} />
      )}
      {err && <span className="form-err">{err}</span>}
    </div>
  )
}

function NewOption({ grp, sort, onSaved }) {
  const [f, setF] = useState({ name: '', price: 0 })
  const [err, setErr] = useState('')
  const add = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await saveBuildOption({ grp, name: f.name, price: f.price, active: true, sort })
      setF({ name: '', price: 0 })
      await onSaved()
    } catch (error) { setErr(error.message) }
  }
  return (
    <form className="bo-row bo-new" onSubmit={add}>
      <input required placeholder="Nueva opción" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Nombre de la nueva opción" />
      <label className="bo-price">+ S/<input type="number" min="0" step="0.5" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} aria-label="Adicional" /></label>
      <button className="btn ghost small"><Plus size={14} weight="bold" /> Agregar</button>
      {err && <span className="form-err">{err}</span>}
    </form>
  )
}

export default function BuildAdmin({ orders }) {
  const { reload } = useMenu()
  const [build, setBuild] = useState(null)
  const [base, setBase] = useState('')
  const [savedBase, setSavedBase] = useState(false)

  const refresh = useCallback(async () => {
    const b = await loadBuild({ includeInactive: true })
    setBuild(b)
    setBase(String(b.basePrice))
    await reload() // la web pública se actualiza al instante
  }, [reload])
  useEffect(() => { refresh() }, [refresh])

  const uses = useMemo(() => optionCounts(orders || []), [orders])

  if (!build) return <p className="muted">Cargando…</p>

  const saveBase = async () => {
    await saveBasePrice(base)
    setSavedBase(true)
    await refresh()
  }

  return (
    <div className="build-admin">
      <div className="panel-card bo-base">
        <div>
          <h3 className="card-title">Precio base</h3>
          <p className="muted">Lo que cuesta el plato con opciones incluidas. Cada opción con adicional se suma a este precio.</p>
        </div>
        <label className="bo-price big">S/<input type="number" min="0" step="0.5" value={base}
          onChange={(e) => { setBase(e.target.value); setSavedBase(false) }} aria-label="Precio base" /></label>
        <button className="btn primary small" disabled={String(build.basePrice) === base} onClick={saveBase}>
          {savedBase && String(build.basePrice) === base ? 'Guardado ✓' : 'Guardar'}
        </button>
      </div>

      {build.groups.map((g) => {
        const opts = build.options.filter((o) => o.grp === g.id)
        return (
          <div key={g.id} className="panel-card bo-group">
            <div className="bo-head">
              <h3 className="card-title">{g.label}</h3>
              <span className="muted">{rule(g)} · {opts.filter((o) => o.active).length} disponibles</span>
            </div>
            {opts.map((o) => (
              <OptionRow key={o.id + JSON.stringify(o)} opt={{ ...o, img: o.img || '' }} uses={uses[o.name]} onSaved={refresh}
                withImg={opts.some((x) => x.img)} />
            ))}
            <NewOption grp={g.id} sort={opts.length + 1} onSaved={refresh} />
          </div>
        )
      })}
      <p className="muted small-note">Si una opción se agota, desmarca "Disponible": desaparece de la web y nadie puede pedirla.</p>
    </div>
  )
}
