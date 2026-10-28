import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Minus, ShoppingBag, ArrowCounterClockwise } from '@phosphor-icons/react'
import { useMenu } from '../context/MenuContext'
import { useCart } from '../context/CartContext'
import { chosen, buildPrice, missingGroup, cartKey } from '../lib/build'
import { money } from '../config/site'
import Reveal from './Reveal'

const hint = (g) => (g.min === 1 && g.max === 1 ? 'Elige 1' : g.min === 0 ? `Opcional · hasta ${g.max}` : `Elige de ${g.min} a ${g.max}`)

// Arma tu plato: proteína, carbohidrato, acompañamientos y cremas, con precio en vivo
export default function BuildPlate() {
  const { build } = useMenu()
  const { add, setOpen } = useCart()
  const [sel, setSel] = useState([])
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  // Si el panel oculta una opción elegida, se quita de la selección
  useEffect(() => {
    setSel((s) => s.filter((id) => build.options.some((o) => o.id === id)))
  }, [build.options])

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 4000)
    return () => clearTimeout(t)
  }, [added])

  const picked = useMemo(() => chosen(build, sel), [build, sel])
  const price = buildPrice(build, sel)
  const missing = missingGroup(build, sel)

  const toggle = (g, id) => {
    setAdded(false)
    setSel((s) => {
      const inGroup = s.filter((x) => build.options.find((o) => o.id === x)?.grp === g.id)
      if (s.includes(id)) return s.filter((x) => x !== id)
      if (g.max === 1) return [...s.filter((x) => !inGroup.includes(x)), id] // reemplaza
      if (inGroup.length >= g.max) return s // límite alcanzado
      return [...s, id]
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
        {build.groups.map((g, gi) => {
          const opts = build.options.filter((o) => o.grp === g.id)
          if (!opts.length) return null
          const count = picked.filter((o) => o.grp === g.id).length
          const full = g.max > 1 && count >= g.max
          return (
            <Reveal as="fieldset" key={g.id} className="b-step" delay={gi * 80}>
              <legend>
                <span className={`b-num${count >= Math.max(1, g.min) ? ' done' : ''}`}>
                  {count >= Math.max(1, g.min) ? <Check size={14} weight="bold" /> : gi + 1}
                </span>
                <span className="b-title">{g.label}</span>
                <span className="b-hint">{hint(g)}{g.max > 1 ? ` · ${count}/${g.max}` : ''}</span>
              </legend>
              <div className="b-options">
                {opts.map((o) => {
                  const on = sel.includes(o.id)
                  return (
                    <button key={o.id} type="button" className={`b-opt${on ? ' on' : ''}`}
                      aria-pressed={on} disabled={!on && full} onClick={() => toggle(g, o.id)}>
                      <span className="b-check" aria-hidden="true">{on && <Check size={12} weight="bold" />}</span>
                      <span className="b-name">{o.name}</span>
                      <span className="b-price">{o.price ? `+${money(o.price)}` : 'Incluido'}</span>
                    </button>
                  )
                })}
              </div>
            </Reveal>
          )
        })}
      </div>

      <aside className="b-summary" aria-live="polite">
        <div className="b-plate">
          {picked.length === 0 ? (
            <span className="b-empty">Tu plato está vacío.<br />Empieza por la proteína.</span>
          ) : (
            <ul>
              {picked.map((o) => <li key={o.id} className={`g-${o.grp}`}>{o.name}</li>)}
            </ul>
          )}
        </div>

        <div className="b-total">
          <span>Precio base {money(build.basePrice)}{price > build.basePrice ? ` + adicionales ${money(price - build.basePrice)}` : ''}</span>
          <strong>{money(price * qty)}</strong>
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
            <Check size={16} weight="bold" /> ¡Plato agregado!
            <button type="button" className="link" onClick={() => setOpen(true)}><ShoppingBag size={14} /> Ver carrito</button>
          </p>
        )}
      </aside>
    </div>
  )
}
