import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'

// Fila que se desliza con el dedo, con puntos de posición. Si todo cabe en pantalla, no muestra controles.
// arrows: agrega flechas para quienes usan mouse.
export default function SwipeRail({ className, wrapClass = '', label, arrows = false, children }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ index: 0, count: 1, start: true, end: true })
  const n = Children.count(children)
  const order = Children.toArray(children).map((c) => c.key).join()

  const stepOf = (el) => (el.children[1] ? el.children[1].offsetLeft - el.children[0].offsetLeft : el.clientWidth)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const room = el.scrollWidth - el.clientWidth
    if (room <= 1) { setPos({ index: 0, count: 1, start: true, end: true }); return }
    const step = stepOf(el)
    const count = Math.ceil(room / step) + 1 // posiciones posibles: en computadora se ven varias tarjetas a la vez
    setPos({
      index: Math.min(count - 1, Math.round(el.scrollLeft / step)),
      count,
      start: el.scrollLeft <= 4,
      end: el.scrollLeft >= room - 4,
    })
  }, [])

  // Si llega otra carta u otro orden, se vuelve al primero: el navegador seguiría a la tarjeta que estaba enganchada
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollLeft = 0
  }, [order])

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    let frame = 0
    const queue = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure() }) }
    measure()
    el.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    return () => {
      el.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      cancelAnimationFrame(frame)
    }
  }, [measure, n, order])

  const go = (i) => {
    const el = ref.current
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: i * stepOf(el), behavior: smooth ? 'smooth' : 'auto' })
  }

  return (
    <div className={`b-rail-wrap ${wrapClass}`.trim()}>
      <div ref={ref} className={`${className} b-rail`} role="group" aria-label={label}>{children}</div>
      {arrows && pos.count > 1 && (
        <>
          <button type="button" className="rail-arrow prev" disabled={pos.start} onClick={() => go(pos.index - 1)} aria-label="Ver anteriores"><CaretLeft size={20} weight="bold" /></button>
          <button type="button" className="rail-arrow next" disabled={pos.end} onClick={() => go(pos.index + 1)} aria-label="Ver más"><CaretRight size={20} weight="bold" /></button>
        </>
      )}
      {pos.count > 1 && (
        <div className="b-rail-nav">
          <div className="b-rail-dots">
            {Array.from({ length: pos.count }, (_, i) => (
              <button key={i} type="button" className={i === pos.index ? 'on' : ''} onClick={() => go(i)}
                aria-label={`Ir a la posición ${i + 1} de ${pos.count}`} aria-current={i === pos.index} />
            ))}
          </div>
          <span>Desliza para ver más</span>
        </div>
      )}
    </div>
  )
}
