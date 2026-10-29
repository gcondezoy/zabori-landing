import { useEffect, useState } from 'react'
import { Plus, Minus, ForkKnife } from '@phosphor-icons/react'
import { categories } from '../data/menu'
import { useMenu } from '../context/MenuContext'
import { money } from '../config/site'
import { useCart } from '../context/CartContext'
import Reveal from './Reveal'
import TodayBadge from './TodayBadge'
import BuildPlate from './BuildPlate'
import { needsTaper } from '../lib/build'
import { OPEN_BUILD_EVENT } from './BuildPromo'

function Card({ item, index }) {
  const { qty, add, dec, requestAdd, countOf } = useCart()
  const { build } = useMenu()
  const withTaper = needsTaper(item, build) // los menús del día piden táper al agregar
  const n = withTaper ? countOf(item.id) : qty[item.id] || 0
  return (
    <Reveal as="article" className="card" delay={Math.min(index, 5) * 70}>
      <div className="card-img" style={{ background: item.tone }}>
        {item.img
          ? <img src={item.img} alt={item.name} loading="lazy" width="720" height="540" />
          : <ForkKnife size={34} weight="duotone" />}
        {item.tag && <span className="tag">{item.tag}</span>}
      </div>
      <div className="card-body">
        <h3>{item.name}</h3>
        <p>{item.desc}</p>
        <div className="card-foot">
          <strong>{money(item.price)}</strong>
          {withTaper ? (
            <span className="card-add">
              {n > 0 && <span className="in-cart">{n} en tu pedido</span>}
              <button className="btn small primary" onClick={() => requestAdd(item)}>Agregar</button>
            </span>
          ) : n === 0 ? (
            <button className="btn small primary" onClick={() => add(item.id)}>Agregar</button>
          ) : (
            <div className="stepper">
              <button onClick={() => dec(item.id)} aria-label="Quitar uno"><Minus weight="bold" /></button>
              <span>{n}</span>
              <button onClick={() => add(item.id)} aria-label="Agregar uno"><Plus weight="bold" /></button>
            </div>
          )}
        </div>
      </div>
    </Reveal>
  )
}

export default function Menu() {
  const [cat, setCat] = useState('menu')
  const { items } = useMenu()

  useEffect(() => {
    const open = () => setCat('arma')
    window.addEventListener(OPEN_BUILD_EVENT, open)
    return () => window.removeEventListener(OPEN_BUILD_EVENT, open)
  }, [])
  return (
    <section className="section" id="menu">
      <div className="wrap">
        <Reveal>
          <TodayBadge />
          <h2>La carta de hoy</h2>
          <p className="sub">Los platos cambian cada día. Ejemplo de menú, se actualizará con el real.</p>
        </Reveal>
        <div className="tabs" role="tablist">
          {categories.map((c) => (
            <button key={c.id} role="tab" aria-selected={cat === c.id}
              className={cat === c.id ? 'tab on' : 'tab'} onClick={() => setCat(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        {cat === 'arma' ? <BuildPlate /> : (
          <div className="grid">
            {items.filter((i) => i.cat === cat).map((i, k) => <Card key={cat + i.id} item={i} index={k} />)}
          </div>
        )}
      </div>
    </section>
  )
}
