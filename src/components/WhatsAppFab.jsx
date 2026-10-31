import { useEffect, useRef } from 'react'
import { WhatsappLogo } from '@phosphor-icons/react'
import { zaboriWhatsapp } from '../lib/whatsapp'

// Botón flotante para escribir a Zabori por WhatsApp
export default function WhatsAppFab() {
  const ref = useRef(null)

  // En celular, el resumen de "Arma tu plato" ocupa la parte de abajo: mientras se ve, el botón se oculta
  useEffect(() => {
    let frame = 0
    const place = () => {
      frame = 0
      const fab = ref.current
      const sum = document.querySelector('.b-summary')
      if (!fab) return
      const r = sum && window.innerWidth <= 900 ? sum.getBoundingClientRect() : null
      const own = fab.getBoundingClientRect()
      const hide = Boolean(r && r.top < own.bottom + 12 && r.bottom > own.top - 12) // el resumen pasa por donde está el botón
      fab.classList.toggle('is-hidden', hide)
      fab.inert = hide
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
