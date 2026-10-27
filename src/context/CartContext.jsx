import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { useMenu } from './MenuContext'
import { site } from '../config/site'

const CartContext = createContext(null)
const KEY = 'zabori-cart'

function reducer(state, action) {
  switch (action.type) {
    case 'add':
      return { ...state, [action.id]: (state[action.id] || 0) + 1 }
    case 'dec': {
      const next = { ...state }
      if ((next[action.id] || 0) <= 1) delete next[action.id]
      else next[action.id] -= 1
      return next
    }
    case 'remove': {
      const next = { ...state }
      delete next[action.id]
      return next
    }
    case 'clear':
      return {}
    default:
      return state
  }
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

export function CartProvider({ children }) {
  const [qty, dispatch] = useReducer(reducer, undefined, load)
  const [open, setOpen] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const { items: catalog } = useMenu()

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(qty))
    } catch {}
  }, [qty])

  const value = useMemo(() => {
    const lines = Object.entries(qty)
      .map(([id, n]) => ({ item: catalog.find((i) => i.id === id), n }))
      .filter((l) => l.item)
    const subtotal = lines.reduce((s, l) => s + l.item.price * l.n, 0)
    const count = lines.reduce((s, l) => s + l.n, 0)
    const deliveryFor = (mode) =>
      mode === 'delivery' && subtotal > 0 && subtotal < site.freeDeliveryFrom ? site.deliveryFee : 0
    return {
      qty, lines, subtotal, count, deliveryFor,
      add: (id) => dispatch({ type: 'add', id }),
      dec: (id) => dispatch({ type: 'dec', id }),
      remove: (id) => dispatch({ type: 'remove', id }),
      clear: () => dispatch({ type: 'clear' }),
      open, setOpen, checkout, setCheckout,
    }
  }, [qty, open, checkout, catalog])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
