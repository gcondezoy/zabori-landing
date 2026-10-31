import { X, Plus, Minus, Trash } from '@phosphor-icons/react'
import { useCart } from '../context/CartContext'
import { useMenu } from '../context/MenuContext'
import { money } from '../config/site'
import { useExit } from '../lib/useExit'

export default function CartDrawer() {
  const { open, setOpen, lines, subtotal, add, dec, remove, setCheckout, qty } = useCart()
  const { items } = useMenu()
  const { shown, leaving } = useExit(open)
  if (!shown) return null
  const extras = items.filter((i) => i.cat === 'shots' && !qty[i.id]) // lo que aún no está en el pedido
  const go = () => { setOpen(false); setCheckout(true) }
  return (
    <div className={`overlay${leaving ? ' leaving' : ''}`} onClick={() => setOpen(false)}>
      <aside className="drawer" role="dialog" aria-label="Carrito" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h3>Tu pedido</h3>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={22} /></button>
        </div>
        {lines.length === 0 ? (
          <p className="empty">Tu carrito está vacío. Agrega algo del menú.</p>
        ) : (
          <>
            <div className="drawer-scroll">
            <ul className="lines">
              {lines.map(({ item, n }) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    {item.detail && <small className="line-detail">{item.detail}</small>}
                    <span key={n} className="bump">{money(item.price * n)}</span>
                  </div>
                  <div className="stepper">
                    <button onClick={() => dec(item.id)} aria-label="Quitar uno"><Minus weight="bold" /></button>
                    <span key={n} className="bump">{n}</span>
                    <button onClick={() => add(item.id)} aria-label="Agregar uno"><Plus weight="bold" /></button>
                  </div>
                  <button className="icon-btn" onClick={() => remove(item.id)} aria-label="Eliminar"><Trash size={18} /></button>
                </li>
              ))}
            </ul>
            {extras.length > 0 && (
              <section className="cart-extras" aria-label="Sugerencias">
                <h4>¿Le sumas un shot?</h4>
                <ul>
                  {extras.map((i) => (
                    <li key={i.id}>
                      <span><b>{i.name}</b><small>{money(i.price)}</small></span>
                      <button className="btn ghost small" onClick={() => add(i.id)} aria-label={`Agregar ${i.name}`}><Plus size={14} weight="bold" /> Agregar</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            </div>
            <div className="drawer-foot">
              <div className="row"><span>Subtotal</span><strong key={subtotal} className="bump">{money(subtotal)}</strong></div>
              <button className="btn primary block" onClick={go}>Continuar</button>
              <button className="btn ghost block" onClick={() => setOpen(false)}>Seguir pidiendo</button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
