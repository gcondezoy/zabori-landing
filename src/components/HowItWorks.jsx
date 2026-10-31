import Reveal from './Reveal'
import { payText } from '../lib/culqi'

const steps = [
  { t: 'Elige tu menú', d: 'Agrega los platos al carrito y escoge delivery o recojo.' },
  { t: 'Paga en línea', d: `Con ${payText}, como invitado o con tu cuenta Zabori.` },
  { t: 'Recíbelo', d: 'Te avisamos cuando tu pedido salga o esté listo para recoger.' },
]

export default function HowItWorks() {
  return (
    <section className="section alt" id="como">
      <div className="wrap">
        <Reveal as="h2">Pedir es simple</Reveal>
        <ol className="steps">
          {steps.map(({ t, d }, i) => (
            <Reveal as="li" key={t} delay={i * 110}>
              <span className="step-n">{i + 1}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
