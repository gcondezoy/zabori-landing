# Conectar Zabori a Supabase

Sin esto la web funciona en **modo demo** (cuentas y pedidos solo en el navegador).

1. Crear un proyecto en https://supabase.com.
2. SQL Editor → pegar todo `supabase/setup.sql` → Run (se puede repetir sin problema).
3. Project Settings → API: copiar la **Project URL** y la clave **anon public**.
4. Crear `.env.local` en la raíz (ver `.env.example`):
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Reiniciar `npm run dev`.
6. Authentication → Providers → Email: para probar rápido, desactivar "Confirm email"; en producción déjalo activo.

## Cómo funciona la seguridad
- El navegador **nunca manda precios**: la función `create_order()` los lee de `menu_items` y calcula subtotal, delivery y total.
- Invitados y clientes registrados usan la misma función; si hay sesión, el pedido queda ligado a `user_id`.
- **Arma tu plato:** el navegador solo manda las opciones elegidas. `create_order()` comprueba que existan y estén disponibles, que se cumplan los mínimos/máximos de cada grupo (`build_groups`) y calcula precio base (`menu_items` 'arma') + adicionales (`build_options`). La composición queda en `order_items.detail`.
- RLS: cada cliente solo ve su perfil y sus pedidos. Nadie inserta pedidos directamente.
- Si cambias la tarifa de delivery en `src/config/site.js`, cámbiala también en `create_order()` (constantes al inicio).
- Si cambias platos o precios en `src/data/menu.js`, actualiza `menu_items` (la etapa 4 traerá un panel para esto).

# Activar el pago con tarjeta (Culqi, etapa 3)

Sin la llave de Culqi el checkout sigue en modo demo (guarda el pedido pero no cobra).

1. Crear cuenta en https://culqi.com y entrar al CulqiPanel → Desarrollo → API Keys (modo **integración / pruebas**).
2. Llave **pública** (`pk_test_...`) → `.env.local`:
   ```
   VITE_CULQI_PUBLIC_KEY=pk_test_xxxxxxxx
   ```
3. Llave **secreta** (`sk_test_...`) → solo como secreto de la Edge Function, nunca en el frontend:
   ```
   npm i -g supabase
   supabase login
   supabase link --project-ref TU_PROJECT_REF
   supabase secrets set CULQI_SECRET_KEY=sk_test_xxxxxxxx
   supabase functions deploy pay-order
   ```
4. Reiniciar `npm run dev` y probar con las tarjetas de prueba de Culqi (docs.culqi.com → Pruebas).
5. Para producción: cambiar a `pk_live_` / `sk_live_` cuando Culqi apruebe la cuenta.

## Cómo se cobra
1. El cliente confirma → se crea el pedido (`create_order`, pago `pendiente`).
2. Culqi Checkout abre el formulario y entrega un **token** (los datos de tarjeta nunca pasan por Zabori).
3. La Edge Function `pay-order` reserva el pedido (`procesando`, evita doble cobro), lee el **monto de la base de datos**, cobra en `api.culqi.com/v2/charges` y deja `pagado` o `fallido`.
4. Si el pago falla o se cierra la ventana, el cliente puede reintentar con el mismo pedido.

## Pendiente a tener en cuenta
- Culqi Checkout v4 avisa que será retirado y recomienda "Checkout Custom"; hay que migrar antes de esa fecha.
- Los pedidos abandonados quedan como `pendiente` sin pago; el panel de la etapa 4 los distinguirá por `payment_status`.
- Yape y otros medios requieren crear una orden en Culqi; por ahora solo tarjeta.

# Panel de pedidos (etapa 4)

Entrar en `https://TU-SITIO/#/admin`.

- **Modo demo (sin Supabase):** pide un PIN (`adminDemoPin` en `src/config/site.js`, por defecto `zabori`). Es solo de prueba: con Supabase configurado ese PIN deja de funcionar.
- **Con Supabase:** hay que iniciar sesión con una cuenta que esté en la tabla `admins`. Para crear el primer administrador:
  1. Regístrate en la web con tu correo.
  2. En el SQL Editor ejecuta (con tu correo):
     ```sql
     insert into public.admins (user_id) select id from auth.users where email = 'tu-correo@ejemplo.com';
     ```
  3. Abre `#/admin` con esa cuenta.

