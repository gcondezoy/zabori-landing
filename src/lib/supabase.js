// Cliente de Supabase. Credenciales en ".env.local" (ver .env.example).
// Sin credenciales la web funciona en modo demo: cuentas y pedidos se guardan solo en este navegador.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && anonKey)

// Al volver desde un correo de Supabase (confirmar cuenta o cambiar contraseña) el enlace trae datos en el #.
// Se leen antes de crear el cliente, porque este los borra al iniciar sesión.
const linkParams = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.hash.replace(/^#/, ''))
export const authLink = {
  type: linkParams.get('type'), // 'signup' | 'recovery' | ...
  error: linkParams.get('error_code') || linkParams.get('error'),
}
export const supabase = supabaseConfigurado ? createClient(url, anonKey) : null
