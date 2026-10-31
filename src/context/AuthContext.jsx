import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigurado } from '../lib/supabase'
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
  const [modal, setModal] = useState(null) // null | 'login' | 'registro' | 'cuenta'

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
    supabase.auth.getSession().then(({ data }) => apply(data.session)).finally(() => alive && setReady(true))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { apply(session) })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  const signUp = useCallback(async ({ email, password, name, phone, marketing }) => {
    if (supabaseConfigurado) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, phone, accepts_marketing: marketing === true, terms_version: LEGAL_VERSION } } })
      if (error) throw new Error(error.message)
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
      if (error) throw new Error('Correo o contraseña incorrectos.')
      return
    }
    const u = read(DEMO_USERS, []).find((x) => x.email === email && x.password === password)
    if (!u) throw new Error('Correo o contraseña incorrectos.')
    write(DEMO_SESSION, u.id)
    setUser(u)
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
    () => ({ user, ready, modal, setModal, signUp, signIn, signOut, saveProfile }),
    [user, ready, modal, signUp, signIn, signOut, saveProfile],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
