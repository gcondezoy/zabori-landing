import { useMemo, useState } from 'react'
import { isOpen, isUnpaid, STATUS } from '../../lib/admin'
import { inRange, summarize, salesSeries, topItems, timeAgo } from '../../lib/stats'
import { money } from '../../config/site'
import { Kpi, RangeTabs, BarChart, RankBars, StatusPill, PayPill } from './ui'

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

export default function Dashboard({ orders, onOpen }) {
  const [range, setRange] = useState('hoy')
  const list = useMemo(() => (orders || []).filter((o) => inRange(o, range)), [orders, range])
  const s = useMemo(() => summarize(list), [list])
  const series = useMemo(() => salesSeries(list, range), [list, range])
  const top = useMemo(() => topItems(list, 8), [list])
  const open = (orders || []).filter(isOpen)
  const byStatus = ['pendiente', 'preparando', 'en_camino', 'listo'].map((k) => [k, open.filter((o) => o.status === k).length])

  if (!orders) return <p className="muted">Cargando…</p>

  return (
    <section className="dash">
      <div className="section-head">
        <h2>Resumen</h2>
        <RangeTabs value={range} onChange={setRange} />
      </div>

      <div className="kpis">
        <Kpi label="Ventas" value={money(s.sales)} sub={`${s.count} pedido${s.count === 1 ? '' : 's'}`} />
        <Kpi label="Cobrado" value={money(s.paid)} sub={s.pending > 0 ? `${money(s.pending)} por cobrar` : 'Todo cobrado'} />
        <Kpi label="Ticket promedio" value={money(s.avg)} sub={`${s.dishes} platos vendidos`} />
        <Kpi label="Delivery / Recojo" value={`${pct(s.delivery, s.count)}% / ${pct(s.recojo, s.count)}%`}
          sub={`${s.delivery} delivery · ${s.recojo} recojo${s.cancelled ? ` · ${s.cancelled} cancelado${s.cancelled > 1 ? 's' : ''}` : ''}`} />
      </div>

      <div className="dash-grid">
        <div className="panel-card wide">
          <BarChart data={series} title={range === 'hoy' ? 'Ventas por hora (hoy)' : 'Ventas por día'} />
        </div>
        <div className="panel-card">
          <RankBars rows={top} title="Platos más vendidos" empty="Aún no hay ventas en este periodo." />
        </div>
        <div className="panel-card">
          <h3 className="card-title">En curso ahora</h3>
          <div className="status-row">
            {byStatus.map(([k, n]) => (
              <div key={k} className="status-box"><strong>{n}</strong><span>{STATUS[k]}</span></div>
            ))}
          </div>
          {open.length === 0 ? <p className="muted">No hay pedidos en curso.</p> : (
            <ul className="mini-list">
              {open.slice(0, 6).map((o) => (
                <li key={o.code}>
                  <button onClick={() => onOpen(o.code)}>
                    <span><b>{o.code}</b> · {o.name}</span>
                    <span className="mini-meta"><StatusPill status={o.status} />{isUnpaid(o) && <PayPill payment={o.payment} />}<em>{timeAgo(o.createdAt)}</em></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
