// Datos del negocio. Reemplazar los placeholders cuando el cliente los entregue.
export const site = {
  name: 'Zabori',
  tagline: 'Menú casero del día',
  whatsapp: '51900000000', // PLACEHOLDER
  whatsappLabel: '900 000 000', // PLACEHOLDER
  address: 'Lima, Perú (dirección por confirmar)', // PLACEHOLDER
  schedule: 'Lunes a sábado · 11:00 a 15:00',
  deliveryFee: 3, // S/ por delivery
  freeDeliveryFrom: 40, // S/ pedido mínimo para delivery gratis
  adminDemoPin: 'zabori', // solo para el panel en modo demo (sin Supabase); con Supabase se usa la tabla admins
}

export const money = (n) => `S/ ${n.toFixed(2)}`
