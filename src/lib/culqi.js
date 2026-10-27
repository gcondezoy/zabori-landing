// Pago con tarjeta: Culqi Checkout v4 (tokeniza en el navegador) + Edge Function "pay-order" (cobra).
// Sin VITE_CULQI_PUBLIC_KEY o sin Supabase, el pago queda en modo demo.
import { supabase, supabaseConfigurado } from './supabase'

const publicKey = import.meta.env.VITE_CULQI_PUBLIC_KEY
export const culqiConfigurado = Boolean(publicKey && supabaseConfigurado)

let loading

function loadScript() {
  if (window.Culqi) return Promise.resolve()
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://checkout.culqi.com/js/v4'
      s.onload = resolve
      s.onerror = () => { loading = null; reject(new Error('No se pudo cargar la pasarela de pago.')) }
      document.head.appendChild(s)
    })
  }
  return loading
}

// Abre el formulario de tarjeta y resuelve con el id del token.
// Si el cliente cierra la ventana sin pagar, la promesa no se resuelve: la UI ofrece "Pagar con tarjeta" de nuevo.
export async function pedirToken({ amount, title }) {
  await loadScript()
  const Culqi = window.Culqi
  Culqi.publicKey = publicKey
  Culqi.settings({ title, currency: 'PEN', amount: Math.round(amount * 100) })
  Culqi.options({ lang: 'es', paymentMethods: { tarjeta: true, yape: false, bancaMovil: false, agente: false, billetera: false, cuotealo: false } })
  return new Promise((resolve, reject) => {
    window.culqi = () => {
      if (Culqi.token) {
        const id = Culqi.token.id
        Culqi.close()
        resolve(id)
      } else {
        reject(new Error(Culqi.error?.user_message || 'No se pudo validar la tarjeta.'))
      }
    }
    Culqi.open()
  })
}

// Cobra el pedido en el servidor. El monto lo toma el servidor del pedido, no del navegador.
export async function cobrar({ code, token, email }) {
  const { data, error } = await supabase.functions.invoke('pay-order', { body: { code, token, email } })
  if (error) {
    let msg = 'No pudimos procesar el pago.'
    try { msg = (await error.context.json()).error || msg } catch {}
    throw new Error(msg)
  }
  return data
}
