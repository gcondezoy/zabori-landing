import { payText } from '../lib/culqi'
import { ArrowRight, Clock, Motorcycle } from '@phosphor-icons/react'
import { site } from '../config/site'
import { useMenu } from '../context/MenuContext'
import { menuPrice } from '../lib/menu'
import { DAY_NAMES } from '../lib/week'
import PlateCarousel from './PlateCarousel'
import { useTodayStatus } from './TodayBadge'
import { openBuilder, OPEN_MENU_EVENT } from './BuildPromo'

export default function Hero() {
  const { items, day } = useMenu()
  const status = useTodayStatus()
  const menus = items.filter((i) => i.cat === 'menu')
  const when = day.today ? 'Hoy' : `El ${DAY_NAMES[day.day]}`
  const price = menuPrice(items)
  const priceText = `S/ ${Number.isInteger(price) ? price : price.toFixed(2)}`
  const headline = menus.length ? `${when}: ${menus.length} menú${menus.length === 1 ? '' : 's'} a ${priceText}` : site.tagline
  return (
    <section className="hero" id="top">
      <div className="wrap hero-in">
        <div>
          <p className="eyebrow">{headline}</p>
          <h1>{site.slogan}.</h1>
          <p className="lead">
            Cada día un menú casero distinto, o tu propio plato con lo que más te gusta.
            Pide en minutos y paga con {payText}.
          </p>
          <div className="cta-row">
            <a href="#menu" className="btn primary" onClick={() => window.dispatchEvent(new Event(OPEN_MENU_EVENT))}>
              Menú · {priceText} <ArrowRight weight="bold" />
            </a>
            <a href="#menu" className="btn ghost" onClick={openBuilder}>Arma tu plato</a>
          </div>
          <ul className="facts">
            <li><Clock size={18} weight="bold" /> {status.text}</li>
            <li><Motorcycle size={18} weight="bold" /> Delivery y recojo</li>
            <li className="facts-pay">
              Paga con
              {Object.values(site.wallets).map((w) => <img key={w.label} src={w.logo} alt={w.label} title={w.label} width="26" height="26" />)}
            </li>
          </ul>
        </div>
        <div className="hero-art">
          <PlateCarousel />
        </div>
      </div>
    </section>
  )
}
