import { Clock, Motorcycle } from '@phosphor-icons/react'
import { site } from '../config/site'
import PlateCarousel from './PlateCarousel'
import HowItWorks from './HowItWorks'
import { useTodayStatus } from './TodayBadge'
import { openBuilder, openShots, OPEN_MENU_EVENT } from './BuildPromo'

export default function Hero() {
  const status = useTodayStatus()
  return (
    <section className="hero" id="top">
      <div className="wrap hero-in">
        <div>
          <h1>{site.slogan}.</h1>
          <HowItWorks />
          <div className="cta-row">
            <a href="#menu" className="btn primary" onClick={() => window.dispatchEvent(new Event(OPEN_MENU_EVENT))}>
              Menú
            </a>
            <a href="#menu" className="btn primary" onClick={openBuilder}>Arma tu plato</a>
            <a href="#menu" className="btn primary" onClick={openShots}>Shots</a>
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
