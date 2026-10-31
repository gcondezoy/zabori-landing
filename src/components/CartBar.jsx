import { ShoppingBag, CaretRight } from '@phosphor-icons/react'
import { useCart } from '../context/CartContext'
import { money } from '../config/site'

// Barra fija inferior (solo celular) cuando hay algo en el carrito
export default function CartBar() {
  const { count, subtotal, open, checkout, setOpen } = useCart()
  const visible = count > 0 && !open && !checkout
  return (
    <div className={`cart-bar${visible ? ' show' : ''}`} aria-hidden={!visible}>
      <button onClick={() => setOpen(true)} tabIndex={visible ? 0 : -1}>
        <span className="cb-icon"><ShoppingBag size={20} weight="bold" /><b key={count} className="bump">{count}</b></span>
        <span className="cb-text">Ver mi pedido</span>
        <span className="cb-total"><span key={subtotal} className="bump">{money(subtotal)}</span> <CaretRight size={16} weight="bold" /></span>
      </button>
    </div>
  )
}
