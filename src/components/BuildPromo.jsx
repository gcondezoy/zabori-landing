import { useCallback, useEffect, useMemo, useState } from 'react'
import { CookingPot, Grains, Carrot, Drop, Package, Shuffle, ArrowRight } from '@phosphor-icons/react'
import { useMenu } from '../context/MenuContext'
import { chosen, buildPrice, hasSizes, sizeId, fromPrice } from '../lib/build'
import PlateCollage from './PlateCollage'
import { money, site } from '../config/site'
import Reveal from './Reveal'

const ICONS = { proteina: CookingPot, carbo: Grains, acomp: Carrot, crema: Drop, taper: Package }
const INTERVAL = 3200

// Evento para que la carta abra la pestaña "Arma tu plato"
export const OPEN_BUILD_EVENT = 'zabori:open-build'

const reducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

// Combinación válida al azar: respeta mínimos y máximos de cada grupo
function randomCombo(build) {
  const ids = []
  build.groups.forEach((g) => {
    const opts = build.options.filter((o) => o.grp === g.id).sort(() => Math.random() - 0.5)
    const n = g.min + Math.floor(Math.random() * (Math.min(g.max, opts.length) - g.min + 1))
    // Las opciones con porción se eligen con un gramaje al azar ("p-pollo@180")
    ids.push(...opts.slice(0, n).map((o) => (hasSizes(o) ? sizeId(o.id, o.sizes[Math.floor(Math.random() * o.sizes.length)].g) : o.id)))
  })
  return ids
}

export default function BuildPromo() {
  const { build } = useMenu()
  const [combo, setCombo] = useState([])
  const [paused, setPaused] = useState(false)
  const [tick, setTick] = useState(0)

  const shuffle = useCallback(() => { setCombo(randomCombo(build)); setTick((t) => t + 1) }, [build])

  useEffect(() => { shuffle() }, [shuffle])

  useEffect(() => {
    if (paused || reducedMotion()) return
    const t = setTimeout(shuffle, INTERVAL)
    return () => clearTimeout(t)
  }, [tick, paused, shuffle])

  const picked = useMemo(() => chosen(build, combo), [build, combo])
  const protein = picked.find((o) => o.grp === 'proteina')

  const openBuilder = (e) => {
    e.preventDefault()
    window.dispatchEvent(new Event(OPEN_BUILD_EVENT))
    document.getElementById('menu')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' })
  }

  if (!build.available || !build.options.length) return null

  return (
    <section className="promo" id="arma-tu-plato" aria-labelledby="promo-title">
      <div className="wrap promo-in">
        <Reveal className="promo-copy">
          <p className="eyebrow">Arma tu plato fit</p>
          <h2 id="promo-title">Tú eliges, nosotros lo cocinamos.</h2>
          <p className="promo-lead">
            {site.slogan}: elige tu proteína por gramos, tu carbohidrato, verduras y aderezos.
            Pagas según tu porción, desde <strong>{money(fromPrice(build))}</strong>.
          </p>
          <ol className="promo-steps">
            {build.groups.map((g, i) => {
              const Icon = ICONS[g.id] || CookingPot
              const n = build.options.filter((o) => o.grp === g.id).length
              return (
                <li key={g.id}>
                  <span className="ps-icon"><Icon size={20} weight="duotone" /></span>
                  <span className="ps-text"><b>{i + 1}. {g.label}</b><small>{n} opciones · {g.min ? `elige ${g.max === 1 ? 1 : `hasta ${g.max}`}` : `opcional, hasta ${g.max}`}</small></span>
                </li>
              )
            })}
          </ol>
          <a href="#menu" className="btn promo-cta" onClick={openBuilder}>Armar el mío <ArrowRight weight="bold" /></a>
        </Reveal>

        <Reveal className="promo-demo" delay={150}>
          <div className="combo" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <span className="combo-label">Por ejemplo…</span>
            <PlateCollage key={tick} picked={picked} className="combo-collage" />
            <p className="combo-list">{picked.filter((o) => o.grp !== 'taper').map((o) => o.name).join(' · ')}</p>
            <div className="combo-foot">
              <span className="combo-price" aria-live="polite">
                <small>{protein ? `${protein.baseName} ${protein.g} g` : 'Tu combinación'}</small>
                <strong>{money(buildPrice(build, combo))}</strong>
              </span>
              <button type="button" className="combo-shuffle" onClick={shuffle}>
                <Shuffle size={18} weight="bold" /> Otra combinación
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
