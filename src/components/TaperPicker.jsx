import { useEffect, useState } from 'react'
import { X, Check, Plus, Minus } from '@phosphor-icons/react'
import { useCart } from '../context/CartContext'
import { useMenu } from '../context/MenuContext'
import { taperOptions, taperKey } from '../lib/build'
import { money } from '../config/site'

// Al agregar un menú del día: elegir en qué táper se envía (con su costo)
export default function TaperPicker() {
  const { pickFor: item, setPickFor, add } = useCart()
  const { build } = useMenu()
  const [taper, setTaper] = useState(null)
  const [qty, setQty] = useState(1)

  useEffect(() => { setTaper(null); setQty(1) }, [item])

  useEffect(() => {
    if (!item) return
    const onKey = (e) => e.key === 'Escape' && setPickFor(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, setPickFor])

  if (!item) return null
  const options = taperOptions(build)
  const chosen = options.find((t) => t.id === taper)
  const unit = item.price + (chosen?.price || 0)
  const close = () => setPickFor(null)

  const confirm = () => {
    if (!chosen) return
    add(taperKey(item.id, chosen.id), qty)
    close()
  }

  return (
    <div className="overlay center" onClick={close}>
      <div className="modal taper-modal" role="dialog" aria-label={`Elige el táper para ${item.name}`} onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn close" onClick={close} aria-label="Cerrar"><X size={22} /></button>
        <div className="tp-head">
          {item.img && <img src={item.img} alt="" width="72" height="54" />}
          <div>
            <small>¿En qué táper lo quieres?</small>
            <h3>{item.name}</h3>
            <span className="muted">{money(item.price)} + táper</span>
          </div>
        </div>

        <div className="b-options with-img tp-options" role="radiogroup" aria-label="Tipo de táper">
          {options.map((t) => {
            const on = taper === t.id
            return (
              <button key={t.id} type="button" role="radio" aria-checked={on}
                className={`b-opt has-img${on ? ' on' : ''}`} onClick={() => setTaper(t.id)}>
                {t.img && <img className="b-thumb" src={t.img} alt="" width="160" height="120" />}
                <span className="b-check" aria-hidden="true">{on && <Check size={12} weight="bold" />}</span>
                <span className="b-name">{t.name}</span>
                <span className="b-price">{t.price ? `+${money(t.price)}` : 'Incluido'}</span>
              </button>
            )
          })}
        </div>

        <div className="tp-foot">
          <div className="stepper" aria-label="Cantidad">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Uno menos"><Minus weight="bold" /></button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Uno más"><Plus weight="bold" /></button>
          </div>
          <button type="button" className="btn primary tp-add" disabled={!chosen} onClick={confirm}>
            {chosen ? `Agregar · ${money(unit * qty)}` : 'Elige tu táper'}
          </button>
        </div>
      </div>
    </div>
  )
}
