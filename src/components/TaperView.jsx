// Vista desde arriba del táper con lo elegido (dark kitchen: el pedido llega en un envase, no en un plato).
// Compartimento grande = proteína · arriba = carbohidrato · abajo = vegetales cocidos y frescos
// salseritos al lado = aderezos. La forma cambia según el táper: bagazo, reutilizable o bowl kraft.
const STYLE = { 't-kraft': 'bowl', 't-reutilizable': 'clear', 't-bagazo': 'bagazo' }

function Slot({ cls, items, label, small }) {
  return (
    <div className={`tv-c ${cls}${items.length ? ' filled' : ''}`} data-n={items.length}>
      {items.length
        ? items.map((o) => (o.img
          ? <img key={o.id} src={o.img} alt={o.name} loading="lazy" width="360" height="360" />
          : <span key={o.id} className="tv-txt">{o.name}</span>))
        : !small && <span className="tv-empty">{label}</span>}
    </div>
  )
}

export default function TaperView({ picked, small = false, className = '' }) {
  const by = (...grps) => picked.filter((o) => grps.includes(o.grp))
  const protein = by('proteina')[0]
  const pack = by('taper')[0]
  const veg = by('acomp', 'fresco').slice(0, 4)
  const dips = by('crema')
  const style = STYLE[pack?.baseId || pack?.id] || 'bagazo'

  return (
    <div className={`tv tv-${style}${small ? ' tv-sm' : ''} ${className}`} role="img"
      aria-label={picked.length ? `Tu táper: ${picked.map((o) => o.name).join(', ')}` : 'Táper vacío'}>
      <div className="tv-box">
        <div className="tv-in">
          <Slot cls="c-main" items={protein ? [protein] : []} label="Proteína" small={small} />
          <Slot cls="c-carb" items={by('carbo').slice(0, 1)} label="Carbohidrato" small={small} />
          <Slot cls="c-veg" items={veg} label="Vegetales" small={small} />
        </div>
        {protein?.g && !small && <span className="tv-g">{protein.g} g</span>}
      </div>
      {!small && dips.length > 0 && (
        <div className="tv-dips">
          {dips.map((d) => (
            <span key={d.id} className="tv-dip" title={d.name}>
              {d.img ? <img src={d.img} alt={d.name} width="120" height="120" /> : <small>{d.name}</small>}
            </span>
          ))}
        </div>
      )}
      {!small && pack && <span className="tv-name">{pack.name}</span>}
    </div>
  )
}
