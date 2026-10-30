import { useCallback, useEffect, useRef, useState } from 'react'
import { CaretLeft, CaretRight, Plus, Check } from '@phosphor-icons/react'
import { useMenu } from '../context/MenuContext'
import { useCart } from '../context/CartContext'
import { money } from '../config/site'

const INTERVAL = 4500
const FALLBACK = [{ id: 'hero', name: 'Causa limeña', img: '/img/platos/hero.webp', price: null }]

const reducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

// Plato giratorio de la portada: recorre los menús del día que tienen foto
export default function PlateCarousel() {
  const { items } = useMenu()
  const { requestAdd } = useCart()
  const slides = items.filter((i) => i.cat === 'menu' && i.img)
  const list = slides.length ? slides : FALLBACK
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [added, setAdded] = useState(null)
  const touchX = useRef(null)

  const n = list.length
  const current = list[index % n]
  const go = useCallback((i) => setIndex(((i % n) + n) % n), [n])

  // Avance automático (se detiene al pasar el mouse, al tocar o con movimiento reducido)
  useEffect(() => {
    if (paused || n < 2 || reducedMotion()) return
    const t = setTimeout(() => go(index + 1), INTERVAL)
    return () => clearTimeout(t)
  }, [index, paused, n, go])

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(null), 1600)
    return () => clearTimeout(t)
  }, [added])

  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1) }
  }
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; setPaused(true) }
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - (touchX.current ?? 0)
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1))
    touchX.current = null
    setPaused(false)
  }

  // Abre la elección de táper; el check verde se muestra al confirmar en esa ventana
  const addCurrent = () => requestAdd(current)

  return (
    <div className="carousel" role="region" aria-roledescription="carrusel" aria-label="Menús del día"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} onKeyDown={onKey}>

      <div className="plate-wrap">
      <div className="plate" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {list.map((s, i) => (
          <img key={s.id} src={s.img} alt={i === index % n ? s.name : ''} aria-hidden={i !== index % n}
            className={i === index % n ? 'on' : ''} width="720" height="540"
            loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : undefined} />
        ))}
        {n > 1 && (
          <>
            <button className="plate-nav prev" onClick={() => go(index - 1)} aria-label="Plato anterior"><CaretLeft size={20} weight="bold" /></button>
            <button className="plate-nav next" onClick={() => go(index + 1)} aria-label="Plato siguiente"><CaretRight size={20} weight="bold" /></button>
          </>
        )}
      </div>
      {/* Sello de precio: cambia con cada plato del carrusel */}
      {current.price != null && (
        <span className="price-sticker" key={current.id} aria-hidden="true">
          <small>S/</small>
          <b>{Number.isInteger(current.price) ? current.price : current.price.toFixed(2)}</b>
        </span>
      )}
      </div>

      {current.price != null && (
        <div className="plate-label" aria-live="polite">
          <span className="pl-text">
            <small>{current.tag || 'Menú del día'}</small>
            <strong>{current.name}</strong>
          </span>
          <span className="sr-only">{money(current.price)}</span>
          <button className={`pl-add${added === current.id ? ' ok' : ''}`} onClick={addCurrent}
            aria-label={`Agregar ${current.name} al carrito`}>
            {added === current.id ? <Check size={18} weight="bold" /> : <Plus size={18} weight="bold" />}
          </button>
        </div>
      )}

      {n > 1 && (
        <div className="plate-thumbs" role="tablist" aria-label="Elegir plato">
          {list.map((s, i) => (
            <button key={s.id} role="tab" aria-selected={i === index % n} aria-label={s.name}
              className={i === index % n ? 'on' : ''} onClick={() => go(i)}>
              <img src={s.img} alt="" width="72" height="54" loading="lazy" />
              {i === index % n && !paused && !reducedMotion() && <span className="thumb-timer" key={index} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