## Qué hace el panel
- **Resumen:** ventas, cobrado / por cobrar, ticket promedio y % delivery vs recojo para Hoy, 7 días, 30 días o Todo; gráfico de ventas por hora (hoy) o por día; platos más vendidos; pedidos en curso por estado.
- **Pedidos:** tabla con búsqueda (código, nombre, celular, dirección), filtro por periodo y modalidad, vistas En curso / Por cobrar / Entregados / Cancelados / Todos y **Exportar a Excel** (CSV).
  Al tocar un pedido se abre su ficha: cliente (con cuenta o invitado), llamada, WhatsApp, dirección en Google Maps, notas, platos con precio unitario e importe, subtotal, delivery, total, referencia del pago y **historial con la hora de cada cambio**. Desde ahí se avanza el estado, se marca pagado o se cancela, y aparece un botón para **avisar al cliente por WhatsApp** con el mensaje ya escrito.
- **Clientes:** agrupados por celular, con número de pedidos, total gastado, plato favorito y último pedido; al abrir uno se ven todos sus pedidos.
- **Carta:** editar nombre, descripción (entrada y segundo), categoría, precio y etiqueta; ocultar o agregar platos; cada plato muestra cuántos se vendieron en 7 y 30 días.
- **Carta → Arma tu plato (fit):** cada proteína tiene **porciones en gramos con su precio** (ej. 120 g S/ 15 · 180 g S/ 18 · 250 g S/ 22) que se editan, agregan o quitan; el plato cuesta la porción elegida + adicionales. También: adicional fijo opcional y, por grupo (proteína, carbohidrato, vegetales —un solo paso, máximo 2 en total, con subgrupo Cocidos/Frescos—, aderezos, táper), cada opción con su adicional, "Disponible" sí/no y cuántas veces se eligió en 30 días; también se agregan opciones nuevas.
- **Avisos:** se actualiza solo cada 15 s; si entra un pedido nuevo suena un pitido y el título de la pestaña muestra `(n) Nuevo pedido`. Hay que dejar la pestaña abierta.

## Seguridad
Las políticas RLS (`is_admin()`) permiten ver/actualizar pedidos y editar la carta solo a los usuarios de `admins`. Un cliente normal que abra `#/admin` no ve nada.

# Pagos con Yape / Plin y "Sigue tu pedido"

- **Yape y Plin (manual):** en `src/config/site.js` → `wallets`, poner número, titular y la ruta del QR (subir la imagen a `public/img/pagos/`, por ejemplo `qr: '/img/pagos/yape.png'`). El cliente paga, envía la captura por WhatsApp y el pedido aparece en el panel como **"Por confirmar · Yape"**. Al verificar el depósito se pulsa **"Confirmar pago Yape"** en la ficha del pedido. Regla para la cocina: preparar solo lo que está **Pagado**.
- **Tarjeta (Culqi):** se confirma sola; el pedido llega al panel ya como **Pagado · Tarjeta**.
- **WhatsApp:** `site.whatsapp` es el número de Zabori (con 51 delante). La confirmación del pedido abre ese chat con el código ya escrito, y el panel tiene "Avisar al cliente" con mensajes listos por estado.
- **Sigue tu pedido (`/#/seguir`):** el cliente pone su código y los últimos 4 dígitos de su celular. Usa la función `track_order()`, que solo devuelve estado, platos y total (nunca nombre, celular ni dirección). La página se actualiza sola cada 20 s.

# Dirección con mapa (OpenStreetMap)

- El buscador de direcciones usa **Photon** (OpenStreetMap): gratis y sin llave, con uso razonable. Solo consulta cuando el cliente deja de escribir.
- El mapa (Leaflet + OpenStreetMap) aparece solo si el cliente elige una sugerencia o toca "Usar mi ubicación"; el pin se puede mover. Si no lo usa, igual puede pedir escribiendo su dirección.
- "Usar mi ubicación" necesita HTTPS (funciona en Vercel y en localhost).
- Las coordenadas se guardan en `orders.lat` / `orders.lng` (solo si están dentro del Perú) y el panel abre el punto exacto en Google Maps.
- Si más adelante se quiere Google Maps (mejores resultados en Lima), solo se cambia `src/lib/geo.js` y el mapa; el resto queda igual.
