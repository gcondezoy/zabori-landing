// "Arma tu plato" fit: opciones de EJEMPLO (nombres, gramajes y precios se editan en el panel → Carta).
// - Proteínas: se elige la porción en gramos; cada porción tiene su precio (es el precio del plato).
// - Demás opciones: price = adicional (0 = incluido).
// - img = foto de la opción (fotos de referencia de Unsplash hasta tener las reales).
// - sub = subgrupo dentro del paso (ej. vegetales "Cocidos" / "Frescos"): el máximo del paso cuenta ambos juntos.
export const buildSeed = {
  basePrice: 0, // adicional fijo sobre el precio de la proteína
  img: '/img/arma/pollo.webp',
  groups: [
    { id: 'proteina', label: 'Proteína', min: 1, max: 1, sort: 1 },
    { id: 'carbo', label: 'Carbohidrato', min: 1, max: 1, sort: 2 },
    { id: 'acomp', label: 'Vegetales', min: 0, max: 2, sort: 3 },
    { id: 'crema', label: 'Aderezos', min: 0, max: 2, sort: 4 },
    { id: 'taper', label: 'Táper', min: 1, max: 1, sort: 5 },
  ],
  options: [
    { id: 'p-pollo', grp: 'proteina', name: 'Pechuga de pollo', price: 0, active: true, sort: 1, img: '/img/arma/pollo.webp',
      sizes: [{ g: 120, price: 15 }, { g: 180, price: 18 }, { g: 250, price: 22 }] },
    { id: 'p-res', grp: 'proteina', name: 'Lomo fino de res', price: 0, active: true, sort: 2, img: '/img/arma/res.webp',
      sizes: [{ g: 120, price: 18 }, { g: 180, price: 22 }, { g: 250, price: 27 }] },
    { id: 'p-pescado', grp: 'proteina', name: 'Filete de pescado', price: 0, active: true, sort: 3, img: '/img/arma/pescado.webp',
      sizes: [{ g: 120, price: 17 }, { g: 180, price: 21 }, { g: 250, price: 25 }] },
    { id: 'p-pavita', grp: 'proteina', name: 'Pavita al horno', price: 0, active: true, sort: 4, img: '/img/arma/pavita.webp',
      sizes: [{ g: 120, price: 16 }, { g: 180, price: 19 }, { g: 250, price: 23 }] },
    { id: 'c-arroz', grp: 'carbo', name: 'Arroz graneado', price: 0, active: true, sort: 1, img: '/img/arma/arroz.webp' },
    { id: 'c-quinua', grp: 'carbo', name: 'Quinua', price: 1.5, active: true, sort: 2, img: '/img/arma/quinua.webp' },
    { id: 'c-camote', grp: 'carbo', name: 'Camote al horno', price: 1, active: true, sort: 3, img: '/img/arma/camote.webp' },
    { id: 'c-papa', grp: 'carbo', name: 'Papa sancochada', price: 0, active: true, sort: 4, img: '/img/arma/papa.webp' },
    { id: 'c-sin', grp: 'carbo', name: 'Sin carbohidrato (doble ensalada)', price: 0, active: true, sort: 5, img: '/img/arma/sin-carbo.webp' },
    { id: 'a-brocoli', grp: 'acomp', sub: 'Cocidos', name: 'Brócoli al vapor', price: 0, active: true, sort: 1, img: '/img/arma/brocoli.webp' },
    { id: 'a-vainitas', grp: 'acomp', sub: 'Cocidos', name: 'Vainitas salteadas', price: 0, active: true, sort: 2, img: '/img/arma/vainitas.webp' },
    { id: 'a-zanahoria', grp: 'acomp', sub: 'Cocidos', name: 'Zanahoria salteada', price: 0, active: true, sort: 3, img: '/img/arma/zanahoria.webp' },
    { id: 'a-choclo', grp: 'acomp', sub: 'Cocidos', name: 'Choclo', price: 0, active: true, sort: 4, img: '/img/arma/choclo.webp' },
    { id: 'f-ensalada', grp: 'acomp', sub: 'Frescos', name: 'Ensalada verde', price: 0, active: true, sort: 5, img: '/img/arma/ensalada.webp' },
    { id: 'f-tomate', grp: 'acomp', sub: 'Frescos', name: 'Tomate y pepino', price: 0, active: true, sort: 6, img: '/img/arma/tomate-pepino.webp' },
    { id: 'f-palta', grp: 'acomp', sub: 'Frescos', name: 'Palta', price: 2, active: true, sort: 7, img: '/img/arma/palta.webp' },
    { id: 'k-vinagreta', grp: 'crema', name: 'Vinagreta de limón', price: 0, active: true, sort: 1, img: '/img/arma/vinagreta.webp' },
    { id: 'k-yogur', grp: 'crema', name: 'Yogur con hierbas', price: 0, active: true, sort: 2, img: '/img/arma/yogur.webp' },
    { id: 'k-huacatay', grp: 'crema', name: 'Crema de huacatay', price: 0, active: true, sort: 3, img: '/img/arma/huacatay.webp' },
    { id: 'k-criolla', grp: 'crema', name: 'Salsa criolla', price: 0, active: true, sort: 4, img: '/img/arma/criolla.webp' },
    { id: 't-bagazo', grp: 'taper', name: 'Táper de bagazo (biodegradable)', price: 0.5, active: true, sort: 1, img: '/img/taper/bagazo-foto.webp' },
    { id: 't-kraft', grp: 'taper', name: 'Bowl kraft con tapa', price: 1, active: true, sort: 2, img: '/img/taper/kraft.svg' },
    { id: 't-reutilizable', grp: 'taper', name: 'Táper reutilizable hermético', price: 2, active: true, sort: 3, img: '/img/taper/reutilizable-foto.webp' },
  ],
}
