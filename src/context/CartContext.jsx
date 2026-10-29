import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { useMenu } from './MenuContext'
import { site } from '../config/site'
import { CART_PREFIX, TAPER_SEP, idsFromKey, chosen, missingGroup, buildDetail, buildPrice, taperOptions, needsTaper } from '../lib/build'

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
  const [pickFor, setPickFor] = useState(null) // menú esperando que el cliente elija su táper
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
    // Un menú del día se guarda con su táper: "m1~t-kraft" (precio = menú + táper)
    const tapers = taperOptions(build)
    const withTaper = (key) => {
      const [baseId, taperId] = key.split(TAPER_SEP)
      const base = catalog.find((i) => i.id === baseId)
      const taper = tapers.find((t) => t.id === taperId)
      if (!base || !taper) return null
      return { ...base, id: key, baseId, taper: taperId, detail: taper.name, price: base.price + taper.price }
    }
    const plain = (key) => {
      const item = catalog.find((i) => i.id === key)
      return item && needsTaper(item, build) ? null : item // un menú sin táper ya no es válido
    }
    const lines = Object.entries(qty)
      .map(([id, n]) => ({
        item: id.startsWith(CART_PREFIX) ? custom(id) : id.includes(TAPER_SEP) ? withTaper(id) : plain(id),
        n,
      }))
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
      // Agregar desde una tarjeta: si el plato necesita táper, primero se pregunta cuál
      requestAdd: (item) => (needsTaper(item, build) ? setPickFor(item) : dispatch({ type: 'add', id: item.id })),
      // Unidades de un plato en el carrito, sumando todas sus variantes de táper
      countOf: (id) => Object.entries(qty).reduce((s, [k, n]) => (k === id || k.startsWith(id + TAPER_SEP) ? s + n : s), 0),
      pickFor, setPickFor,
      open, setOpen, checkout, setCheckout,
    }
  }, [qty, open, checkout, catalog, build, pickFor])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
