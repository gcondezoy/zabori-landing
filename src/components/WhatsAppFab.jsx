import { WhatsappLogo } from '@phosphor-icons/react'
import { zaboriWhatsapp } from '../lib/whatsapp'

// Botón flotante para escribir a Zabori por WhatsApp
export default function WhatsAppFab() {
  return (
    <a className="wa-fab" href={zaboriWhatsapp('Hola Zabori, tengo una consulta.')} target="_blank" rel="noreferrer"
      aria-label="Escríbenos por WhatsApp">
      <WhatsappLogo size={30} weight="fill" />
      <span className="wa-fab-label">¿Dudas? Escríbenos</span>
    </a>
  )
}
