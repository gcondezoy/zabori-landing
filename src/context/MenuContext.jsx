import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { loadMenu } from '../lib/menu'
import { loadBuild } from '../lib/build'
import { loadAvailability } from '../lib/availability'
import { DEFAULT_DRINK, forDay, loadDrinks, loadWeek, menuDay } from '../lib/week'
import { items as seed, drinkSeed, weekSeed } from '../data/menu'
import { buildSeed } from '../data/build'

const MenuContext = createContext(null)
const AVAIL_MS = 60000

export function MenuProvider({ children }) {
  const [all, setAll] = useState(seed) // se muestra la carta de ejemplo mientras carga
  const [week, setWeek] = useState(weekSeed)
  const [drinks, setDrinks] = useState(drinkSeed)
  const [day, setDay] = useState(() => menuDay())
  const [build, setBuild] = useState({ ...buildSeed, available: true })
  const [loading, setLoading] = useState(true)
  const [avail, setAvail] = useState({ slots: [], stock: {}, ready: false, failed: false })

  // Cupos y stock del día: cambian con cada pedido, se consultan seguido pero solo con la pestaña a la vista
  const refreshAvail = useCallback(async () => {
    try {
      const a = await loadAvailability()
      setAvail({ slots: a.slots || [], stock: a.stock || {}, ready: true, failed: false })
    } catch {
      setAvail((x) => ({ ...x, ready: true, failed: true }))
    }
  }, [])

  useEffect(() => {
    refreshAvail()
    const t = setInterval(() => { if (!document.hidden) refreshAvail() }, AVAIL_MS)
    const onVisible = () => { if (!document.hidden) refreshAvail() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible) }
  }, [refreshAvail])

  const reload = useCallback(async () => {
    try {
      const [m, w, d, b] = await Promise.all([loadMenu(), loadWeek(), loadDrinks(), loadBuild()])
      setAll(m)
      setWeek(w)
      setDrinks(d)
      setBuild(b)
      refreshAvail()
    } catch {
      /* se queda con la carta que ya hay */
    } finally {
      setLoading(false)
    }
  }, [refreshAvail])

  useEffect(() => { reload() }, [reload])

  // El menú cambia al volver a la pestaña, no mientras alguien está pidiendo (se le vaciaría el carrito)
  useEffect(() => {
    const check = () => {
      if (document.hidden) return
      const next = menuDay()
      setDay((d) => (d.date.toDateString() === next.date.toDateString() ? d : next))
    }
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [])

  // items = carta del día: el carrito, el carrusel y "Volver a pedir" solo ven lo que hoy se puede pedir
  const items = useMemo(() => forDay(all, week, day.day), [all, week, day.day])
  const entradas = useMemo(() => items.filter((i) => i.cat === 'entrada'), [items])
  const drink = drinks[day.day] || DEFAULT_DRINK
  const value = useMemo(() => ({ items, entradas, drink, day, build, loading, reload, avail, refreshAvail, stock: avail.stock }), [items, entradas, drink, day, build, loading, reload, avail, refreshAvail])
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

export const useMenu = () => useContext(MenuContext)
