import { WhatsappLogo, MapPin, Clock, MapTrifold } from '@phosphor-icons/react'
import { site } from '../config/site'

export default function Footer() {
  return (
    <footer className="footer" id="contacto">
      <div className="wrap footer-in">
        <div>
          <div className="brand light"><img src="/logo-zabori-amarillo.png" alt="Zabori" width="130" height="37" /></div>
          <p className="footer-slogan">{site.slogan}</p>
          <p>{site.tagline}</p>
        </div>
        <ul>
          <li><MapPin size={18} /> {site.address}</li>
          <li><Clock size={18} /> {site.schedule}</li>
          <li><MapTrifold size={18} /> <a href="#/seguir">Sigue tu pedido</a></li>
          <li>
            <WhatsappLogo size={18} />
            <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noreferrer">{site.whatsappLabel}</a>
          </li>
        </ul>
      </div>
      <nav className="wrap footer-legal" aria-label="Información legal">
        <a href="#/terminos">Términos y Condiciones</a>
        <a href="#/privacidad">Política de Privacidad</a>
        {site.legal.reclamosUrl
          ? <a href={site.legal.reclamosUrl} target="_blank" rel="noreferrer">Libro de Reclamaciones</a>
          : <span>Libro de Reclamaciones (por habilitar)</span>}
      </nav>
      <p className="copy">© {new Date().getFullYear()} {site.name}. Todos los derechos reservados.</p>
    </footer>
  )
}
