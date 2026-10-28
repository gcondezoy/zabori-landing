import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { loadMenu } from '../lib/menu'
import { loadBuild } from '../lib/build'
import { items as seed } from '../data/menu'
import { buildSeed } from '../data/build'

const MenuContext = createContext(null)

export function MenuProvider({ children }) {
  const [items, setItems] = useState(seed) // se muestra la carta de ejemplo mientras carga
  const [build, setBuild] = useState({ ...buildSeed, available: true })
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const [m, b] = await Promise.all([loadMenu(), loadBuild()])
      setItems(m)
      setBuild(b)
    } catch {
      /* se queda con la carta que ya hay */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const value = useMemo(() => ({ items, build, loading, reload }), [items, build, loading, reload])
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

export const useMenu = () => useContext(MenuContext)
