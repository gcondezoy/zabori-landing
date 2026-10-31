import { useEffect, useState } from 'react'
import { X, Check, Plus, Minus, Drop } from '@phosphor-icons/react'
import { useCart } from '../context/CartContext'
import { useMenu } from '../context/MenuContext'
import { taperOptions, menuKey } from '../lib/build'
import { money } from '../config/site'

// Al agregar un menú del día: el cliente elige su entrada y su táper; la bebida ya viene incluida
export default function MenuPicker() {
  const { pickFor: item, setPickFor, add, setOpen } = useCart()
  const { build, entradas, drink } = useMenu()
  const [taper, setTaper] = useState(null)
  const [entrada, setEntrada] = useState(null)
  const [qty, setQty] = useState(1)

  useEffect(() => { setTaper(null); setEntrada(null); setQty(1) }, [item])

  useEffect(() => {
    if (!item) return
    const onKey = (e) => e.key === 'Escape' && setPickFor(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, setPickFor])

  if (!item) return null
  const options = taperOptions(build)
  const chosen = options.find((t) => t.id === taper)
  // Con una sola entrada no hay nada que elegir
  const pickedEntrada = entradas.length === 1 ? entradas[0] : entradas.find((e) => e.id === entrada)
  const missing = entradas.length && !pickedEntrada ? 'Elige tu entrada' : options.length && !chosen ? 'Elige tu táper' : ''
  const unit = item.price + (chosen?.price || 0)
  const close = () => setPickFor(null)

  const confirm = () => {
    if (missing) return
    add(menuKey(item.id, chosen?.id, pickedEntrada?.id), qty)
    close()
    setOpen(true) // con el plato principal elegido, el siguiente paso suele ser pagar
  }

  return (
    <div className="overlay center" onClick={close}>
      <div className="modal taper-modal" role="dialog" aria-label={`Arma tu menú con ${item.name}`} onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn close" onClick={close} aria-label="Cerrar"><X size={22} /></button>
        <div className="tp-head">
          {item.img && <img src={item.img} alt="" width="72" height="54" />}
          <div>
            <small>Tu segundo</small>
            <h3>{item.name}</h3>
            <span className="muted">{money(item.price)} con entrada y bebida</span>
          </div>
        </div>

        {entradas.length > 0 && (
          <div className="tp-step">
            <h4>{entradas.length === 1 ? 'Tu entrada' : 'Elige tu entrada'}</h4>
            <div className="b-options tp-entradas" role="radiogroup" aria-label="Entrada">
              {entradas.map((e) => {
                const on = pickedEntrada?.id === e.id
                return (
                  <button key={e.id} type="button" role="radio" aria-checked={on}
                    className={`b-opt single${on ? ' on' : ''}`} onClick={() => setEntrada(e.id)}>
                    <span className="b-check" aria-hidden="true">{on && <Check size={12} weight="bold" />}</span>
                    <span className="b-name">{e.name}{e.desc && <small>{e.desc}</small>}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <p className="tp-drink"><Drop size={18} weight="fill" aria-hidden="true" /> <span>Bebida incluida: <b>{drink}</b></span></p>

        {options.length > 0 && (
          <div className="tp-step">
            <h4>¿En qué táper lo quieres?</h4>
            <div className="b-options with-img tp-options" role="radiogroup" aria-label="Tipo de táper">
              {options.map((t) => {
                const on = taper === t.id
                return (
                  <button key={t.id} type="button" role="radio" aria-checked={on}
                    className={`b-opt has-img single${on ? ' on' : ''}`} onClick={() => setTaper(t.id)}>
                    {t.img && <img className="b-thumb" src={t.img} alt="" width="160" height="120" />}
                    <span className="b-check" aria-hidden="true">{on && <Check size={12} weight="bold" />}</span>
                    <span className="b-name">{t.name}</span>
                    <span className="b-price">{t.price ? `+${money(t.price)}` : 'Incluido'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="tp-foot">
          <div className="stepper" aria-label="Cantidad">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Uno menos"><Minus weight="bold" /></button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Uno más"><Plus weight="bold" /></button>
          </div>
          <button type="button" className="btn primary tp-add" disabled={Boolean(missing)} onClick={confirm}>
            {missing || `Agregar · ${money(unit * qty)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
