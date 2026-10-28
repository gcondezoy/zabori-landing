// "Arma tu plato": opciones de EJEMPLO (nombres y precios se editan en el panel → Carta).
// price = adicional sobre el precio base (0 = incluido).
export const buildSeed = {
  basePrice: 12,
  img: '/img/platos/m4.webp',
  groups: [
    { id: 'proteina', label: 'Proteína', min: 1, max: 1, sort: 1 },
    { id: 'carbo', label: 'Carbohidrato', min: 1, max: 1, sort: 2 },
    { id: 'acomp', label: 'Acompañamientos', min: 0, max: 2, sort: 3 },
    { id: 'crema', label: 'Cremas', min: 0, max: 2, sort: 4 },
  ],
  options: [
    { id: 'p-pollo', grp: 'proteina', name: 'Pollo a la plancha', price: 0, active: true, sort: 1 },
    { id: 'p-res', grp: 'proteina', name: 'Lomo de res', price: 3, active: true, sort: 2 },
    { id: 'p-pescado', grp: 'proteina', name: 'Pescado frito', price: 2, active: true, sort: 3 },
    { id: 'p-cerdo', grp: 'proteina', name: 'Chicharrón de cerdo', price: 2, active: true, sort: 4 },
    { id: 'p-tortilla', grp: 'proteina', name: 'Tortilla de verduras', price: 0, active: true, sort: 5 },
    { id: 'c-arroz', grp: 'carbo', name: 'Arroz blanco', price: 0, active: true, sort: 1 },
    { id: 'c-chaufa', grp: 'carbo', name: 'Arroz chaufa', price: 1, active: true, sort: 2 },
    { id: 'c-fritas', grp: 'carbo', name: 'Papas fritas', price: 1, active: true, sort: 3 },
    { id: 'c-sancochada', grp: 'carbo', name: 'Papa sancochada', price: 0, active: true, sort: 4 },
    { id: 'c-quinua', grp: 'carbo', name: 'Quinua', price: 1.5, active: true, sort: 5 },
    { id: 'a-menestra', grp: 'acomp', name: 'Menestra del día', price: 0, active: true, sort: 1 },
    { id: 'a-ensalada', grp: 'acomp', name: 'Ensalada fresca', price: 0, active: true, sort: 2 },
    { id: 'a-platano', grp: 'acomp', name: 'Plátano frito', price: 1, active: true, sort: 3 },
    { id: 'a-camote', grp: 'acomp', name: 'Camote frito', price: 1, active: true, sort: 4 },
    { id: 'a-choclo', grp: 'acomp', name: 'Choclo', price: 0, active: true, sort: 5 },
    { id: 'k-aji', grp: 'crema', name: 'Ají', price: 0, active: true, sort: 1 },
    { id: 'k-huancaina', grp: 'crema', name: 'Huancaína', price: 0, active: true, sort: 2 },
    { id: 'k-criolla', grp: 'crema', name: 'Salsa criolla', price: 0, active: true, sort: 3 },
    { id: 'k-tartara', grp: 'crema', name: 'Tártara', price: 0, active: true, sort: 4 },
  ],
}
