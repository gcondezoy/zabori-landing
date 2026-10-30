// Menú de ejemplo (placeholder). Fotos de referencia de Unsplash (licencia libre) hasta tener las reales;
// el tono se usa como fondo mientras carga la foto o si un plato nuevo no tiene foto.
export const categories = [
  { id: 'menu', label: 'Menú del día' },
  { id: 'arma', label: 'Arma tu plato' },
  { id: 'shots', label: 'Shots' },
]

// Plan de ejemplo: día de la semana (1 = lunes) -> menús en orden; el primero sale destacado
export const weekSeed = {
  1: ['m1', 'm2', 'm3', 'e1', 'e2', 'e3'],
  2: ['m3', 'm4', 'm1', 'e2', 'e4', 'e1'],
  3: ['m2', 'm1', 'm4', 'e3', 'e1', 'e4'],
  4: ['m4', 'm3', 'm2', 'e1', 'e3', 'e2'],
  5: ['m1', 'm4', 'm2', 'e4', 'e2', 'e1'],
  6: ['m2', 'm3', 'm4', 'e2', 'e3', 'e4'],
}

// Bebida del día: viene incluida en el menú, el cliente no la elige
export const drinkSeed = { 1: 'Chicha morada', 2: 'Limonada', 3: 'Maracuyá', 4: 'Chicha morada', 5: 'Limonada', 6: 'Emoliente' }

export const items = [
  { id: 'm1', img: '/img/platos/m1.webp', cat: 'menu', name: 'Lomo saltado', desc: 'Con arroz y papas fritas.', price: 10, tone: '#034d5b', tag: 'Más pedido' },
  { id: 'm2', img: '/img/platos/m2.webp', cat: 'menu', name: 'Arroz con mariscos', desc: 'Con salsa criolla.', price: 10, tone: '#0b6b7a' },
  { id: 'm3', img: '/img/platos/m3.webp', cat: 'menu', name: 'Seco de res', desc: 'Con frejoles y arroz.', price: 10, tone: '#a87400' },
  { id: 'm4', img: '/img/platos/m4.webp', cat: 'menu', name: 'Pollo a la plancha', desc: 'Con puré y ensalada.', price: 10, tone: '#1f6f5c', tag: 'Saludable' },
  // Entradas de EJEMPLO: no se piden solas, el cliente elige una al agregar su menú
  { id: 'e1', cat: 'entrada', name: 'Sopa de casa', desc: '', price: 0, tone: '#a87400' },
  { id: 'e2', cat: 'entrada', name: 'Ensalada fresca', desc: '', price: 0, tone: '#1f6f5c' },
  { id: 'e3', cat: 'entrada', name: 'Papa a la huancaína', desc: '', price: 0, tone: '#a87400' },
  { id: 'e4', cat: 'entrada', name: 'Tequeños', desc: '', price: 0, tone: '#b3541e' },
  { id: 'arma', cat: 'arma', name: 'Arma tu plato', desc: 'Fit: proteína por gramos, carbohidrato, vegetales cocidos y frescos, y aderezos.', price: 0, tone: '#034d5b' },
  // Shots de EJEMPLO (nombres, ingredientes y precios por confirmar con el cliente)
  { id: 's1', img: '/img/platos/s1.webp', cat: 'shots', name: 'Shot de jengibre y limón', desc: 'Jengibre fresco, limón y una pizca de miel.', price: 5, tone: '#a87400' },
  { id: 's2', img: '/img/platos/s2.webp', cat: 'shots', name: 'Shot verde', desc: 'Espinaca, manzana verde y apio.', price: 5, tone: '#1f6f5c', tag: 'Detox' },
  { id: 's3', img: '/img/platos/s3.webp', cat: 'shots', name: 'Shot de cúrcuma y naranja', desc: 'Cúrcuma, naranja y pimienta negra.', price: 5, tone: '#b3541e' },
]
