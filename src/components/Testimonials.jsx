import { Star, Quotes } from '@phosphor-icons/react'
import { site } from '../config/site'
import Reveal from './Reveal'

export default function Testimonials() {
  const list = site.testimonials || []
  if (!list.length) return null
  const avg = list.reduce((s, t) => s + t.stars, 0) / list.length

  return (
    <section className="section" id="opiniones">
      <div className="wrap">
        <Reveal className="op-head">
          <div>
            <h2>Lo que dicen nuestros clientes</h2>
            {site.testimonialsAreExamples && <span className="op-example">Opiniones de ejemplo</span>}
          </div>
          <div className="op-score" aria-label={`Calificación promedio ${avg.toFixed(1)} de 5`}>
            <strong>{avg.toFixed(1)}</strong>
            <span className="stars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={18} weight={n <= Math.round(avg) ? 'fill' : 'regular'} />)}
            </span>
          </div>
        </Reveal>
        <div className="op-grid">
          {list.map((t, i) => (
            <Reveal as="figure" key={i} className="op-card" delay={i * 110}>
              <Quotes size={28} weight="fill" className="op-quote" aria-hidden="true" />
              <blockquote>{t.text}</blockquote>
              <figcaption>
                <span className="op-avatar" aria-hidden="true">{t.name.charAt(0)}</span>
                <span><b>{t.name}</b><small>{t.place}</small></span>
                <span className="stars" aria-label={`${t.stars} de 5 estrellas`}>
                  {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} weight={n <= t.stars ? 'fill' : 'regular'} />)}
                </span>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
