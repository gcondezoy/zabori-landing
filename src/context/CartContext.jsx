import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { useMenu } from './MenuContext'
import { site } from '../config/site'
import { CART_PREFIX, idsFromKey, chosen, missingGroup, buildDetail, buildPrice } from '../lib/build'

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
  const { items: catalog, build } = useMenu()

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(qty))
    } catch {}
  }, [qty])

  const value = useMemo(() => {
    // Un plato armado se guarda como "arma|op1,op2,..."; si alguna opción ya no existe, la línea se descarta
    const custom = (key) => {
      const ids = idsFromKey(key)
      if (!build.available || chosen(build, ids).length !== ids.length || missingGroup(build, ids)) return null
      return { id: key, isCustom: true, options: ids, name: 'Arma tu plato', detail: buildDetail(build, ids), price: buildPrice(build, ids), img: build.img }
    }
    const lines = Object.entries(qty)
      .map(([id, n]) => ({ item: id.startsWith(CART_PREFIX) ? custom(id) : catalog.find((i) => i.id === id), n }))
      .filter((l) => l.item)
    const subtotal = lines.reduce((s, l) => s + l.item.price * l.n, 0)
    const count = lines.reduce((s, l) => s + l.n, 0)
    const deliveryFor = (mode) =>
      mode === 'delivery' && subtotal > 0 && subtotal < site.freeDeliveryFrom ? site.deliveryFee : 0
    return {
      qty, lines, subtotal, count, deliveryFor,
      add: (id, times = 1) => { for (let i = 0; i < times; i++) dispatch({ type: 'add', id }) },
      dec: (id) => dispatch({ type: 'dec', id }),
      remove: (id) => dispatch({ type: 'remove', id }),
      clear: () => dispatch({ type: 'clear' }),
      open, setOpen, checkout, setCheckout,
    }
  }, [qty, open, checkout, catalog, build])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
