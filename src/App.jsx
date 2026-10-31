import { lazy, Suspense, useEffect, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Menu from './components/Menu'
import BuildPromo from './components/BuildPromo'
import HowItWorks from './components/HowItWorks'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import Checkout from './components/Checkout'
import AuthModal from './components/AuthModal'
import CartBar from './components/CartBar'
import WhatsAppFab from './components/WhatsAppFab'
import MenuPicker from './components/MenuPicker'
// Páginas que no son la portada: se descargan solo cuando se abren (la portada carga más rápido)
const Admin = lazy(() => import('./components/admin/AdminApp'))
const TrackOrder = lazy(() => import('./components/TrackOrder'))
const AccountPage = lazy(() => import('./components/AccountPage'))
const LegalPage = lazy(() => import('./components/LegalPage'))

const Loading = () => <main className="section page-loading" aria-busy="true"><div className="wrap"><p className="muted">Cargando…</p></div></main>

const routeOf = () => {
  const h = window.location.hash
  if (h.startsWith('#/admin')) return 'admin'
  if (h.startsWith('#/seguir')) return 'seguir'
  if (h.startsWith('#/cuenta')) return 'cuenta'
  if (h.startsWith('#/terminos')) return 'terminos'
  if (h.startsWith('#/privacidad')) return 'privacidad'
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
        <Suspense fallback={<Loading />}><Admin /></Suspense>
        <AuthModal />
      </>
    )
  }

  return (
    <>
      <Header />
      {route === 'seguir' ? <Suspense fallback={<Loading />}><TrackOrder /></Suspense>
        : route === 'cuenta' ? <Suspense fallback={<Loading />}><AccountPage /></Suspense>
        : route === 'terminos' || route === 'privacidad' ? <Suspense fallback={<Loading />}><LegalPage page={route} /></Suspense> : (
        <main>
          <Hero />
          <BuildPromo />
          <Menu />
          <HowItWorks />
        </main>
      )}
      <Footer />
      <CartBar />
      <WhatsAppFab />
      <MenuPicker />
      <CartDrawer />
      <Checkout />
      <AuthModal />
    </>
  )
}
