import { useEffect, useRef, useState } from 'react'

// Aparece suavemente al entrar en pantalla. Sin IntersectionObserver o con movimiento reducido, se muestra directo.
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  const [settled, setSettled] = useState(false) // ya apareció: sin retraso para efectos hover

  useEffect(() => {
    if (!shown || !delay) return
    const t = setTimeout(() => setSettled(true), delay + 750)
    return () => clearTimeout(t)
  }, [shown, delay])

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return }
    const io = new IntersectionObserver((entries) => {
      // También si ya quedó arriba (scroll rápido o salto a una sección)
      if (entries.some((e) => e.isIntersecting || e.boundingClientRect.top < 0)) { setShown(true); io.disconnect() }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag ref={ref} className={`reveal${shown ? ' in' : ''}${className ? ' ' + className : ''}`}
      style={delay && !settled ? { transitionDelay: `${delay}ms` } : undefined} {...rest}>
      {children}
    </Tag>
  )
}
