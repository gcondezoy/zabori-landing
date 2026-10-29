# Zabori · Menú del día

Landing de pedidos para Zabori (React + Vite): carta del día, carrito, pago como invitado o con cuenta,
pago con tarjeta (Culqi) y panel de administración en `/#/admin`.

## Desarrollo

```bash
npm install
npm run dev
```

Sin variables de entorno la web funciona en **modo demo**: cuentas, pedidos y cambios de carta se guardan
solo en el navegador, y el panel se abre con el PIN de `src/config/site.js`.

## Producción

1. Supabase y Culqi: seguir [CONFIGURAR-SUPABASE.md](CONFIGURAR-SUPABASE.md).
2. Variables en Vercel (Settings → Environment Variables), ver `.env.example`:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CULQI_PUBLIC_KEY`.
3. La llave secreta de Culqi va solo como secreto de la Edge Function, nunca en Vercel ni en el código.

## Dónde se edita

- Datos del negocio (WhatsApp, dirección, horario, delivery): `src/config/site.js`
- Carta de ejemplo: `src/data/menu.js` (con Supabase se edita desde el panel)
- Base de datos: `supabase/setup.sql`

## Fotos

Las fotos de `public/img/platos/` son de referencia, de Unsplash (licencia libre de Unsplash, sin atribución obligatoria).
Reemplázalas por fotos reales de Zabori con el mismo nombre de archivo (proporción 4:3; `hero.webp` cuadrada).

Las fotos de "Arma tu plato" (`public/img/arma/*.webp`, cuadradas de 360 px) también son de referencia (Unsplash); se reemplazan con el mismo nombre o cambiando la ruta en el panel.

Las miniaturas de los tápers (`public/img/taper/*.svg`) son ilustraciones de referencia. Para usar fotos reales, sube la imagen a `public/img/taper/` y cambia su ruta en el panel (Carta → Arma tu plato → Táper).

### Táper de "Arma tu plato" con foto real

El armador muestra el táper **vacío visto desde arriba** (`public/img/taper/top-*.svg`, ilustraciones de referencia) y los ingredientes caen en cada compartimento.
Para usar una **foto real** del táper del cliente:
1. Tomar la foto del táper vacío, desde arriba, recto y con buena luz; subirla a `public/img/taper/` (por ejemplo `top-bagazo.webp`).
2. En `src/data/taperArt.js` cambiar `img` (y `aspect` si la foto no es 4:3).
3. Ajustar `slots` (posición de cada compartimento en % de la foto: izquierda, arriba, ancho, alto) hasta que la comida caiga dentro de las divisiones.
