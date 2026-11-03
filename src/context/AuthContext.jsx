import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigurado, authLink } from '../lib/supabase'
import { LEGAL_VERSION } from '../data/legal'

const AuthContext = createContext(null)
const DEMO_USERS = 'zabori-demo-users'
const DEMO_SESSION = 'zabori-demo-session'

const read = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback } catch { return fallback }
}
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch {}
}

// Correo de bienvenida: se activa en Vercel cuando ya están el dominio y la función welcome-email
const WELCOME_EMAIL = import.meta.env.VITE_CORREO_BIENVENIDA === '1'

// Los enlaces de los correos vuelven a la portada de esta misma web
const backHome = () => `${window.location.origin}/`

// Mensajes de Supabase en español
function friendly(error) {
  const m = error?.message || ''
  if (/already registered|already been registered/i.test(m)) return 'Ese correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.'
  if (/not confirmed/i.test(m)) return 'Aún no confirmas tu correo. Revisa tu bandeja de entrada (y la carpeta de spam).'
  if (/at least 6|password should/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.'
  if (/same.*password|different from the old/i.test(m)) return 'La nueva contraseña debe ser distinta a la anterior.'
  if (/rate limit|too many|security purposes/i.test(m)) return 'Enviamos varios correos seguidos. Espera unos minutos e inténtalo de nuevo.'
  if (/invalid.*email|email.*invalid/i.test(m)) return 'Revisa que el correo esté bien escrito.'
  if (/invalid login|invalid credentials/i.test(m)) return 'Correo o contraseña incorrectos.'
  return 'No pudimos completar esto. Inténtalo de nuevo en unos minutos.'
}

export const firstName = (name) => (name || '').trim().split(/\s+/)[0] || ''

// Usuario normalizado: { id, email, name, phone, address, accepts_marketing }
async function fetchProfile(authUser) {
  const base = { id: authUser.id, email: authUser.email, name: '', phone: '', address: '', lat: null, lng: null, accepts_marketing: false }
  const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
  if (!data) return base
  // numeric llega como texto desde Supabase
  return { ...base, ...data, lat: data.lat != null ? Number(data.lat) : null, lng: data.lng != null ? Number(data.lng) : null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [modal, setModal] = useState(null) // null | 'login' | 'registro' | 'recuperar' | 'nueva-clave' | 'aviso' | 'cuenta'
  const [notice, setNotice] = useState('') // aviso para la cuenta o para la ventana 'aviso'

  useEffect(() => {
    if (!supabaseConfigurado) {
      const id = read(DEMO_SESSION, null)
      setUser(id ? read(DEMO_USERS, []).find((u) => u.id === id) || null : null)
      setReady(true)
      return
    }
    let alive = true
    let welcomed = false
    const apply = async (session) => {
      const next = session?.user ? await fetchProfile(session.user) : null
      if (alive) setUser(next)
      // La función envía el correo una sola vez; si falla, se reintenta en la próxima visita
      if (WELCOME_EMAIL && next && next.welcomed_at === null && !welcomed) {
        welcomed = true
        supabase.functions.invoke('welcome-email').catch(() => {})
      }
    }
    supabase.auth.getSession().then(({ data }) => {
      apply(data.session)
      // Vino del correo de confirmación: ya entra con su cuenta
      if (authLink.type === 'signup' && data.session) {
        setNotice('Listo, tu correo quedó confirmado. ¡Bienvenido a Zabori!')
        window.location.hash = '#/cuenta'
      }
      if (authLink.error) {
        setNotice('Ese enlace ya venció o ya se usó. Pide uno nuevo desde "Ingresar".')
        setModal('aviso')
      }
    }).finally(() => alive && setReady(true))
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      apply(session)
      if (event === 'PASSWORD_RECOVERY') setModal('nueva-clave') // vino del correo para cambiar la contraseña
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  const signUp = useCallback(async ({ email, password, name, phone, marketing }) => {
    if (supabaseConfigurado) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: backHome(), data: { name, phone, accepts_marketing: marketing === true, terms_version: LEGAL_VERSION } },
      })
      if (error) throw new Error(friendly(error))
      // Correo ya registrado (con confirmación activa Supabase no da error, pero no crea nada)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('Ese correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.')
      }
      // Si el proyecto exige confirmar el correo, aún no hay sesión
      return { needsConfirm: !data.session }
    }
    const users = read(DEMO_USERS, [])
    if (users.some((u) => u.email === email)) throw new Error('Ese correo ya está registrado.')
    const u = { id: 'u' + Date.now(), email, password, name, phone, address: '', lat: null, lng: null, accepts_marketing: marketing === true, marketing_at: marketing ? new Date().toISOString() : null, terms_version: LEGAL_VERSION, terms_at: new Date().toISOString() }
    write(DEMO_USERS, [...users, u])
    write(DEMO_SESSION, u.id)
    setUser(u)
    return { needsConfirm: false }
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    if (supabaseConfigurado) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        const e = new Error(friendly(error))
        e.unconfirmed = /not confirmed/i.test(error.message)
        throw e
      }
      return
    }
    const u = read(DEMO_USERS, []).find((x) => x.email === email && x.password === password)
    if (!u) throw new Error('Correo o contraseña incorrectos.')
    write(DEMO_SESSION, u.id)
    setUser(u)
  }, [])

  // Vuelve a enviar el correo para confirmar la cuenta
  const resendConfirm = useCallback(async (email) => {
    if (!supabaseConfigurado) return
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: backHome() } })
    if (error) throw new Error(friendly(error))
  }, [])

  // Envía el enlace para elegir una contraseña nueva
  const resetPassword = useCallback(async (email) => {
    if (!supabaseConfigurado) throw new Error('En el modo demo no se envían correos.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: backHome() })
    if (error) throw new Error(friendly(error))
  }, [])

  const updatePassword = useCallback(async (password) => {
    if (!supabaseConfigurado) return
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(friendly(error))
  }, [])

  const signOut = useCallback(async () => {
    if (supabaseConfigurado) await supabase.auth.signOut()
    else { write(DEMO_SESSION, null); setUser(null) }
  }, [])

  // Guarda nombre, celular y dirección para autocompletar el próximo pedido
  const saveProfile = useCallback(async (fields) => {
    if (!user) return
    const next = { ...user, ...fields }
    if (supabaseConfigurado) {
      const { error } = await supabase.from('profiles').update(fields).eq('id', user.id)
      if (error) throw new Error(error.message)
    } else {
      const stamp = 'accepts_marketing' in fields ? { marketing_at: new Date().toISOString() } : {}
      write(DEMO_USERS, read(DEMO_USERS, []).map((u) => (u.id === user.id ? { ...u, ...fields, ...stamp } : u)))
    }
    setUser(next)
  }, [user])

  const value = useMemo(
    () => ({ user, ready, modal, setModal, notice, setNotice, signUp, signIn, signOut, saveProfile, resendConfirm, resetPassword, updatePassword }),
    [user, ready, modal, notice, signUp, signIn, signOut, saveProfile, resendConfirm, resetPassword, updatePassword],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
