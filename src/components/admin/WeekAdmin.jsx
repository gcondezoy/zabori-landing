import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, ArrowDown, ForkKnife, PencilSimple, Plus, X } from '@phosphor-icons/react'
import { useMenu } from '../../context/MenuContext'
import { loadMenu, saveMenuItem, menuPrice } from '../../lib/menu'
import { DAY_NAMES, DEFAULT_DRINK, loadDrinks, loadWeek, menuDay, saveDrink, saveWeekDay, weekDays } from '../../lib/week'
import { inRange, unitsByName } from '../../lib/stats'
import { ItemCard } from './MenuAdmin'

const cap = (s) => s[0].toUpperCase() + s.slice(1)

const LISTS = {
  menu: {
    title: 'Segundos', firstLabel: 'Primero en la web', emptyText: 'Este día no tiene segundos. Los clientes verán "Aún no publicamos los menús de este día".',
    newTitle: 'Crear un segundo nuevo', namePh: 'Nombre, ej. Ají de gallina', descPh: 'Descripción, ej. Con arroz y papa sancochada',
  },
  entrada: {
    title: 'Entradas', firstLabel: 'Primera de la lista', emptyText: 'Este día no tiene entradas: el cliente solo elegirá su segundo.',
    newTitle: 'Crear una entrada nueva', namePh: 'Nombre, ej. Sopa de casa', descPh: 'Descripción (opcional)',
  },
}

