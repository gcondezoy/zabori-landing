import { useMemo, useState } from 'react'
import { MagnifyingGlass, WhatsappLogo, CaretDown, CaretUp } from '@phosphor-icons/react'
import { customers, timeAgo, fmtDateTime } from '../../lib/stats'
import { money } from '../../config/site'
import { StatusPill } from './ui'

const SORTS = [
  { id: 'reciente', label: 'Más recientes' },
  { id: 'pedidos', label: 'Más pedidos' },
  { id: 'gasto', label: 'Mayor gasto' },
]

const waLink = (phone) => {
  const d = phone.replace(/\D/g, '')
  return `https://wa.me/${d.length === 9 ? '51' + d : d}`
}

export default function Customers({ orders, onOpen }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('reciente')
  const [openKey, setOpenKey] = useState(null)
  const all = useMemo(() => customers(orders || []), [orders])

  const shown = all
    .filter((c) => !q || `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === 'pedidos' ? b.count - a.count : sort === 'gasto' ? b.spent - a.spent : new Date(b.last) - new Date(a.last))

  const repeat = all.filter((c) => c.count > 1).length

  if (!orders) return <p className="muted">Cargando…</p>

  return (
    <section>
      <div className="section-head">
        <h2>Clientes</h2>
        <p className="muted">{all.length} cliente{all.length === 1 ? '' : 's'} · {repeat} volvieron a pedir</p>
      </div>

      <div className="toolbar">
        <label className="search">
          <MagnifyingGlass size={18} aria-hidden="true" />
          <input type="search" placeholder="Buscar por nombre, celular o correo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar clientes" />
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar">
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {shown.length === 0 ? <p className="muted empty-box">Aún no hay clientes. Aparecerán aquí con su primer pedido.</p> : (
        <ul className="clist">
          {shown.map((c) => {
            const open = openKey === c.key
            return (
              <li key={c.key} className={open ? 'open' : ''}>
                <button className="c-row" onClick={() => setOpenKey(open ? null : c.key)} aria-expanded={open}>
                  <span className="c-main">
                    <b>{c.name}</b>
                    <span className="sub">{c.phone}{c.registered ? ' · con cuenta' : ''}</span>
                  </span>
                  <span className="c-stat"><b>{c.count}</b><span className="sub">pedidos</span></span>
                  <span className="c-stat"><b>{money(c.spent)}</b><span className="sub">gastado</span></span>
                  <span className="c-stat hide-sm"><b>{c.favorite}</b><span className="sub">favorito</span></span>
                  <span className="c-stat hide-sm"><b>{timeAgo(c.last)}</b><span className="sub">último</span></span>
                  {open ? <CaretUp size={18} /> : <CaretDown size={18} />}
                </button>
                {open && (
                  <div className="c-detail">
                    <p className="c-links">
                      <a href={waLink(c.phone)} target="_blank" rel="noreferrer"><WhatsappLogo size={16} /> WhatsApp</a>
                      {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                    </p>
                    <ul className="mini-list">
                      {c.orders.map((o) => (
                        <li key={o.code}>
                          <button onClick={() => onOpen(o.code)}>
                            <span><b>{o.code}</b> · {fmtDateTime(o.createdAt)} · {money(o.total)}</span>
                            <span className="mini-meta"><StatusPill status={o.status} /></span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
