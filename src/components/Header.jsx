import { useEffect, useState } from 'react'
import { ShoppingBag, User } from '@phosphor-icons/react'
import { site } from '../config/site'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const { count, setOpen } = useCart()
  const { user, setModal } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  // Al bajar, la cabecera gana una sombra para separarse del contenido
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 8)
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])

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
        </div>
      </div>
    </header>
  )
}
