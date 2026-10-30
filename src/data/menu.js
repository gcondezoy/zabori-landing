// Menú de ejemplo (placeholder). Fotos de referencia de Unsplash (licencia libre) hasta tener las reales;
// el tono se usa como fondo mientras carga la foto o si un plato nuevo no tiene foto.
export const categories = [
  { id: 'menu', label: 'Menú del día' },
  { id: 'arma', label: 'Arma tu plato' },
  { id: 'shots', label: 'Shots' },
]

export const items = [
  { id: 'm1', img: '/img/platos/m1.webp', cat: 'menu', name: 'Menú Criollo', desc: 'Entrada del día, lomo saltado con arroz y papas, refresco.', price: 10, tone: '#034d5b', tag: 'Más pedido' },
  { id: 'm2', img: '/img/platos/m2.webp', cat: 'menu', name: 'Menú Marino', desc: 'Entrada del día, arroz con mariscos, refresco.', price: 10, tone: '#0b6b7a' },
  { id: 'm3', img: '/img/platos/m3.webp', cat: 'menu', name: 'Menú Casero', desc: 'Entrada del día, seco de res con frejoles, refresco.', price: 10, tone: '#a87400' },
  { id: 'm4', img: '/img/platos/m4.webp', cat: 'menu', name: 'Menú Ligero', desc: 'Ensalada fresca, pollo a la plancha con puré, refresco.', price: 10, tone: '#1f6f5c', tag: 'Saludable' },
  { id: 'arma', cat: 'arma', name: 'Arma tu plato', desc: 'Fit: proteína por gramos, carbohidrato, vegetales cocidos y frescos, y aderezos.', price: 0, tone: '#034d5b' },
  // Shots de EJEMPLO (nombres, ingredientes y precios por confirmar con el cliente)
  { id: 's1', img: '/img/platos/s1.webp', cat: 'shots', name: 'Shot de jengibre y limón', desc: 'Jengibre fresco, limón y una pizca de miel.', price: 5, tone: '#a87400' },
  { id: 's2', img: '/img/platos/s2.webp', cat: 'shots', name: 'Shot verde', desc: 'Espinaca, manzana verde y apio.', price: 5, tone: '#1f6f5c', tag: 'Detox' },
  { id: 's3', img: '/img/platos/s3.webp', cat: 'shots', name: 'Shot de cúrcuma y naranja', desc: 'Cúrcuma, naranja y pimienta negra.', price: 5, tone: '#b3541e' },
]
