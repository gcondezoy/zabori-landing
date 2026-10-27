import { useEffect, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Menu from './components/Menu'
import HowItWorks from './components/HowItWorks'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import Checkout from './components/Checkout'
import AuthModal from './components/AuthModal'
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
        <Menu />
        <HowItWorks />
      </main>
      <Footer />
      <CartDrawer />
      <Checkout />
      <AuthModal />
    </>
  )
}
