import { useEffect, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Menu from './components/Menu'
import BuildPromo from './components/BuildPromo'
import HowItWorks from './components/HowItWorks'
import Testimonials from './components/Testimonials'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import Checkout from './components/Checkout'
import AuthModal from './components/AuthModal'
import CartBar from './components/CartBar'
import WhatsAppFab from './components/WhatsAppFab'
import TaperPicker from './components/TaperPicker'
import Admin from './components/admin/AdminApp'
import TrackOrder from './components/TrackOrder'
import AccountPage from './components/AccountPage'

const routeOf = () => {
  const h = window.location.hash
  if (h.startsWith('#/admin')) return 'admin'
  if (h.startsWith('#/seguir')) return 'seguir'
  if (h.startsWith('#/cuenta')) return 'cuenta'
  return 'home'
}

export default function App() {
  const [route, setRoute] = useState(routeOf)

  useEffect(() => {
    const onHash = () => {
      const next = routeOf()
      setRoute((prev) => {
        if (prev !== next) {
          // Al cambiar de página: ir a la sección pedida (#menu, #como…) una vez dibujada, o arriba
          const id = window.location.hash.slice(1)
          window.scrollTo(0, 0)
          if (next === 'home' && id && id !== 'top') setTimeout(() => document.getElementById(id)?.scrollIntoView(), 60)
        }
        return next
      })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (route === 'admin') {
    return (
      <>
        <Admin />
        <AuthModal />
      </>
    )
  }

  return (
    <>
      <Header />
      {route === 'seguir' ? <TrackOrder /> : route === 'cuenta' ? <AccountPage /> : (
        <main>
          <Hero />
          <BuildPromo />
          <Menu />
          <HowItWorks />
          <Testimonials />
        </main>
      )}
      <Footer />
      <CartBar />
      <WhatsAppFab />
      <TaperPicker />
      <CartDrawer />
      <Checkout />
      <AuthModal />
    </>
  )
}
