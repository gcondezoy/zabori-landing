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

Sin la llave de Culqi la web solo ofrece Yape y Plin; la opción **Tarjeta** aparece sola al poner la llave y volver a desplegar.

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
   supabase functions deploy pay-order --no-verify-jwt
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
- **Periodo cargado:** al abrir, el panel descarga los últimos 35 días (por partes de 1000, el máximo de Supabase por consulta), así los reportes de hoy, 7 y 30 días salen completos. Para "Todo", buscar pedidos antiguos o exportarlos está el botón **Cargar todo el historial**. Luego solo pide lo que cambió, usando `orders.updated_at`.
- **Clientes:** agrupados por celular, con número de pedidos, total gastado, plato favorito y último pedido; al abrir uno se ven todos sus pedidos.
- **Menú semanal:** por cada día de atención, los segundos y entradas que salen y en qué orden (el primer segundo sale destacado en la web y en el carrusel), y la bebida incluida; copiar de otro día; crear segundos y entradas desde ahí. Se repite cada semana hasta que se cambie (tablas `weekly_menu` y `weekly_drink`).
- **Carta:** subir la foto de cada plato (bucket `menu` de Storage), eliminar platos (si ya tienen pedidos quedan ocultos); **precio único del menú del día** (S/ 10 al inicio; se cambia una vez y aplica a todos los menús); editar nombre, descripción (entrada y segundo), categoría, etiqueta y precio de los shots; ocultar o agregar platos; cada plato muestra cuántos se vendieron en 7 y 30 días.
- **Arma tu plato (sección propia del panel):** carbohidratos, vegetales y aderezos también pueden ir por gramos (botón "Por gramos"; ahí el precio es un adicional); se suben fotos y se eliminan opciones. Cada proteína tiene **porciones en gramos con su precio** (ej. 120 g S/ 15 · 180 g S/ 18 · 250 g S/ 22) que se editan, agregan o quitan; el plato cuesta la porción elegida + adicionales. También: adicional fijo opcional y, por grupo (proteína, carbohidrato, vegetales —un solo paso, máximo 2 en total, con subgrupo Cocidos/Frescos—, aderezos, táper), cada opción con su adicional, "Disponible" sí/no y cuántas veces se eligió en 30 días; también se agregan opciones nuevas.
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

# Términos, Privacidad y reclamos

Los textos están en `src/data/legal.js` y son un **borrador**: debe revisarlos un abogado. Lo pendiente se ve resaltado en las páginas.

1. Completar `site.legal` en `src/config/site.js`: razón social, RUC, domicilio, correo, número del banco de datos y enlace del Libro de Reclamaciones virtual ([Tu Libro de Reclamaciones](https://consumidor.indecopi.gob.pe/tulibro/)).
2. Cuando estén revisados, poner `draft: false` y cambiar `LEGAL_VERSION`.
3. Cada pedido guarda `orders.terms_version` y `terms_at`, y cada cuenta `profiles.terms_version` y `terms_at`. Consulta:
   ```sql
   select code, terms_version, terms_at from public.orders order by created_at desc limit 20;
   ```

# Correos: bienvenida y publicidad

Hace falta un **dominio propio** y una cuenta en [Resend](https://resend.com) (de preferencia a nombre del cliente).

1. **Volver a ejecutar `supabase/setup.sql`** (agrega el permiso de publicidad). Hacerlo antes de publicar la casilla.
2. En Resend → Domains, agregar el dominio y copiar sus registros DNS donde se compró. Esperar a que quede verificado.
3. En Resend → API Keys, crear una clave. **Nunca va en Vercel ni en el código**, solo como secreto de la función:
   ```
   supabase secrets set RESEND_API_KEY=re_xxxxxxxx MAIL_FROM="Zabori <hola@tu-dominio.pe>" SITE_URL=https://tu-dominio.pe
   supabase functions deploy welcome-email --no-verify-jwt
   ```
4. En Vercel, agregar `VITE_CORREO_BIENVENIDA=1` y volver a desplegar.
5. Conectar Resend como SMTP en Supabase (Authentication → Emails → SMTP Settings). Así se quita el límite de 2 correos por hora y conviene **reactivar "Confirm email"**: sin confirmar, cualquiera podría registrar el correo de otra persona y hacer que le llegue la bienvenida.

**Bienvenida:** llega una sola vez después del registro. Las cuentas con más de 7 días al activarla no la reciben.

**Publicidad:** en el panel → Clientes → **Exportar contactos para promociones** se descarga la lista de quienes marcaron la casilla. Se importa en Resend y desde ahí se envía la campaña. Antes de la primera, revisar con el contador o abogado del cliente la Ley 28493 (correo comercial) y la Ley 29733 (datos personales). Cada campaña debe permitir darse de baja: **no volver a importar a quien se dio de baja en Resend** sin revisar esa lista.

El cliente puede cambiar su permiso en Mi cuenta → Mis datos; la fecha queda en `profiles.marketing_at`.
