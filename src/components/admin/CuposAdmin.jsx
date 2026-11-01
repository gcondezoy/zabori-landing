import { useCallback, useEffect, useState } from 'react'
import { useMenu } from '../../context/MenuContext'
import { loadMenu, saveItemStock } from '../../lib/menu'
import { loadAvailability, loadSlotCapacities, saveSlotCapacity, slotLabel } from '../../lib/availability'

const SLOT_STATE = { open: 'Abierto', full: 'Lleno', past: 'Ya pasó', closed: 'Hoy no se atiende' }
const GROUPS = [['menu', 'Segundos del menú'], ['entrada', 'Entradas'], ['shots', 'Shots']]

function SlotRow({ slot, capacity, taken, onSaved }) {
  const [v, setV] = useState(String(capacity))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const dirty = Number(v) !== capacity || v === ''

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await saveSlotCapacity(slot.id, v); await onSaved() } catch (error) { setErr(error.message) } finally { setBusy(false) }
  }

  return (
    <form className="cu-row" onSubmit={save}>
      <b className="cu-name">{slotLabel(slot.id)}</b>
      <span className="cu-today">Hoy: <b>{taken}</b> de {capacity} pedidos</span>
      <span className={`cu-state s-${slot.status}`}>{SLOT_STATE[slot.status]}</span>
      <label className="cu-input">Cupo<input type="number" min="0" step="1" required value={v} onChange={(e) => setV(e.target.value)} aria-label={`Cupo de ${slotLabel(slot.id)}`} /></label>
      <button className="btn primary small" disabled={!dirty || busy}>{busy ? '…' : 'Guardar'}</button>
      {err && <span className="form-err">{err}</span>}
    </form>
  )
}

function StockRow({ item, sold, onSaved }) {
  const initial = item.dailyStock == null ? '' : String(item.dailyStock)
  const [v, setV] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const left = item.dailyStock == null ? null : Math.max(item.dailyStock - sold, 0)

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await saveItemStock(item.id, v); await onSaved() } catch (error) { setErr(error.message) } finally { setBusy(false) }
  }

  return (
    <form className="cu-row" onSubmit={save}>
      <b className="cu-name">{item.name}</b>
      <span className="cu-today">Hoy: <b>{sold}</b> {sold === 1 ? 'vendido' : 'vendidos'}{left !== null && ` · quedan ${left}`}</span>
      <span className={`cu-state ${left === 0 ? 's-full' : left === null ? 's-none' : 's-open'}`}>{left === 0 ? 'Agotado' : left === null ? 'Sin límite' : 'Disponible'}</span>
      <label className="cu-input">Stock<input type="number" min="0" step="1" value={v} placeholder="Sin límite" onChange={(e) => setV(e.target.value)} aria-label={`Stock por día de ${item.name}`} /></label>
      <button className="btn primary small" disabled={v === initial || busy}>{busy ? '…' : 'Guardar'}</button>
      {err && <span className="form-err">{err}</span>}
    </form>
  )
}

// Cuántos pedidos entran en cada rango de horario y cuántas unidades salen por día
export default function CuposAdmin({ orders }) {
  const { reload } = useMenu()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  const fetchAll = useCallback(async () => {
    try {
      const [avail, capacities, menu] = await Promise.all([loadAvailability(), loadSlotCapacities(), loadMenu({ includeInactive: true })])
      setData({ avail, capacities, menu: menu.filter((i) => i.active) })
      setErr('')
    } catch (e) { setErr(e.message) }
  }, [])
  useEffect(() => { fetchAll() }, [fetchAll, orders]) // los números cambian con cada pedido nuevo

  const saved = useCallback(async () => { await fetchAll(); await reload() }, [fetchAll, reload])
  const taken = data?.avail.admin?.taken || {}
  const sold = data?.avail.admin?.sold || {}

  return (
    <section className="cupos">
      <div className="section-head"><h2>Horarios y stock</h2></div>
      <p className="muted">Los números de "Hoy" se reinician solos cada día. Un pedido cancelado devuelve su cupo y sus unidades.</p>
      {err && <p className="form-err" role="alert">{err}</p>}
      {!data ? !err && <p className="muted">Cargando…</p> : (
        <>
          <div className="panel-card cu-group">
            <h3 className="card-title">Rangos de entrega</h3>
            <p className="muted bo-help">Cuántos pedidos recibes en cada rango. Se bloquea solo al llenarse y cuando llega su hora de inicio. Con 0 queda cerrado.</p>
            {data.avail.slots.map((s) => {
              const capacity = data.capacities.find((c) => c.id === s.id)?.capacity ?? 0
              return <SlotRow key={s.id + capacity} slot={s} capacity={capacity} taken={taken[s.id] || 0} onSaved={saved} />
            })}
          </div>
          {GROUPS.map(([cat, title]) => {
            const items = data.menu.filter((i) => i.cat === cat)
            if (!items.length) return null
            return (
              <div key={cat} className="panel-card cu-group">
                <h3 className="card-title">{title}</h3>
                <p className="muted bo-help">Unidades por día. Déjalo vacío si no tiene límite; con 0 se muestra agotado.</p>
                {items.map((i) => <StockRow key={i.id + i.dailyStock} item={i} sold={sold[i.id] || 0} onSaved={saved} />)}
              </div>
            )
          })}
        </>
      )}
    </section>
  )
}
