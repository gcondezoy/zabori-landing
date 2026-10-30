import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { useMenu } from '../../context/MenuContext'
import { loadMenu, saveMenuItem, saveMenuPrice, menuPrice } from '../../lib/menu'
import { inRange, unitsByName } from '../../lib/stats'
import { categories as allCategories } from '../../data/menu'
import BuildAdmin from './BuildAdmin'

// "Arma tu plato" se administra en su propia pestaña, no como un plato más
const categories = allCategories.filter((c) => c.id !== 'arma')
import { money } from '../../config/site'

// Los menús del día no llevan precio propio: usan el precio único de la carta
const withPrice = (item, unico) => (item.cat === 'menu' ? { ...item, price: unico } : item)

const empty = { name: '', desc: '', cat: 'menu', price: '', active: true, tag: '' }

function ItemCard({ item, sold, unico, onSaved }) {
  const [f, setF] = useState(item)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(item)
  const set = (k) => (e) => { setSaved(false); setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }) }

  const save = async () => {
    setBusy(true); setErr('')
    try { await saveMenuItem(withPrice(f, unico)); setSaved(true); await onSaved() } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className={`m-card${f.active ? '' : ' off'}`}>
      <span className="m-swatch" style={{ background: item.tone }} aria-hidden="true" />
      <div className="m-fields">
        <label className="m-name">Nombre<input value={f.name} onChange={set('name')} /></label>
        {f.cat === 'menu'
          ? <span className="m-price m-fixed">Precio<b>{money(unico)}</b><small>precio único</small></span>
          : <label className="m-price">Precio (S/)<input type="number" min="0" step="0.5" value={f.price} onChange={set('price')} /></label>}
        <label className="m-desc">Descripción / entrada y segundo<input value={f.desc} onChange={set('desc')} /></label>
        <label>Categoría
          <select value={f.cat} onChange={set('cat')}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label>Etiqueta<input value={f.tag} onChange={set('tag')} placeholder="Ej. Más pedido" /></label>
      </div>
      <div className="m-side">
        <span className="m-sold"><b>{sold.d7}</b> vendidos en 7 días<br /><small>{sold.d30} en 30 días</small></span>
        <label className="chk"><input type="checkbox" checked={f.active} onChange={set('active')} /> Visible en la web</label>
        <button className="btn primary small" disabled={!dirty || busy} onClick={save}>{busy ? 'Guardando…' : saved && !dirty ? 'Guardado ✓' : 'Guardar'}</button>
        {err && <span className="form-err">{err}</span>}
      </div>
    </div>
  )
}

// Precio único de todos los menús del día
function MenuPriceBox({ price, onSaved }) {
  const [v, setV] = useState(String(price))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)
  const dirty = Number(v) !== price

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await saveMenuPrice(v); setSaved(true); await onSaved() } catch (error) { setErr(error.message) } finally { setBusy(false) }
  }

  return (
    <form className="menu-price-box" onSubmit={save}>
      <label>Precio del menú del día
        <span className="bo-price big">S/<input type="number" min="0" step="0.5" required value={v}
          onChange={(e) => { setSaved(false); setV(e.target.value) }} /></span>
      </label>
      <p className="muted">Es el mismo para todos los menús. "Arma tu plato" y los shots tienen su propio precio.</p>
      <button className="btn primary small" disabled={!dirty || busy}>{busy ? 'Guardando…' : saved && !dirty ? 'Guardado ✓' : 'Guardar precio'}</button>
      {err && <span className="form-err">{err}</span>}
    </form>
  )
}

export default function MenuAdmin({ orders }) {
  const { reload } = useMenu()
  const [list, setList] = useState(null)
  const [cat, setCat] = useState('todas')
  const [draft, setDraft] = useState(empty)
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')

  const refresh = useCallback(async () => {
    setList((await loadMenu({ includeInactive: true })).filter((i) => i.cat !== 'arma'))
    await reload() // la web pública muestra los cambios al instante
  }, [reload])
  useEffect(() => { refresh() }, [refresh])

  const sold = useMemo(() => {
    const all = orders || []
    return { d7: unitsByName(all.filter((o) => inRange(o, '7d'))), d30: unitsByName(all.filter((o) => inRange(o, '30d'))) }
  }, [orders])

  const unico = menuPrice(list || [])

  const add = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await saveMenuItem(withPrice({ ...draft, sort: (list?.length || 0) + 1 }, unico))
      setDraft({ ...empty, cat: draft.cat })
      setAdding(false)
      await refresh()
    } catch (error) { setErr(error.message) }
  }

  const shown = (list || []).filter((i) => cat === 'todas' || i.cat === cat)
  const hidden = (list || []).filter((i) => !i.active).length

  return (
    <section>
      <div className="section-head">
        <h2>Carta</h2>
        <button className="btn primary small" onClick={() => setAdding((v) => !v)}><Plus size={16} weight="bold" /> Agregar plato</button>
      </div>
      <p className="muted">
        {list ? `${list.length} platos · ${hidden} oculto${hidden === 1 ? '' : 's'}. ` : ''}
        Los cambios se ven de inmediato en la web; un plato oculto no se puede pedir.
      </p>

      {adding && (
        <form className="m-card new" onSubmit={add}>
          <div className="m-fields">
            <label className="m-name">Nombre<input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus /></label>
            {draft.cat === 'menu'
              ? <span className="m-price m-fixed">Precio<b>{money(unico)}</b><small>precio único</small></span>
              : <label className="m-price">Precio (S/)<input required type="number" min="0" step="0.5" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></label>}
            <label className="m-desc">Descripción / entrada y segundo<input value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} /></label>
            <label>Categoría
              <select value={draft.cat} onChange={(e) => setDraft({ ...draft, cat: e.target.value })}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label>Etiqueta<input value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} placeholder="Opcional" /></label>
          </div>
          <div className="m-side">
            <button className="btn primary small">Agregar a la carta</button>
            <button type="button" className="btn ghost small" onClick={() => setAdding(false)}>Cancelar</button>
            {err && <span className="form-err">{err}</span>}
          </div>
        </form>
      )}

      {list && (cat === 'todas' || cat === 'menu') && <MenuPriceBox price={unico} onSaved={refresh} />}

      <div className="tabs">
        {[{ id: 'todas', label: 'Todas' }, ...categories, { id: 'arma', label: 'Arma tu plato' }].map((c) => (
          <button key={c.id} className={cat === c.id ? 'tab on' : 'tab'} onClick={() => setCat(c.id)}>
            {c.label}{c.id !== 'arma' && ` (${(list || []).filter((i) => c.id === 'todas' || i.cat === c.id).length})`}
          </button>
        ))}
      </div>

      {cat === 'arma' ? <BuildAdmin orders={orders} /> : list === null ? <p className="muted">Cargando…</p> : shown.map((i) => (
        <ItemCard key={i.id + JSON.stringify(i)} item={i} unico={unico} onSaved={refresh}
          sold={{ d7: sold.d7[i.name] || 0, d30: sold.d30[i.name] || 0 }} />
      ))}
    </section>
  )
}
