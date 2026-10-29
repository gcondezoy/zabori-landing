import { useEffect, useRef, useState } from 'react'
import { taperArt, DEFAULT_TAPER } from '../data/taperArt'

// Vista del táper real visto desde arriba (dark kitchen: el pedido llega en un envase, no en un plato).
// La imagen del táper vacío va de fondo y cada ingrediente "cae" en su compartimento con una animación;
// al quitarlo se desvanece. Las posiciones de los compartimentos están en data/taperArt.js.

const LEAVE_MS = 320

// Mantiene un momento los elementos que se quitan, para animar su salida
function useLeaving(items) {
  const [list, setList] = useState(() => items.map((it) => ({ it, leaving: false })))
  const timers = useRef({})
  const latest = useRef(items)
  latest.current = items
  const key = items.map((i) => i.id).join(',') // solo reacciona cuando cambia lo elegido

  useEffect(() => {
    const items = latest.current
    setList((prev) => {
      const ids = new Set(items.map((i) => i.id))
      const next = items.map((it) => ({ it, leaving: false }))
      prev.forEach((p, idx) => {
        if (!ids.has(p.it.id)) {
          next.splice(Math.min(idx, next.length), 0, { it: p.it, leaving: true })
          clearTimeout(timers.current[p.it.id])
          timers.current[p.it.id] = setTimeout(() => {
            setList((cur) => cur.filter((c) => !(c.leaving && c.it.id === p.it.id)))
          }, LEAVE_MS)
        }
      })
      return next
    })
  }, [key])

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])
  return list
}

function Food({ list, empty, small }) {
  const live = list.filter((x) => !x.leaving).length
  return (
    <>
      {list.length === 0 && !small && <span className="tv-empty">{empty}</span>}
      <div className="tv-food" data-n={Math.max(live, 1)}>
        {list.map(({ it, leaving }, i) => (
          <span key={it.id} className={`tv-bite${leaving ? ' out' : ''}`} style={{ animationDelay: leaving ? '0ms' : `${i * 60}ms` }}>
            {it.img ? <img src={it.img} alt={it.name} width="360" height="360" /> : <small>{it.name}</small>}
          </span>
        ))}
      </div>
    </>
  )
}

// Posición relativa dentro del círculo (bowl) o de la imagen completa
const pos = (s, round) => {
  if (!round) return { left: `${s.l}%`, top: `${s.t}%`, width: `${s.w}%`, height: `${s.h}%`, borderRadius: s.r }
  return {
    left: `${((s.l - round.l) / round.w) * 100}%`, top: `${((s.t - round.t) / round.h) * 100}%`,
    width: `${(s.w / round.w) * 100}%`, height: `${(s.h / round.h) * 100}%`, borderRadius: s.r,
  }
}

export default function TaperView({ picked, small = false, className = '' }) {
  const by = (...grps) => picked.filter((o) => grps.includes(o.grp))
  const protein = by('proteina')[0]
  const pack = by('taper')[0]
  const packId = pack?.baseId || pack?.id
  const art = taperArt[packId] || taperArt[DEFAULT_TAPER]

  const main = useLeaving(protein ? [protein] : [])
  const carb = useLeaving(by('carbo').slice(0, 1))
  const veg = useLeaving(by('acomp', 'fresco').slice(0, 4))
  const dips = useLeaving(by('crema'))

  const slots = (
    <>
      <div className="tv-slot" style={pos(art.slots.main, art.round)}>
        <Food list={main} empty="Proteína" small={small} />
      </div>
      <div className="tv-slot" style={pos(art.slots.carb, art.round)}><Food list={carb} empty="Carbohidrato" small={small} /></div>
      <div className="tv-slot" style={pos(art.slots.veg, art.round)}><Food list={veg} empty="Vegetales" small={small} /></div>
    </>
  )

  return (
    <div className={`tv${small ? ' tv-sm' : ''}${art.round ? ' tv-round' : ''} ${className}`} role="img"
      aria-label={picked.length ? `Tu táper: ${picked.map((o) => o.name).join(', ')}` : 'Táper vacío'}>
      <div className="tv-stage" style={{ aspectRatio: art.aspect }}>
        <img key={art.img} className="tv-bg" src={art.img} alt="" />
        {art.round
          ? <div className="tv-round-in" style={{ left: `${art.round.l}%`, top: `${art.round.t}%`, width: `${art.round.w}%`, height: `${art.round.h}%` }}>{slots}</div>
          : slots}
        {/* Gramos de la proteína: sobre su compartimento (fuera del recorte del bowl) */}
        {protein?.g && !small && (
          <span className="tv-g" key={protein.id}
            style={art.round ? { left: '2%', top: '4%' } : { left: `${art.slots.main.l + 2}%`, top: `${art.slots.main.t + 3}%` }}>
            {protein.g} g
          </span>
        )}
      </div>
      {!small && dips.length > 0 && (
        <div className="tv-dips">
          {dips.map(({ it, leaving }) => (
            <span key={it.id} className={`tv-dip${leaving ? ' out' : ''}`} title={it.name}>
              {it.img ? <img src={it.img} alt={it.name} width="120" height="120" /> : <small>{it.name}</small>}
            </span>
          ))}
        </div>
      )}
      {!small && <span className="tv-name">{pack ? pack.name : 'Elige tu táper al final'}</span>}
    </div>
  )
}
