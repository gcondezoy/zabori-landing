// Service worker de Zabori: solo muestra las notificaciones del estado del pedido. No guarda nada en caché.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data.json() } catch { /* sin datos: aviso genérico */ }
  event.waitUntil(Promise.all([
    self.registration.showNotification(data.title || 'Zabori', {
      body: data.body || 'Tu pedido tiene novedades.',
      icon: '/icon-192.png',
      tag: data.code || 'zabori', // un aviso nuevo del mismo pedido reemplaza al anterior
      renotify: true,
      data: { url: data.url || '/#/seguir' },
    }),
    // Si la web está abierta, se entera al momento y actualiza el estado del pedido
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((open) => open.forEach((c) => c.postMessage({ type: 'order-update', code: data.code }))),
  ]))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/#/seguir'
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const client = open.find((c) => new URL(c.url).origin === self.location.origin)
    if (client) {
      await client.focus()
      return client.navigate(url)
    }
    return self.clients.openWindow(url)
  })())
})
