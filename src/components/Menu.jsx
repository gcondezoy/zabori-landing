import { useEffect, useState } from 'react'
import { Plus, Minus, ForkKnife } from '@phosphor-icons/react'
import { categories } from '../data/menu'
import { useMenu } from '../context/MenuContext'
import { money } from '../config/site'
import { useCart } from '../context/CartContext'
import Reveal from './Reveal'
import TodayBadge from './TodayBadge'
import BuildPlate from './BuildPlate'
import SwipeRail from './SwipeRail'
import { needsPick } from '../lib/build'
import { menuPrice } from '../lib/menu'
import { DAY_NAMES } from '../lib/week'
import { OPEN_BUILD_EVENT, OPEN_MENU_EVENT } from './BuildPromo'

function Card({ item, index }) {
  const { qty, add, dec, requestAdd, countOf } = useCart()
  const { build, entradas } = useMenu()
  const withTaper = needsPick(item, build, entradas) // los menús del día piden entrada y táper al agregar
  const n = withTaper ? countOf(item.id) : qty[item.id] || 0
  return (
    <Reveal as="article" className="card" delay={Math.min(index, 2) * 70}>
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
          {/* Los menús del día tienen un precio único (se muestra arriba de la grilla) */}
          {item.cat !== 'menu' && <strong>{money(item.price)}</strong>}
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
  const { items, entradas, drink, day } = useMenu()
  const hasMenus = items.some((i) => i.cat === 'menu')

  useEffect(() => {
    const open = () => setCat('arma')
    const openMenu = () => setCat('menu')
    window.addEventListener(OPEN_BUILD_EVENT, open)
    window.addEventListener(OPEN_MENU_EVENT, openMenu)
    return () => {
      window.removeEventListener(OPEN_BUILD_EVENT, open)
      window.removeEventListener(OPEN_MENU_EVENT, openMenu)
    }
  }, [])
  return (
    <section className="section" id="menu">
      <div className="wrap">
        <Reveal>
          <TodayBadge />
          <h2>{day.today ? 'La carta de hoy' : `La carta del ${DAY_NAMES[day.day]}`}</h2>
          <p className="sub">Los platos cambian cada día.</p>
        </Reveal>
        <div className="tabs" role="tablist">
          {categories.map((c) => (
            <button key={c.id} role="tab" aria-selected={cat === c.id}
              className={cat === c.id ? 'tab on' : 'tab'} onClick={() => setCat(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div key={cat} className="tab-panel">
        {cat === 'menu' && !hasMenus && (
          <div className="menu-empty">
            <p>Aún no publicamos los menús de este día.</p>
            <button className="btn primary small" onClick={() => setCat('arma')}>Arma tu plato</button>
          </div>
        )}
        {cat === 'menu' && hasMenus && (
          <div className="menu-price">
            <strong>S/ {Number.isInteger(menuPrice(items)) ? menuPrice(items) : menuPrice(items).toFixed(2)}</strong>
            <div>
              <b>Entrada + segundo + {drink}</b>
              {entradas.length > 0 && <small>Entradas: {entradas.map((e) => e.name).join(' · ')}</small>}
            </div>
          </div>
        )}
        {cat === 'menu' && hasMenus && <h3 className="menu-step">Elige tu segundo</h3>}
        {cat === 'arma' ? <BuildPlate /> : cat === 'menu' ? (
          <Reveal>
            <SwipeRail className="grid menu-rail" wrapClass="menu-rail-wrap" label="Segundos del día" arrows>
              {items.filter((i) => i.cat === cat).map((i, k) => <Card key={cat + i.id} item={i} index={k} />)}
            </SwipeRail>
          </Reveal>
        ) : (
          <div className="grid">
            {items.filter((i) => i.cat === cat).map((i, k) => <Card key={cat + i.id} item={i} index={k} />)}
          </div>
        )}
        </div>
      </div>
    </section>
  )
}
