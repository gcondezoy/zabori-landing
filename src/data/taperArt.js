// Fondo de "Arma tu plato": imagen del táper VACÍO visto desde arriba + dónde cae cada ingrediente.
// Para usar una FOTO REAL del táper del cliente: subirla a public/img/taper/, cambiar `img` y `aspect`,
// y ajustar las posiciones (en % del ancho/alto de la imagen) para que coincidan con sus compartimentos.
//   l = izquierda, t = arriba, w = ancho, h = alto, r = redondeo de las esquinas (CSS)
export const taperArt = {
  't-bagazo': {
    img: '/img/taper/top-bagazo.svg',
    aspect: '4 / 3',
    slots: {
      main: { l: 7.5, t: 10, w: 47.5, h: 80, r: '20px' },
      carb: { l: 58, t: 10, w: 34.5, h: 38, r: '18px' },
      veg: { l: 58, t: 52, w: 34.5, h: 38, r: '18px' },
    },
  },
  't-reutilizable': {
    img: '/img/taper/top-reutilizable.svg',
    aspect: '4 / 3',
    slots: {
      main: { l: 7.5, t: 10, w: 47.5, h: 80, r: '16px' },
      carb: { l: 58, t: 10, w: 34.5, h: 38, r: '14px' },
      veg: { l: 58, t: 52, w: 34.5, h: 38, r: '14px' },
    },
  },
  // Bowl redondo: todo cae dentro del círculo interior (mitad proteína, cuartos carbo y vegetales)
  't-kraft': {
    img: '/img/taper/top-kraft.svg',
    aspect: '1 / 1',
    round: { l: 10, t: 10, w: 80, h: 80 },
    slots: {
      main: { l: 10, t: 10, w: 39.6, h: 80, r: '0' },
      carb: { l: 50.4, t: 10, w: 39.6, h: 39.6, r: '0' },
      veg: { l: 50.4, t: 50.4, w: 39.6, h: 39.6, r: '0' },
    },
  },
}

// Mientras no se elija táper se muestra el de bagazo
export const DEFAULT_TAPER = 't-bagazo'
