import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { loadMenu } from '../lib/menu'
import { items as seed } from '../data/menu'

const MenuContext = createContext(null)

export function MenuProvider({ children }) {
  const [items, setItems] = useState(seed) // se muestra la carta de ejemplo mientras carga
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      setItems(await loadMenu())
    } catch {
      /* se queda con la carta que ya hay */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const value = useMemo(() => ({ items, loading, reload }), [items, loading, reload])
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

export const useMenu = () => useContext(MenuContext)
