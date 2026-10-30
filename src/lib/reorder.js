// "Volver a pedir": reconstruye las líneas del carrito de un pedido anterior con la carta y opciones de hoy.
import { cartKey, menuKey, taperOptions, missingGroup, needsPick, sizeId, hasSizes } from './build'

const ENTRADA = 'Entrada: '

// items = [{ itemId, name, detail, qty }] (de listMyOrders)
// Devuelve { lines: [{ key, qty }], missing: [nombres que ya no se pueden pedir] }
export function reorderLines(items, catalog, build) {
  const lines = []
  const missing = []
  // Nombre del detalle -> id de la opción (con porción: "Pechuga de pollo 180 g" -> "p-pollo@180")
  const idFor = (name) => {
    const plain = build.options.find((o) => o.name === name && !hasSizes(o))
    if (plain) return plain.id
    const m = /^(.*) (\d+) g$/.exec(name)
    const o = m && build.options.find((x) => x.name === m[1] && hasSizes(x) && x.sizes.some((s) => s.g === Number(m[2])))
    return o ? sizeId(o.id, Number(m[2])) : null
  }

  items.forEach((i) => {
    // Plato armado: las opciones se recuperan por su nombre en el detalle
    if (i.itemId === 'arma' || (!i.itemId && i.name === 'Arma tu plato')) {
      const ids = (i.detail || '').split(' · ').map(idFor)
      if (!ids.length || ids.some((x) => !x) || missingGroup(build, ids)) { missing.push(i.name); return }
      lines.push({ key: cartKey(ids), qty: i.qty })
      return
    }
    const item = catalog.find((c) => c.id === i.itemId) || catalog.find((c) => c.name === i.name)
    if (!item || item.active === false) { missing.push(i.name); return }
    const entradas = catalog.filter((c) => c.cat === 'entrada')
    if (needsPick(item, build, entradas)) {
      // El detalle guarda "Entrada: Sopa · Bowl kraft"
      const parts = (i.detail || '').split(' · ')
      const eName = parts.find((p) => p.startsWith(ENTRADA))?.slice(ENTRADA.length)
      const tName = parts.find((p) => !p.startsWith(ENTRADA))
      // Si esa entrada no sale hoy no se cambia por otra: el cliente elige de nuevo
      const entrada = entradas.find((e) => e.name === eName)
      if (entradas.length && !entrada) { missing.push(eName ? `${i.name} con ${eName}` : i.name); return }
      // Mismo táper que la vez pasada; si ya no existe, el primero disponible
      const taper = taperOptions(build).find((t) => t.name === tName) || taperOptions(build)[0]
      lines.push({ key: menuKey(item.id, taper?.id, entrada?.id), qty: i.qty })
      return
    }
    lines.push({ key: item.id, qty: i.qty })
  })
  return { lines, missing }
}