// Una lista del día (segundos o entradas): orden, quitar, agregar y crear
function DayList({ cat, day, ids, options, unico, sold, editing, setEditing, onChange, onCreate, onSaved }) {
  const t = LISTS[cat]
  const [draft, setDraft] = useState({ name: '', desc: '' })
  const dayName = DAY_NAMES[day]
  const byId = Object.fromEntries(options.map((m) => [m.id, m]))
  const free = options.filter((m) => !ids.includes(m.id))

  const move = (from, to) => {
    const next = [...ids]
    next.splice(to, 0, next.splice(from, 1)[0])
    onChange(next)
  }

  const create = async (e) => {
    e.preventDefault()
    if (await onCreate(cat, draft)) setDraft({ name: '', desc: '' })
  }

  return (
    <div className="wk-block">
      <h3>{t.title}</h3>
      {ids.length === 0
        ? <p className="wk-empty">{t.emptyText}</p>
        : (
          <ol className="wk-list">
            {ids.map((id, i) => {
              const m = byId[id]
              return (
                <li key={id}>
                  <div className={`wk-row${m.active ? '' : ' off'}`}>
                    <span className="wk-pos">{i + 1}</span>
                    {cat === 'menu' && (m.img
                      ? <img className="wk-thumb" src={m.img} alt="" width="72" height="54" />
                      : <span className="wk-thumb empty" style={{ background: m.tone }}><ForkKnife size={20} weight="duotone" /></span>)}
                    <div className="wk-info">
                      <b>{m.name}</b>
                      {i === 0 && <span className="wk-first">{t.firstLabel}</span>}
                      {!m.active && <span className="wk-off">Oculto</span>}
                      {m.desc && <small>{m.desc}</small>}
                    </div>
                    <div className="wk-actions">
                      {i > 0 && <button className="btn ghost small" onClick={() => move(i, 0)}>Poner primero</button>}
                      <button className="wk-icon" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Subir ${m.name}`}><ArrowUp size={16} weight="bold" /></button>
                      <button className="wk-icon" disabled={i === ids.length - 1} onClick={() => move(i, i + 1)} aria-label={`Bajar ${m.name}`}><ArrowDown size={16} weight="bold" /></button>
                      <button className="wk-icon" onClick={() => setEditing(editing === id ? null : id)} aria-expanded={editing === id} aria-label={`Editar ${m.name}`}><PencilSimple size={16} weight="bold" /></button>
                      <button className="wk-icon" onClick={() => onChange(ids.filter((x) => x !== id))} aria-label={`Quitar ${m.name} del ${dayName}`}><X size={16} weight="bold" /></button>
                    </div>
                  </div>
                  {editing === id && (
                    <ItemCard key={JSON.stringify(m)} item={m} unico={unico}
                      sold={{ d7: sold.d7[m.name] || 0, d30: sold.d30[m.name] || 0 }}
                      onSaved={onSaved} />
                  )}
                </li>
              )
            })}
          </ol>
        )}

      {free.length > 0 && (
        <div className="wk-add">
          <h4>Agregar al {dayName}</h4>
          <div className="wk-chips">
            {free.map((m) => (
              <button key={m.id} className="wk-chip" onClick={() => onChange([...ids, m.id])}><Plus size={14} weight="bold" /> {m.name}</button>
            ))}
          </div>
        </div>
      )}

      <form className="wk-add wk-new" onSubmit={create}>
        <h4>{t.newTitle} para el {dayName}</h4>
        <div className="wk-new-fields">
          <input required placeholder={t.namePh} aria-label={`${t.newTitle}: nombre`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input placeholder={t.descPh} aria-label={`${t.newTitle}: descripción`} value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} />
          <button className="btn primary small">Crear y agregar</button>
        </div>
        {cat === 'menu' && <p className="muted">Luego puedes subirle foto con el lápiz.</p>}
      </form>
    </div>
  )
}

// Bebida del día: viene incluida, el cliente solo la ve
function DrinkBox({ day, value, onSave }) {
  const [v, setV] = useState(value)
  const [saved, setSaved] = useState(false)
  const dirty = v.trim() !== value

  useEffect(() => { setV(value) }, [value]) // al copiar de otro día

  const save = async (e) => {
    e.preventDefault()
    if (await onSave(day, v)) setSaved(true)
  }

  return (
    <form className="wk-drink" onSubmit={save}>
      <label>Bebida del día (viene incluida, el cliente no la elige)
        <input value={v} placeholder={DEFAULT_DRINK} onChange={(e) => { setSaved(false); setV(e.target.value) }} />
      </label>
      <button className="btn primary small" disabled={!dirty}>{saved && !dirty ? 'Guardado ✓' : 'Guardar'}</button>
    </form>
  )
}

// Menú semanal: segundos, entradas y bebida de cada día. Listas y orden se guardan al instante.
export default function WeekAdmin({ orders }) {
  const { reload } = useMenu()
  const [items, setItems] = useState(null)
  const [unico, setUnico] = useState(0)
  const [week, setWeek] = useState({})
  const [drinks, setDrinks] = useState({})
  const [day, setDay] = useState(() => menuDay().day)
  const [editing, setEditing] = useState(null)
  const [err, setErr] = useState('')
  const queue = useRef(Promise.resolve()) // los guardados van en orden aunque se hagan varios clics seguidos

  const refresh = useCallback(async () => {
    const [all, w, d] = await Promise.all([loadMenu({ includeInactive: true }), loadWeek(), loadDrinks()])
    setItems(all.filter((i) => i.cat === 'menu' || i.cat === 'entrada'))
    setUnico(menuPrice(all))
    setWeek(w || {})
    setDrinks(d)
    await reload() // la web pública muestra los cambios al instante
  }, [reload])
  useEffect(() => { refresh() }, [refresh])

  const sold = useMemo(() => {
    const all = orders || []
    return { d7: unitsByName(all.filter((o) => inRange(o, '7d'))), d30: unitsByName(all.filter((o) => inRange(o, '30d'))) }
  }, [orders])

  if (!items) return <section><h2>Menú semanal</h2><p className="muted">Cargando…</p></section>

  const ofCat = (cat) => items.filter((i) => i.cat === cat)
  const idsOf = (d, cat) => (week[d] || []).filter((id) => ofCat(cat).some((m) => m.id === id))
  const live = menuDay().day === day

  const save = (d, next) => {
    setWeek((w) => ({ ...w, [d]: next }))
    setErr('')
    queue.current = queue.current
      .then(() => saveWeekDay(d, next))
      .then(reload)
      .catch((e) => { setErr(e.message); refresh() })
  }
  // Cambia una lista del día sin tocar la otra
  const changeList = (cat) => (ids) => save(day, cat === 'menu' ? [...ids, ...idsOf(day, 'entrada')] : [...idsOf(day, 'menu'), ...ids])

  const create = async (cat, draft) => {
    setErr('')
    try {
      const id = await saveMenuItem({ ...draft, cat, price: cat === 'menu' ? unico : 0, active: true, tag: '', img: '', sort: items.length + 1 })
      await saveWeekDay(day, cat === 'menu' ? [...idsOf(day, 'menu'), id, ...idsOf(day, 'entrada')] : [...idsOf(day, 'menu'), ...idsOf(day, 'entrada'), id])
      await refresh()
      return true
    } catch (error) { setErr(error.message); return false }
  }

  const changeDrink = async (d, name) => {
    setErr('')
    try {
      await saveDrink(d, name)
      setDrinks((x) => ({ ...x, [d]: name.trim() }))
      await reload()
      return true
    } catch (error) { setErr(error.message); return false }
  }

  const copyFrom = async (e) => {
    const from = Number(e.target.value)
    e.target.value = ''
    if ((week[day] || []).length && !window.confirm(`Esto reemplaza el menú del ${DAY_NAMES[day]} por el del ${DAY_NAMES[from]}. ¿Continuar?`)) return
    save(day, week[from] || [])
    if ((drinks[from] || '') !== (drinks[day] || '')) await changeDrink(day, drinks[from] || '')
  }

  const listProps = { day, unico, sold, editing, setEditing, onCreate: create, onSaved: async () => { await refresh(); setEditing(null) } }

  return (
    <section className="week">
      <div className="section-head"><h2>Menú semanal</h2></div>
      <p className="muted">Cada día eliges los segundos, las entradas y la bebida. El cliente arma su menú con una entrada y un segundo. Se repite cada semana hasta que lo cambies.</p>

      <div className="tabs">
        {weekDays().map((d) => (
          <button key={d} className={d === day ? 'tab on' : 'tab'} onClick={() => { setDay(d); setEditing(null) }}>
            {cap(DAY_NAMES[d])}
          </button>
        ))}
      </div>

      <div className="wk-head">
        <h3>{cap(DAY_NAMES[day])}</h3>
        {live && <span className="wk-live">Es el que se ve ahora en la web</span>}
        <label className="wk-copy">
          <select defaultValue="" onChange={copyFrom} aria-label={`Copiar el menú de otro día al ${DAY_NAMES[day]}`}>
            <option value="" disabled>Copiar de otro día…</option>
            {weekDays().filter((d) => d !== day).map((d) => <option key={d} value={d}>{cap(DAY_NAMES[d])}</option>)}
          </select>
        </label>
      </div>
      {err && <p className="form-err" role="alert">{err}</p>}

      <DrinkBox key={day} day={day} value={drinks[day] || ''} onSave={changeDrink} />
      <DayList {...listProps} cat="entrada" ids={idsOf(day, 'entrada')} options={ofCat('entrada')} onChange={changeList('entrada')} />
      <DayList {...listProps} cat="menu" ids={idsOf(day, 'menu')} options={ofCat('menu')} onChange={changeList('menu')} />
    </section>
  )
}
