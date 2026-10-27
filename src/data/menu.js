// Menú de ejemplo (placeholder). Cada plato tiene un tono para su tarjeta hasta tener fotos reales.
export const categories = [
  { id: 'menu', label: 'Menú del día' },
  { id: 'extras', label: 'Extras' },
  { id: 'bebidas', label: 'Bebidas' },
]

export const items = [
  { id: 'm1', cat: 'menu', name: 'Menú Criollo', desc: 'Entrada del día, lomo saltado con arroz y papas, refresco.', price: 14, tone: '#034d5b', tag: 'Más pedido' },
  { id: 'm2', cat: 'menu', name: 'Menú Marino', desc: 'Entrada del día, arroz con mariscos, refresco.', price: 16, tone: '#0b6b7a' },
  { id: 'm3', cat: 'menu', name: 'Menú Casero', desc: 'Entrada del día, seco de res con frejoles, refresco.', price: 13, tone: '#a87400' },
  { id: 'm4', cat: 'menu', name: 'Menú Ligero', desc: 'Ensalada fresca, pollo a la plancha con puré, refresco.', price: 13, tone: '#1f6f5c', tag: 'Saludable' },
  { id: 'e1', cat: 'extras', name: 'Entrada extra', desc: 'Sopa o ensalada del día.', price: 5, tone: '#7a5a14' },
  { id: 'e2', cat: 'extras', name: 'Postre del día', desc: 'Mazamorra, gelatina o fruta.', price: 4, tone: '#b3541e' },
  { id: 'b1', cat: 'bebidas', name: 'Chicha morada 500 ml', desc: 'Hecha en casa.', price: 4, tone: '#2c4a7a' },
  { id: 'b2', cat: 'bebidas', name: 'Limonada frozen', desc: 'Con hierbabuena.', price: 5, tone: '#5f8a1c' },
]
