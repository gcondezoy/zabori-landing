import { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlass, DownloadSimple, Motorcycle, Storefront } from '@phosphor-icons/react'
import { STATUS, PAYMENT, isOpen, isUnpaid } from '../../lib/admin'
import { inRange, ordersCSV, download, timeAgo } from '../../lib/stats'
import { money } from '../../config/site'
import { RangeTabs, StatusPill, PayPill } from './ui'
import OrderDetail from './OrderDetail'

const VIEWS = [
  { id: 'activos', label: 'En curso', test: isOpen },
  { id: 'cobrar', label: 'Por cobrar', test: isUnpaid },
  { id: 'entregados', label: 'Entregados', test: (o) => o.status === 'entregado' },
  { id: 'cancelados', label: 'Cancelados', test: (o) => o.status === 'cancelado' },
  { id: 'todos', label: 'Todos', test: () => true },
]

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function Orders({ orders, refresh, focusCode, onFocusDone }) {
  const [view, setView] = useState('activos')
  const [range, setRange] = useState('todo')
  const [q, setQ] = useState('')
  const [mode, setMode] = useState('todos')
  const [openCode, setOpenCode] = useState(null)

  // Llegar desde Resumen o Clientes con un pedido concreto
  useEffect(() => {
    if (focusCode) { setOpenCode(focusCode); onFocusDone() }
  }, [focusCode, onFocusDone])

  const base = useMemo(() => (orders || []).filter((o) => inRange(o, range)
    && (mode === 'todos' || o.mode === mode)
    && (!q || norm(`${o.code} ${o.name} ${o.phone} ${o.address}`).includes(norm(q)))), [orders, range, mode, q])

  const shown = base.filter(VIEWS.find((v) => v.id === view).test)
  const current = (orders || []).find((o) => o.code === openCode)

  const exportCSV = () => {
    const d = new Date().toISOString().slice(0, 10)
    download(`zabori-pedidos-${d}.csv`, ordersCSV(shown, STATUS, PAYMENT))
  }

  if (!orders) return <p className="muted">Cargando…</p>

  return (
    <section>
      <div className="section-head">
        <h2>Pedidos</h2>
        <RangeTabs value={range} onChange={setRange} />
      </div>

      <div className="toolbar">
        <label className="search">
          <MagnifyingGlass size={18} aria-hidden="true" />
          <input type="search" placeholder="Buscar por código, nombre, celular o dirección" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar pedidos" />
        </label>
        <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Modalidad">
          <option value="todos">Delivery y recojo</option>
          <option value="delivery">Solo delivery</option>
          <option value="recojo">Solo recojo</option>
        </select>
        <button className="btn ghost small" onClick={exportCSV} disabled={!shown.length}>
          <DownloadSimple size={16} weight="bold" /> Exportar a Excel
        </button>
      </div>

      <div className="tabs">
        {VIEWS.map((v) => (
          <button key={v.id} className={view === v.id ? 'tab on' : 'tab'} onClick={() => setView(v.id)}>
            {v.label} ({base.filter(v.test).length})
          </button>
        ))}
      </div>

      {shown.length === 0 ? <p className="muted empty-box">No hay pedidos con estos filtros.</p> : (
        <div className="table-wrap">
          <table className="otable">
            <thead>
              <tr><th>Pedido</th><th>Cliente</th><th>Modalidad</th><th>Detalle</th><th className="num">Total</th><th>Pago</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.code} onClick={() => setOpenCode(o.code)} tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpenCode(o.code))}
                  className={o.status === 'cancelado' ? 'dim' : ''} aria-label={`Abrir pedido ${o.code}`}>
                  <td data-label="Pedido"><b>{o.code}</b><span className="sub">{timeAgo(o.createdAt)}</span></td>
                  <td data-label="Cliente">{o.name}<span className="sub">{o.phone}</span></td>
                  <td data-label="Modalidad">
                    <span className="mode">{o.mode === 'delivery' ? <><Motorcycle size={16} /> Delivery</> : <><Storefront size={16} /> Recojo</>}</span>
                  </td>
                  <td data-label="Detalle" className="items-cell">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</td>
                  <td data-label="Total" className="num"><b>{money(o.total)}</b></td>
                  <td data-label="Pago"><PayPill payment={o.payment} method={o.method} /></td>
                  <td data-label="Estado"><StatusPill status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {current && <OrderDetail order={current} onClose={() => setOpenCode(null)} refresh={refresh} />}
    </section>
  )
}
