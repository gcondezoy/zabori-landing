import { site } from '../config/site'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const hh = (h) => `${String(h).padStart(2, '0')}:00`

// Ficha del negocio para Google (datos estructurados). Se arma desde site.js,
// así al cambiar WhatsApp, dirección u horario se actualiza sola.
export function injectBusinessSchema() {
  const url = window.location.origin + '/'
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: site.name,
    slogan: site.slogan,
    description: `${site.tagline} y arma tu plato fit, en táper. Delivery y recojo en Lima.`,
    url,
    image: url + 'og-image.jpg',
    logo: url + 'icon-512.png',
    servesCuisine: ['Peruana', 'Saludable'],
    priceRange: 'S/ 10 - S/ 30',
    paymentAccepted: 'Yape, Plin, tarjeta de crédito y débito',
    currenciesAccepted: 'PEN',
    address: { '@type': 'PostalAddress', addressLocality: 'Lima', addressRegion: 'Lima', addressCountry: 'PE' },
    openingHours: `${site.openDays.map((d) => DAYS[d]).join(',')} ${hh(site.openHour)}-${hh(site.closeHour)}`,
  }
  // El teléfono solo se publica cuando ya es el número real (no el de ejemplo)
  if (!/^51900000000$/.test(site.whatsapp)) data.telephone = `+${site.whatsapp}`

  const el = document.createElement('script')
  el.type = 'application/ld+json'
  el.textContent = JSON.stringify(data)
  document.head.appendChild(el)
}
