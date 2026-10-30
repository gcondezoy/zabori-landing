import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bell, CalendarBlank, ChartBar, ForkKnife, Receipt, Users, BookOpen, SignOut, Database, Trash } from '@phosphor-icons/react'
import { useAuth } from '../../context/AuthContext'
import { useMenu } from '../../context/MenuContext'
import { seedDemoOrders, clearDemoOrders } from '../../lib/demoData'
import { supabaseConfigurado } from '../../lib/supabase'
import { listOrders, isOpen, changesSince, mergeOrders } from '../../lib/admin'
import Gate, { DEMO_SESSION } from './Gate'
import Dashboard from './Dashboard'
import Orders from './Orders'
import Customers from './Customers'
import MenuAdmin from './MenuAdmin'
import WeekAdmin from './WeekAdmin'
import BuildAdmin from './BuildAdmin'

// Título de la web (index.html), para devolverlo al salir del panel
const SITE_TITLE = document.title

const POLL_MS = 15000

const SECTIONS = [
  { id: 'resumen', label: 'Resumen', icon: ChartBar },
  { id: 'pedidos', label: 'Pedidos', icon: Receipt },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'semana', label: 'Menú semanal', icon: CalendarBlank },
  { id: 'arma', label: 'Arma tu plato', icon: ForkKnife },
  { id: 'carta', label: 'Carta', icon: BookOpen },
]

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator()
    o.frequency.value = 880
    o.connect(ctx.destination)
    o.start()
    setTimeout(() => { o.stop(); ctx.close() }, 220)
  } catch {}
}

// Pedidos compartidos por todas las secciones + aviso de pedidos nuevos
function useOrders(enabled) {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  const [fresh, setFresh] = useState(0)
  const known = useRef(null)
  const current = useRef(null) // la última lista, para pedir solo lo que cambió

  const refresh = useCallback(async () => {
    try {
      const changedSince = changesSince(current.current)
      const rows = await listOrders({ changedSince })
      const list = changedSince ? mergeOrders(current.current, rows) : rows
      current.current = list
      if (known.current) {
        const n = list.filter((o) => !known.current.has(o.code)).length
        if (n > 0) { setFresh((x) => x + n); beep() }
      }
      known.current = new Set(list.map((o) => o.code))
      setOrders(list)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    refresh()
    const t = setInterval(refresh, POLL_MS)
    return () => clearInterval(t)
  }, [enabled, refresh])

  // Recarga sin tratar los pedidos como nuevos (al cargar o borrar datos de ejemplo)
  const reload = useCallback(async () => { known.current = null; current.current = null; setFresh(0); await refresh() }, [refresh])

  return { orders, error, refresh, reload, fresh, clearFresh: () => setFresh(0) }
}

export default function AdminApp() {
  const [ok, setOk] = useState(() => {
    try { return !supabaseConfigurado && sessionStorage.getItem(DEMO_SESSION) === '1' } catch { return false }
  })
  const [section, setSection] = useState('resumen')
  const [focusCode, setFocusCode] = useState(null) // abrir un pedido desde otra sección
  const { signOut } = useAuth()
  const grant = useCallback(() => setOk(true), [])
  const data = useOrders(ok)
  const { items: menu } = useMenu()

  useEffect(() => {
    document.title = data.fresh ? `(${data.fresh}) Nuevo pedido | Zabori` : 'Panel | Zabori'
    return () => { document.title = SITE_TITLE }
  }, [data.fresh])

  const exit = async () => {
    try { sessionStorage.removeItem(DEMO_SESSION) } catch {}
    if (supabaseConfigurado) await signOut()
    setOk(false)
  }

  const loadDemo = async () => {
    if ((data.orders || []).length && !window.confirm('Esto reemplaza los pedidos guardados en este navegador por pedidos de ejemplo. ¿Continuar?')) return
    seedDemoOrders(menu)
    await data.reload()
  }
  const clearDemo = async () => {
    if (!window.confirm('¿Borrar todos los pedidos guardados en este navegador?')) return
    clearDemoOrders()
    await data.reload()
  }

  const openOrder = (code) => { setFocusCode(code); setSection('pedidos') }
  const active = (data.orders || []).filter(isOpen).length

  if (!ok) {
    return (
      <div className="admin">
        <header className="admin-bar">
          <a href="#top" className="back"><ArrowLeft size={18} /> Volver a la web</a>
          <span className="brand">Panel Zabori</span>
        </header>
        <div className="wrap admin-body"><Gate onOk={grant} /></div>
      </div>
    )
  }

  return (
    <div className="admin admin-shell">
      <aside className="side">
        <div className="side-brand"><img src="/logo-zabori-amarillo.png" alt="Zabori" width="110" height="32" /><span>Panel</span></div>
        <nav aria-label="Secciones del panel">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={section === id ? 'on' : ''} onClick={() => setSection(id)} aria-current={section === id ? 'page' : undefined}>
              <Icon size={20} weight={section === id ? 'fill' : 'regular'} />
              <span>{label}</span>
              {id === 'pedidos' && active > 0 && <b className="count">{active}</b>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <a href="#top"><ArrowLeft size={16} /> Ver la web</a>
          <button onClick={exit} aria-label="Salir"><SignOut size={16} /> <span>Salir</span></button>
        </div>
      </aside>

      <main className="admin-main">
        {data.fresh > 0 && (
          <button className="alert-bar" onClick={() => { data.clearFresh(); setSection('pedidos') }}>
            <Bell size={18} weight="fill" /> {data.fresh} pedido{data.fresh > 1 ? 's' : ''} nuevo{data.fresh > 1 ? 's' : ''} · ver pedidos
          </button>
        )}
        {data.error && <p className="form-err" role="alert">No se pudieron cargar los pedidos: {data.error}</p>}
        {!supabaseConfigurado && (
          <div className="demo-banner">
            <span>Modo demo: los datos son solo de este navegador.</span>
            <span className="demo-actions">
              <button onClick={loadDemo}><Database size={15} /> Cargar pedidos de ejemplo</button>
              {(data.orders || []).length > 0 && <button onClick={clearDemo}><Trash size={15} /> Borrar</button>}
            </span>
          </div>
        )}

        {section === 'resumen' && <Dashboard orders={data.orders} onOpen={openOrder} />}
        {section === 'pedidos' && (
          <Orders orders={data.orders} refresh={data.refresh} focusCode={focusCode} onFocusDone={() => setFocusCode(null)} />
        )}
        {section === 'clientes' && <Customers orders={data.orders} onOpen={openOrder} />}
        {section === 'semana' && <WeekAdmin orders={data.orders} />}
        {section === 'arma' && <BuildAdmin orders={data.orders} />}
        {section === 'carta' && <MenuAdmin orders={data.orders} />}
        <p className="muted small-note">Se actualiza solo cada {POLL_MS / 1000} s. Deja esta pestaña abierta para recibir avisos.</p>
      </main>
    </div>
  )
}
