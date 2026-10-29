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
import TaperPicker from './components/TaperPicker'
import Admin from './components/admin/AdminApp'

const isAdminRoute = () => window.location.hash.startsWith('#/admin')

export default function App() {
  const [admin, setAdmin] = useState(isAdminRoute)

  useEffect(() => {
    const onHash = () => setAdmin(isAdminRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (admin) {
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
      <main>
        <Hero />
        <BuildPromo />
        <Menu />
        <HowItWorks />
        <Testimonials />
      </main>
      <Footer />
      <CartBar />
      <TaperPicker />
      <CartDrawer />
      <Checkout />
      <AuthModal />
    </>
  )
}
