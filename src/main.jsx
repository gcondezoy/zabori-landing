import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/nunito'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { MenuProvider } from './context/MenuContext'
import { injectBusinessSchema } from './lib/seo'

injectBusinessSchema()

// Quita la pantalla de entrada de index.html (se ve al menos este tiempo, para que el logo no sea un parpadeo)
const SPLASH_MS = 950
function endSplash() {
  const el = document.getElementById('splash')
  if (!el) return
  setTimeout(() => {
    document.body.classList.remove('splash-on') // aquí arranca la animación de la portada
    el.classList.add('out')
    setTimeout(() => el.remove(), 700)
  }, Math.max(0, SPLASH_MS - performance.now()))
}
endSplash()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <MenuProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </MenuProvider>
    </AuthProvider>
  </StrictMode>,
)
