// Plato fit dividido con las fotos de lo elegido:
// proteína = media luna izquierda · carbohidrato = cuarto superior · verduras = cuarto inferior
// aderezos = pocillos al borde · táper = esquina. Lo vacío muestra qué falta.
function Wedge({ cls, item, label, showLabels }) {
  return (
    <div className={`pc-w ${cls}${item ? ' filled' : ''}`}>
      {item?.img
        ? <img key={item.id} src={item.img} alt={item.name} loading="lazy" width="360" height="360" />
        : item ? <span className="pc-txt">{item.name}</span>
          : showLabels && <span className="pc-empty">{label}</span>}
    </div>
  )
}

export default function PlateCollage({ picked, small = false, className = '' }) {
  const by = (grp) => picked.filter((o) => o.grp === grp)
  const protein = by('proteina')[0]
  const carb = by('carbo')[0]
  const veg = by('acomp')
  const dips = by('crema')
  const pack = by('taper')[0]
  const showLabels = !small

  return (
    <div className={`pc${small ? ' pc-sm' : ''} ${className}`} role="img"
      aria-label={picked.length ? `Tu plato: ${picked.map((o) => o.name).join(', ')}` : 'Plato vacío'}>
      <div className="pc-plate">
        <Wedge cls="w-prot" item={protein} label="Proteína" showLabels={showLabels} />
        <Wedge cls="w-carb" item={carb} label="Carbohidrato" showLabels={showLabels} />
        {veg.length < 2
          ? <Wedge cls="w-veg" item={veg[0]} label="Verduras" showLabels={showLabels} />
          : (
            <>
              <Wedge cls="w-veg1" item={veg[0]} showLabels={false} />
              <Wedge cls="w-veg2" item={veg[1]} showLabels={false} />
            </>
          )}
        {protein?.g && !small && <span className="pc-g">{protein.g} g</span>}
      </div>
      {!small && dips.map((d, i) => (
        d.img ? <img key={d.id} className={`pc-dip dip-${i}`} src={d.img} alt={d.name} width="120" height="120" />
          : <span key={d.id} className={`pc-dip dip-${i} pc-dip-txt`}>{d.name}</span>
      ))}
      {!small && pack?.img && <img key={pack.id} className="pc-pack" src={pack.img} alt={`En ${pack.name}`} width="160" height="120" />}
    </div>
  )
}
