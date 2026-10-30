// Datos del negocio. Reemplazar los placeholders cuando el cliente los entregue.
export const site = {
  name: 'Zabori',
  slogan: 'El sabor de elegir bien',
  tagline: 'Menú casero del día',
  whatsapp: '51900000000', // PLACEHOLDER
  whatsappLabel: '900 000 000', // PLACEHOLDER
  address: 'Lima, Perú (dirección por confirmar)', // PLACEHOLDER
  // Billeteras: el cliente paga y envía la captura por WhatsApp; se confirma en el panel ("Marcar pagado").
  // qr = ruta de la imagen del QR (p. ej. '/img/pagos/yape.png'); vacío = se muestra solo el número.
  wallets: {
    yape: { label: 'Yape', number: '900 000 000', holder: 'Zabori (titular por confirmar)', qr: '' }, // PLACEHOLDER
    plin: { label: 'Plin', number: '900 000 000', holder: 'Zabori (titular por confirmar)', qr: '' }, // PLACEHOLDER
  },
  schedule: 'Lunes a sábado · 11:00 a 15:00',
  openDays: [1, 2, 3, 4, 5, 6], // 0 = domingo
  openHour: 11,
  closeHour: 15,
  menuPrice: 10, // S/ precio único de todos los menús del día (se cambia desde el panel, Carta)
  deliveryFee: 3, // S/ por delivery
  freeDeliveryFrom: 40, // S/ pedido mínimo para delivery gratis
  adminDemoPin: 'zabori', // solo para el panel en modo demo (sin Supabase); con Supabase se usa la tabla admins
}

export const money = (n) => `S/ ${n.toFixed(2)}`
