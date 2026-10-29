import { useState } from 'react'
import { STATUS, PAYMENT } from '../../lib/admin'
import { RANGES } from '../../lib/stats'
import { money } from '../../config/site'

export const StatusPill = ({ status }) => <span className={`pill s-${status}`}>{STATUS[status] || status}</span>
const METHOD_LABEL = { tarjeta: 'Tarjeta', yape: 'Yape', plin: 'Plin' }
// Estado del pago + medio (Yape/Plin pendientes se confirman a mano: "Por confirmar")
export const PayPill = ({ payment, method }) => {
  const wallet = method === 'yape' || method === 'plin'
  const label = wallet && payment === 'pendiente' ? 'Por confirmar' : PAYMENT[payment] || payment
  return <span className={`pill p-${payment}`}>{label}{method ? ` · ${METHOD_LABEL[method] || method}` : ''}</span>
}

export function RangeTabs({ value, onChange }) {
  return (
    <div className="seg-tabs" role="group" aria-label="Periodo">
      {RANGES.map((r) => (
        <button key={r.id} className={value === r.id ? 'on' : ''} aria-pressed={value === r.id} onClick={() => onChange(r.id)}>{r.label}</button>
      ))}
    </div>
  )
}

export function Kpi({ label, value, sub }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  )
}

// Barras verticales de una sola serie (ventas). Tooltip al pasar el mouse y tabla accesible.
export function BarChart({ data, title, valueFmt = money }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(...data.map((d) => d.total), 0)
  const peak = max > 0 ? data.findIndex((d) => d.total === max) : -1
  const step = data.length > 14 ? Math.ceil(data.length / 10) : 1 // no amontonar etiquetas

  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      {max === 0 ? <p className="muted chart-empty">Sin ventas en este periodo.</p> : (
        <div className="bars" onMouseLeave={() => setHover(null)}>
          {[0.5, 1].map((g) => <span key={g} className="grid-line" style={{ bottom: `${g * 100}%` }} aria-hidden="true" />)}
          {data.map((d, i) => (
            <div key={d.key} className={`bar-col${hover === i ? ' hot' : ''}`}
              onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              tabIndex={0} aria-label={`${d.full}: ${valueFmt(d.total)}, ${d.count} pedidos`}>
              <span className="bar" style={{ height: `${(d.total / max) * 100}%` }} />
              {i === peak && hover === null && (
                <span className="bar-peak" style={{ bottom: `calc(${(d.total / max) * 100}% + 4px)` }}>{valueFmt(d.total)}</span>
              )}
              {hover === i && (
                <span className={`tip${i > data.length * 0.66 ? ' left' : ''}`} role="tooltip"
                  style={{ bottom: `calc(${(d.total / max) * 100}% + 8px)` }}>
                  <b>{d.full}</b>{valueFmt(d.total)} · {d.count} pedido{d.count === 1 ? '' : 's'}
                </span>
              )}
              <span className="bar-x">{i % step === 0 ? d.label : ''}</span>
            </div>
          ))}
        </div>
      )}
      <details className="table-view">
        <summary>Ver como tabla</summary>
        <table>
          <thead><tr><th>Periodo</th><th>Pedidos</th><th>Ventas</th></tr></thead>
          <tbody>{data.filter((d) => d.count).map((d) => <tr key={d.key}><td>{d.full}</td><td>{d.count}</td><td>{valueFmt(d.total)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  )
}

// Barras horizontales de una sola serie (ranking de platos)
export function RankBars({ rows, title, empty }) {
  const max = Math.max(...rows.map((r) => r.qty), 0)
  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      {rows.length === 0 ? <p className="muted chart-empty">{empty}</p> : (
        <ol className="rank">
          {rows.map((r) => (
            <li key={r.name} title={`${r.name}: ${r.qty} unidades · ${money(r.revenue)}`}>
              <span className="rank-name">{r.name}</span>
              <span className="rank-track"><span className="rank-bar" style={{ width: `${(r.qty / max) * 100}%` }} /></span>
              <span className="rank-val">{r.qty} <small>{money(r.revenue)}</small></span>
            </li>
          ))}
        </ol>
      )}
    </figure>
  )
}
