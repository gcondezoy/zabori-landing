// Lo que ve el cliente de su pedido: recibido → pagado → entregado.
// "Pagado" sale del pago confirmado en el panel; "Entregado", del estado del pedido.
export const PROGRESS = [['recibido', 'Pedido recibido'], ['pagado', 'Pagado'], ['entregado', 'Entregado']]

export const progressOf = (o) => (o.status === 'entregado' ? 2 : o.payment === 'pagado' ? 1 : 0)

// Hora en que el pedido llegó a cada paso (según su historial)
export function reachedAt(o, step) {
  if (step === 'recibido') return o.createdAt
  const [type, value] = step === 'pagado' ? ['payment', 'pagado'] : ['status', 'entregado']
  return [...(o.history || [])].reverse().find((h) => h.type === type && h.value === value)?.at || null
}
