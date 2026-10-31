import { ListChecks, Wallet, Package } from '@phosphor-icons/react'
import Reveal from './Reveal'
import { payText } from '../lib/culqi'

const steps = [
  { icon: ListChecks, t: 'Elige tu menú', d: 'Agrega los platos al carrito y escoge delivery o recojo.' },
  { icon: Wallet, t: 'Paga en línea', d: `Con ${payText}, como invitado o con tu cuenta Zabori.` },
  { icon: Package, t: 'Recíbelo', d: 'Te avisamos cuando tu pedido salga o esté listo para recoger.' },
]

export default function HowItWorks() {
  return (
    <section className="section alt" id="como">
      <div className="wrap">
        <Reveal as="h2">Pedir es simple</Reveal>
        <ol className="steps">
          {steps.map(({ icon: Icon, t, d }, i) => (
            <Reveal as="li" key={t} delay={i * 110}>
              <span className="step-n">{i + 1}</span>
              <Icon size={30} weight="duotone" />
              <h3>{t}</h3>
              <p>{d}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
