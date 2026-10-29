// "Volver a pedir": reconstruye las líneas del carrito de un pedido anterior con la carta y opciones de hoy.
import { cartKey, taperKey, taperOptions, missingGroup, needsTaper } from './build'

// items = [{ itemId, name, detail, qty }] (de listMyOrders)
// Devuelve { lines: [{ key, qty }], missing: [nombres que ya no se pueden pedir] }
export function reorderLines(items, catalog, build) {
  const lines = []
  const missing = []
  const byName = (name) => build.options.find((o) => o.name === name)

  items.forEach((i) => {
    // Plato armado: las opciones se recuperan por su nombre en el detalle
    if (i.itemId === 'arma' || (!i.itemId && i.name === 'Arma tu plato')) {
      const ids = (i.detail || '').split(' · ').map((n) => byName(n)?.id)
      if (!ids.length || ids.some((x) => !x) || missingGroup(build, ids)) { missing.push(i.name); return }
      lines.push({ key: cartKey(ids), qty: i.qty })
      return
    }
    const item = catalog.find((c) => c.id === i.itemId) || catalog.find((c) => c.name === i.name)
    if (!item || item.active === false) { missing.push(i.name); return }
    if (needsTaper(item, build)) {
      // Mismo táper que la vez pasada; si ya no existe, el primero disponible
      const taper = taperOptions(build).find((t) => t.name === i.detail) || taperOptions(build)[0]
      lines.push({ key: taperKey(item.id, taper.id), qty: i.qty })
      return
    }
    lines.push({ key: item.id, qty: i.qty })
  })
  return { lines, missing }
}
