import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Minus, ShoppingBag, ArrowCounterClockwise, Barbell } from '@phosphor-icons/react'
import { useMenu } from '../context/MenuContext'
import { useCart } from '../context/CartContext'
import { chosen, buildPrice, missingGroup, cartKey, parseId, sizeId, hasSizes, fromPrice } from '../lib/build'
import { money } from '../config/site'
import Reveal from './Reveal'
import TaperView from './TaperView'

const hint = (g, sized) =>
  g.min === 1 && g.max === 1 ? (sized ? 'Elige 1 y su porción' : 'Elige 1') : g.min === 0 ? `Opcional · hasta ${g.max}` : `Elige de ${g.min} a ${g.max}`

// Proteína con porciones: la tarjeta muestra la foto y un botón por gramaje con su precio
function SizedOption({ o, selected, onPick }) {
  const current = selected ? parseId(selected).g : null
  return (
    <div className={`b-opt has-img has-sizes${current ? ' on' : ''}`}>
      {o.img && <img className="b-thumb" src={o.img} alt="" width="160" height="120" loading="lazy" />}
      <span className="b-name">{o.name}</span>
      <div className="b-sizes" role="group" aria-label={`Porción de ${o.name}`}>
        {o.sizes.map((s) => {
          const on = current === s.g
          return (
            <button key={s.g} type="button" className={on ? 'on' : ''} aria-pressed={on} onClick={() => onPick(sizeId(o.id, s.g))}>
              <b>{s.g} g</b><small>{money(s.price)}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Arma tu plato (fit): proteína por gramos, carbohidrato, verduras, aderezos y táper, con precio en vivo
export default function BuildPlate() {
  const { build } = useMenu()
  const { add, setOpen } = useCart()
  const [sel, setSel] = useState([])
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const optionOf = (full) => build.options.find((o) => o.id === parseId(full).id)

  // Si el panel oculta una opción o porción elegida, se quita de la selección
  useEffect(() => {
    setSel((s) => s.filter((full) => chosen(build, [full]).length === 1))
  }, [build])

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 4000)
    return () => clearTimeout(t)
  }, [added])

  const picked = useMemo(() => chosen(build, sel), [build, sel])
  const price = buildPrice(build, sel)
  const missing = missingGroup(build, sel)
  const protein = picked.find((o) => o.grp === 'proteina')

  const toggle = (g, full) => {
    setAdded(false)
    setSel((s) => {
      const inGroup = s.filter((x) => optionOf(x)?.grp === g.id)
      if (s.includes(full)) return s.filter((x) => x !== full)
      if (g.max === 1) return [...s.filter((x) => !inGroup.includes(x)), full] // reemplaza (también otra porción)
      if (inGroup.length >= g.max) return s // límite alcanzado
      return [...s, full]
    })
  }

  const addToCart = () => {
    if (missing) return
    add(cartKey(sel), qty)
    setAdded(true)
    setSel([])
    setQty(1)
  }

  if (!build.available) return <p className="muted empty-box">Hoy no está disponible "Arma tu plato".</p>

  return (
    <div className="builder">
      <div className="b-steps">
        <p className="b-intro"><Barbell size={18} weight="duotone" /><span>Fit y a tu medida: eliges la porción de proteína en gramos y todo llega en tu táper. Desde <b>{money(fromPrice(build))}</b>.</span></p>
        {build.groups.map((g, gi) => {
          const opts = build.options.filter((o) => o.grp === g.id)
          if (!opts.length) return null
          const sized = opts.some(hasSizes)
          const count = picked.filter((o) => o.grp === g.id).length
          const full = g.max > 1 && count >= g.max
          // Subgrupos (ej. vegetales Cocidos / Frescos): se muestran por separado, el máximo es del paso entero
          const subs = [...new Set(opts.map((o) => o.sub || ''))]
          const renderOpt = (o) => {
            if (hasSizes(o)) {
              return <SizedOption key={o.id} o={o} selected={sel.find((x) => parseId(x).id === o.id)} onPick={(f) => toggle(g, f)} />
            }
            const on = sel.includes(o.id)
            return (
              <button key={o.id} type="button" className={`b-opt${on ? ' on' : ''}${o.img ? ' has-img' : ''}`}
                aria-pressed={on} disabled={!on && full} onClick={() => toggle(g, o.id)}>
                {o.img && <img className="b-thumb" src={o.img} alt="" width="160" height="120" loading="lazy" />}
                <span className="b-check" aria-hidden="true">{on && <Check size={12} weight="bold" />}</span>
                <span className="b-name">{o.name}</span>
                <span className="b-price">{o.price ? `+${money(o.price)}` : 'Incluido'}</span>
              </button>
            )
          }
          const gridClass = `b-options${opts.some((o) => o.img) ? ' with-img' : ''}${sized ? ' sized' : ''}`
          return (
            <Reveal as="fieldset" key={g.id} className="b-step" delay={gi * 80}>
              <legend>
                <span className={`b-num${count >= Math.max(1, g.min) ? ' done' : ''}`}>
                  {count >= Math.max(1, g.min) ? <Check size={14} weight="bold" /> : gi + 1}
                </span>
                <span className="b-title">{g.label}</span>
                <span className="b-hint">{hint(g, sized)}{g.max > 1 ? ` · ${count}/${g.max}` : ''}</span>
              </legend>
              {subs.length > 1 && <p className="b-subnote">Puedes combinar: hasta {g.max} en total entre {subs.join(' y ').toLowerCase()}.</p>}
              {subs.length > 1 ? subs.map((sub) => (
                <div key={sub} className="b-sub">
                  <h4 className="b-subtitle">{sub}</h4>
                  <div className={gridClass}>{opts.filter((o) => (o.sub || '') === sub).map(renderOpt)}</div>
                </div>
              )) : <div className={gridClass}>{opts.map(renderOpt)}</div>}
            </Reveal>
          )
        })}
      </div>

      <aside className="b-summary" aria-live="polite">
        <TaperView picked={picked} className="b-collage" />
        <TaperView picked={picked} small className="b-collage-sm" />
        {picked.length === 0
          ? <p className="b-empty-note">Tu táper está vacío. Empieza por la proteína.</p>
          : <p className="b-picked">{picked.map((o) => o.name).join(' · ')}</p>}

        <div className="b-total">
          <span>{protein ? `${protein.baseName} ${protein.g} g · ${money(protein.price)}${price > protein.price ? ` + extras ${money(price - protein.price)}` : ''}` : `Desde ${money(fromPrice(build))}`}</span>
          <strong>{protein ? money(price * qty) : "—"}</strong>
        </div>

        <div className="b-actions">
          <div className="stepper" aria-label="Cantidad">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Uno menos"><Minus weight="bold" /></button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Uno más"><Plus weight="bold" /></button>
          </div>
          <button type="button" className="btn primary b-add" disabled={!!missing} onClick={addToCart}>
            {missing ? `Elige tu ${missing.label.toLowerCase()}` : 'Agregar al carrito'}
          </button>
        </div>

        {sel.length > 0 && (
          <button type="button" className="link b-reset" onClick={() => setSel([])}>
            <ArrowCounterClockwise size={14} /> Empezar de nuevo
          </button>
        )}
        {added && (
          <p className="b-added" role="status">
            <Check size={16} weight="bold" /> ¡Listo, va a tu carrito!
            <button type="button" className="link" onClick={() => setOpen(true)}><ShoppingBag size={14} /> Ver carrito</button>
          </p>
        )}
      </aside>
    </div>
  )
}
