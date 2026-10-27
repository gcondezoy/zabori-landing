// Cliente de Supabase. Credenciales en ".env.local" (ver .env.example).
// Sin credenciales la web funciona en modo demo: cuentas y pedidos se guardan solo en este navegador.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && anonKey)
export const supabase = supabaseConfigurado ? createClient(url, anonKey) : null
