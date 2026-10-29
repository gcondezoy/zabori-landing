import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import { useMenu } from '../../context/MenuContext'
import { loadBuild, saveBuildOption, saveBasePrice, hasSizes } from '../../lib/build'
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

const DEFAULT_SIZES = [{ g: 120, price: 15 }, { g: 180, price: 18 }, { g: 250, price: 22 }]

// Veces pedida (30 días). Con porciones se suman todas: "Pechuga de pollo 120 g", "… 180 g"…
function usesOf(o, counts) {
  if (!hasSizes(o)) return counts[o.name] || 0
  return o.sizes.reduce((sum, s) => sum + (counts[`${o.name} ${s.g} g`] || 0), 0)
}

// Editor de porciones: gramos → precio del plato
function SizesEditor({ sizes, onChange }) {
  const set = (i, k, v) => onChange(sizes.map((s, j) => (j === i ? { ...s, [k]: v } : s)))
  return (
    <div className="bo-sizes">
      {sizes.map((s, i) => (
        <span key={i} className="bo-size">
          <input type="number" min="1" step="10" value={s.g} onChange={(e) => set(i, 'g', e.target.value)} aria-label="Gramos" />
          <small>g →</small>
          <span className="bo-price">S/<input type="number" min="0" step="0.5" value={s.price} onChange={(e) => set(i, 'price', e.target.value)} aria-label="Precio de la porción" /></span>
          <button type="button" className="icon-btn" onClick={() => onChange(sizes.filter((_, j) => j !== i))} aria-label="Quitar porción" disabled={sizes.length <= 1}><X size={14} /></button>
        </span>
      ))}
      <button type="button" className="btn ghost small" onClick={() => onChange([...sizes, { g: (Number(sizes.at(-1)?.g) || 100) + 50, price: Number(sizes.at(-1)?.price) || 15 }])}>
        <Plus size={14} weight="bold" /> Porción
      </button>
    </div>
  )
}

function OptionRow({ opt, uses, onSaved, withImg, sized, subs }) {
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
      {subs && (
        <select className="bo-sub" value={f.sub || subs[0]} onChange={set('sub')} aria-label="Subgrupo">
          {subs.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      )}
      {sized
        ? <span className="bo-uses">Según porción</span>
        : <label className="bo-price">+ S/<input type="number" min="0" step="0.5" value={f.price} onChange={set('price')} aria-label="Adicional" /></label>}
      <span className="bo-uses" title="Veces elegida en los últimos 30 días">{uses || 0} en 30 días</span>
      <label className="chk"><input type="checkbox" checked={f.active} onChange={set('active')} /> Disponible</label>
      <button className="btn primary small" disabled={!dirty || busy || !f.name.trim()} onClick={save}>{busy ? '…' : 'Guardar'}</button>
      {sized && <SizesEditor sizes={f.sizes || []} onChange={(sizes) => setF({ ...f, sizes })} />}
      {withImg && (
        <input className="bo-img" aria-label="Imagen (ruta o enlace)" placeholder="/img/arma/mi-foto.webp"
          value={f.img || ''} onChange={set('img')} />
      )}
      {err && <span className="form-err">{err}</span>}
    </div>
  )
}

function NewOption({ grp, sort, onSaved, sized, subs }) {
  const [f, setF] = useState({ name: '', price: 0, sub: subs ? subs[0] : '' })
  const [err, setErr] = useState('')
  const add = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await saveBuildOption({ grp, name: f.name, sub: f.sub, price: sized ? 0 : f.price, active: true, sort, sizes: sized ? DEFAULT_SIZES : [] })
      setF({ name: '', price: 0, sub: f.sub })
      await onSaved()
    } catch (error) { setErr(error.message) }
  }
  return (
    <form className="bo-row bo-new" onSubmit={add}>
      <input required placeholder="Nueva opción" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Nombre de la nueva opción" />
      {subs && (
        <select className="bo-sub" value={f.sub} onChange={(e) => setF({ ...f, sub: e.target.value })} aria-label="Subgrupo">
          {subs.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      )}
      {sized
        ? <span className="bo-uses">Con porciones 120 / 180 / 250 g (editables)</span>
        : <label className="bo-price">+ S/<input type="number" min="0" step="0.5" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} aria-label="Adicional" /></label>}
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
          <h3 className="card-title">Adicional fijo (opcional)</h3>
          <p className="muted">El precio del plato sale de la porción de proteína elegida, más los adicionales. Usa este monto solo si quieres sumar algo fijo a todos los platos (normalmente S/ 0).</p>
        </div>
        <label className="bo-price big">S/<input type="number" min="0" step="0.5" value={base}
          onChange={(e) => { setBase(e.target.value); setSavedBase(false) }} aria-label="Precio base" /></label>
        <button className="btn primary small" disabled={String(build.basePrice) === base} onClick={saveBase}>
          {savedBase && String(build.basePrice) === base ? 'Guardado ✓' : 'Guardar'}
        </button>
      </div>

      {build.groups.map((g) => {
        const opts = build.options.filter((o) => o.grp === g.id)
        const subList = [...new Set(opts.map((o) => o.sub).filter(Boolean))]
        const subs = subList.length ? subList : null // ej. vegetales: Cocidos / Frescos
        return (
          <div key={g.id} className="panel-card bo-group">
            <div className="bo-head">
              <h3 className="card-title">{g.label}</h3>
              <span className="muted">{rule(g)} · {opts.filter((o) => o.active).length} disponibles</span>
            </div>
            {opts.map((o) => (
              <OptionRow key={o.id + JSON.stringify(o)} opt={{ ...o, img: o.img || '', sizes: o.sizes || [] }} uses={usesOf(o, uses)} onSaved={refresh}
                withImg={opts.some((x) => x.img)} sized={hasSizes(o)} subs={subs} />
            ))}
            <NewOption grp={g.id} sort={opts.length + 1} onSaved={refresh} sized={opts.some(hasSizes)} subs={subs} />
          </div>
        )
      })}
      <p className="muted small-note">Si una opción se agota, desmarca "Disponible": desaparece de la web y nadie puede pedirla.</p>
    </div>
  )
}
