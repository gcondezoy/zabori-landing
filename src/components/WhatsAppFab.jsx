import { useEffect, useRef } from 'react'
import { WhatsappLogo } from '@phosphor-icons/react'
import { zaboriWhatsapp } from '../lib/whatsapp'

// Botón flotante para escribir a Zabori por WhatsApp
export default function WhatsAppFab() {
  const ref = useRef(null)

  // En celular, el resumen de "Arma tu plato" queda fijo abajo: el botón sube justo encima de él
  useEffect(() => {
    let frame = 0
    const place = () => {
      frame = 0
      const fab = ref.current
      const sum = document.querySelector('.b-summary')
      if (!fab) return
      const r = sum && window.innerWidth <= 900 ? sum.getBoundingClientRect() : null
      const lift = r && r.top < window.innerHeight && r.bottom > 0 ? window.innerHeight - r.top + 12 : 0
      fab.style.bottom = lift ? `${Math.round(lift)}px` : ''
    }
    const queue = () => { if (!frame) frame = requestAnimationFrame(place) }
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    // El resumen cambia de alto al elegir opciones, y aparece/desaparece al cambiar de pestaña
    const mo = new MutationObserver(queue)
    mo.observe(document.body, { childList: true, subtree: true })
    queue()
    return () => {
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      mo.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <a ref={ref} className="wa-fab" href={zaboriWhatsapp('Hola Zabori, tengo una consulta.')} target="_blank" rel="noreferrer"
      aria-label="Escríbenos por WhatsApp">
      <WhatsappLogo size={30} weight="fill" />
      <span className="wa-fab-label">¿Dudas? Escríbenos</span>
    </a>
  )
}
