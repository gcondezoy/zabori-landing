import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
import { OPEN_BUILD_EVENT, OPEN_MENU_EVENT, OPEN_SHOTS_EVENT } from './BuildPromo'

// Solo se oculta la foto que aún está cargando: visible por defecto, nunca queda en blanco si algo falla
const markLoading = (img) => { if (img && !img.complete) img.classList.add('loading') }
const markLoaded = (e) => e.currentTarget.classList.remove('loading')

const LOW_STOCK = 5 // desde aquí se avisa cuántas unidades quedan

function Card({ item, index }) {
  const { qty, add, dec, requestAdd, countOf, room } = useCart()
  const { build, entradas, stock } = useMenu()
  const left = stock[item.id]
  const soldOut = left === 0
  const full = room(item.id) <= 0 // ya tiene en su pedido todo lo que queda
  const withTaper = needsPick(item, build, entradas) // los menús del día piden entrada y táper al agregar
  const n = withTaper ? countOf(item.id) : qty[item.id] || 0
  return (
    <Reveal as="article" className={`card${soldOut ? ' sold-out' : ''}`} delay={Math.min(index, 2) * 70}>
      <div className="card-img" style={{ background: item.tone }}>
        {item.img
          ? <img src={item.img} alt={item.name} loading="lazy" width="720" height="540" ref={markLoading} onLoad={markLoaded} onError={markLoaded} />
          : <ForkKnife size={34} weight="duotone" />}
        {soldOut ? <span className="tag sold">Agotado por hoy</span> : item.tag && <span className="tag">{item.tag}</span>}
      </div>
      <div className="card-body">
        <h3>{item.name}</h3>
        <p>{item.desc}</p>
        <div className="card-foot">
          {/* Los menús del día tienen un precio único (se muestra arriba de la grilla) */}
          {item.cat !== 'menu' && <strong>{money(item.price)}</strong>}
          {withTaper ? (
            <span className="card-add">
              {n > 0 ? <span className="in-cart">{n} en tu pedido</span> : left > 0 && left <= LOW_STOCK && <span className="in-cart low">Quedan {left}</span>}
              <button className="btn small primary" disabled={full} onClick={() => requestAdd(item)}>{soldOut ? 'Agotado' : 'Agregar'}</button>
            </span>
          ) : n === 0 ? (
            <span className="card-add">
              {left > 0 && left <= LOW_STOCK && <span className="in-cart low">Quedan {left}</span>}
              <button className="btn small primary" disabled={full} onClick={() => add(item.id)}>{soldOut ? 'Agotado' : 'Agregar'}</button>
            </span>
          ) : (
            <div className="stepper">
              <button onClick={() => dec(item.id)} aria-label="Quitar uno"><Minus weight="bold" /></button>
              <span key={n} className="bump">{n}</span>
              <button onClick={() => add(item.id)} disabled={full} aria-label="Agregar uno"><Plus weight="bold" /></button>
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
  const tabs = useRef(null)
  const [ink, setInk] = useState(null)

  // La marca de la pestaña elegida se desliza hasta su lugar
  useLayoutEffect(() => {
    const measure = () => {
      const on = tabs.current?.querySelector('.tab.on')
      if (on) setInk({ x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight })
    }
    measure()
    let alive = true
    document.fonts?.ready.then(() => { if (alive) measure() })
    window.addEventListener('resize', measure)
    return () => { alive = false; window.removeEventListener('resize', measure) }
  }, [cat])

  useEffect(() => {
    const open = () => setCat('arma')
    const openMenu = () => setCat('menu')
    const openShotsTab = () => setCat('shots')
    window.addEventListener(OPEN_BUILD_EVENT, open)
    window.addEventListener(OPEN_MENU_EVENT, openMenu)
    window.addEventListener(OPEN_SHOTS_EVENT, openShotsTab)
    return () => {
      window.removeEventListener(OPEN_BUILD_EVENT, open)
      window.removeEventListener(OPEN_MENU_EVENT, openMenu)
      window.removeEventListener(OPEN_SHOTS_EVENT, openShotsTab)
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
        <div ref={tabs} className="tabs tabs-ink" role="tablist">
          {ink && <span className="tab-ink" aria-hidden="true" style={{ width: ink.w, height: ink.h, transform: `translate(${ink.x}px, ${ink.y}px)` }} />}
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
