import { payText } from '../lib/culqi'

const steps = [
  { t: 'Elige tu menú', d: 'Agrega los platos al carrito y escoge delivery o recojo.' },
  { t: 'Paga en línea', d: `Con ${payText}, como invitado o con tu cuenta Zabori.` },
  { t: 'Recíbelo', d: 'Te avisamos cuando tu pedido salga o esté listo para recoger.' },
]

// Cómo pedir: va en la portada, debajo del eslogan
export default function HowItWorks() {
  return (
    <div className="hero-steps" id="como">
      <h2>Pídelo en 3 pasos</h2>
      <ol className="steps">
        {steps.map(({ t, d }, i) => (
          <li key={t}>
            <span className="step-n" aria-hidden="true">{i + 1}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
