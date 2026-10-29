import { ArrowRight, Clock, Motorcycle } from '@phosphor-icons/react'
import { site } from '../config/site'
import PlateCarousel from './PlateCarousel'

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="wrap hero-in">
        <div>
          <p className="eyebrow">{site.tagline}</p>
          <h1>{site.slogan}.</h1>
          <p className="lead">
            Cada día un menú casero distinto, o tu propio plato con lo que más te gusta.
            Pide en minutos y paga con Yape, Plin o tarjeta.
          </p>
          <div className="cta-row">
            <a href="#menu" className="btn primary">Ver el menú de hoy <ArrowRight weight="bold" /></a>
            <a href="#como" className="btn ghost">Cómo funciona</a>
          </div>
          <ul className="facts">
            <li><Clock size={18} weight="bold" /> {site.schedule}</li>
            <li><Motorcycle size={18} weight="bold" /> Delivery y recojo</li>
          </ul>
        </div>
        <div className="hero-art">
          <PlateCarousel />
        </div>
      </div>
    </section>
  )
}
