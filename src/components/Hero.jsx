import { ArrowRight, Clock, Motorcycle } from '@phosphor-icons/react'
import { site } from '../config/site'

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="wrap hero-in">
        <div>
          <p className="eyebrow">{site.tagline}</p>
          <h1>Comida casera, lista para tu hora de almuerzo.</h1>
          <p className="lead">
            Elige tu menú, paga en línea y recíbelo en tu puerta o recógelo caliente.
            Sin crear cuenta si no quieres.
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
        <div className="hero-art" aria-hidden="true">
          <div className="plate">
            <span>Foto del plato</span>
          </div>
        </div>
      </div>
    </section>
  )
}
