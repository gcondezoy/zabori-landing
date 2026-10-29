// Datos del negocio. Reemplazar los placeholders cuando el cliente los entregue.
export const site = {
  name: 'Zabori',
  slogan: 'El sabor de elegir bien',
  tagline: 'Menú casero del día',
  whatsapp: '51900000000', // PLACEHOLDER
  whatsappLabel: '900 000 000', // PLACEHOLDER
  address: 'Lima, Perú (dirección por confirmar)', // PLACEHOLDER
  schedule: 'Lunes a sábado · 11:00 a 15:00',
  openDays: [1, 2, 3, 4, 5, 6], // 0 = domingo
  openHour: 11,
  closeHour: 15,
  // Opiniones: son de EJEMPLO. Reemplazar por reseñas reales de clientes y poner testimonialsAreExamples en false.
  testimonialsAreExamples: true,
  testimonials: [
    { name: 'Cliente de ejemplo', place: 'Los Olivos', text: 'El lomo saltado llegó caliente y la porción es generosa. Ya es mi almuerzo de la semana.', stars: 5 },
    { name: 'Cliente de ejemplo', place: 'San Martín de Porres', text: 'Pido como invitado desde el celular en un minuto. Muy práctico para la oficina.', stars: 5 },
    { name: 'Cliente de ejemplo', place: 'Independencia', text: 'Sabor de casa y buen precio. El menú marino de los viernes es lo mejor.', stars: 4 },
  ],
  deliveryFee: 3, // S/ por delivery
  freeDeliveryFrom: 40, // S/ pedido mínimo para delivery gratis
  adminDemoPin: 'zabori', // solo para el panel en modo demo (sin Supabase); con Supabase se usa la tabla admins
}

export const money = (n) => `S/ ${n.toFixed(2)}`
