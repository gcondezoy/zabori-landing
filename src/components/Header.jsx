import { useEffect, useRef, useState } from 'react'
import { List, MapTrifold, ShoppingBag, User, X } from '@phosphor-icons/react'
import { site } from '../config/site'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { lastOrder } from '../lib/whatsapp'

export default function Header() {
  const { count, setOpen } = useCart()
  const { user, setModal } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const burger = useRef(null)

  // Al bajar, la cabecera gana una sombra para separarse del contenido
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 8)
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])

  // El menú del celular se cierra con Esc (el foco vuelve al botón) o al cambiar de página
  useEffect(() => {
    if (!navOpen) return undefined
    const close = () => setNavOpen(false)
    const onKey = (e) => { if (e.key === 'Escape') { close(); burger.current?.focus() } }
    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', close)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hashchange', close)
    }
  }, [navOpen])

  const tracked = navOpen ? lastOrder() : null

  return (
    <header className={`header${scrolled ? ' scrolled' : ''}`}>
      <div className="wrap header-in">
        <a href="#top" className="brand" aria-label="Zabori, inicio"><img src="/logo-zabori.png" alt="Zabori" width="120" height="35" /></a>
        <nav className="nav" aria-label="Principal">
          <a href="#menu">Menú</a>
          <a href="#como">Cómo pedir</a>
          <a href="#/seguir">Sigue tu pedido</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <div className="header-actions">
          <button className="acct-btn" onClick={() => (user ? (window.location.hash = '#/cuenta') : setModal('login'))}
            aria-label={user ? 'Mi cuenta' : 'Iniciar sesión'}>
            <User size={20} weight="bold" />
            <span>{user ? (user.name || 'Mi cuenta').split(' ')[0] : 'Ingresar'}</span>
          </button>
          <button className="cart-btn" onClick={() => setOpen(true)} aria-label={`Abrir carrito, ${count} productos`}>
            <ShoppingBag size={22} weight="bold" />
            {count > 0 && <span key={count} className="badge bump">{count}</span>}
          </button>
          <button ref={burger} className="burger" onClick={() => setNavOpen((v) => !v)}
            aria-label={navOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={navOpen} aria-controls="nav-celular">
            {navOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
          </button>
        </div>
      </div>
      {navOpen && (
        <>
          <div className="nav-scrim" onClick={() => setNavOpen(false)} />
          <nav id="nav-celular" className="nav-mobile" aria-label="Menú" onClick={() => setNavOpen(false)}>
            <a href="#/seguir" className="nav-track">
              <MapTrifold size={22} weight="bold" />
              <span>Sigue tu pedido{tracked && <small>{tracked.code}</small>}</span>
            </a>
            <a href="#menu">Menú</a>
            <a href="#como">Cómo pedir</a>
            <a href="#contacto">Contacto</a>
          </nav>
        </>
      )}
    </header>
  )
}
