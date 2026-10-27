import { X, Plus, Minus, Trash } from '@phosphor-icons/react'
import { useCart } from '../context/CartContext'
import { money } from '../config/site'

export default function CartDrawer() {
  const { open, setOpen, lines, subtotal, add, dec, remove, setCheckout } = useCart()
  if (!open) return null
  const go = () => { setOpen(false); setCheckout(true) }
  return (
    <div className="overlay" onClick={() => setOpen(false)}>
      <aside className="drawer" role="dialog" aria-label="Carrito" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h3>Tu pedido</h3>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={22} /></button>
        </div>
        {lines.length === 0 ? (
          <p className="empty">Tu carrito está vacío. Agrega algo del menú.</p>
        ) : (
          <>
            <ul className="lines">
              {lines.map(({ item, n }) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{money(item.price * n)}</span>
                  </div>
                  <div className="stepper">
                    <button onClick={() => dec(item.id)} aria-label="Quitar uno"><Minus weight="bold" /></button>
                    <span>{n}</span>
                    <button onClick={() => add(item.id)} aria-label="Agregar uno"><Plus weight="bold" /></button>
                  </div>
                  <button className="icon-btn" onClick={() => remove(item.id)} aria-label="Eliminar"><Trash size={18} /></button>
                </li>
              ))}
            </ul>
            <div className="drawer-foot">
              <div className="row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <button className="btn primary block" onClick={go}>Continuar</button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
