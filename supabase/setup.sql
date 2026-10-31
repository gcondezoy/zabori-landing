-- =============================================================
--  ZABORI · Esquema de Supabase (etapa 2)
--  Pegar completo en Supabase > SQL Editor > Run. Se puede re-ejecutar.
-- =============================================================

-- ---------- Carta ----------
create table if not exists public.menu_items (
  id     text primary key,
  cat    text not null,
  name   text not null,
  descr  text not null default '',
  price  numeric(10,2) not null check (price >= 0),
  active boolean not null default true,
  tag    text not null default '',
  sort   int  not null default 0
);
-- Si la tabla ya existía de la etapa 2
alter table public.menu_items add column if not exists tag  text not null default '';
alter table public.menu_items add column if not exists sort int  not null default 0;

insert into public.menu_items (id, cat, name, descr, price) values
  ('m1','menu','Lomo saltado','Con arroz y papas fritas.',10),
  ('m2','menu','Arroz con mariscos','Con salsa criolla.',10),
  ('m3','menu','Seco de res','Con frejoles y arroz.',10),
  ('m4','menu','Pollo a la plancha','Con puré y ensalada.',10),
  ('e1','entrada','Sopa de casa','',0),
  ('e2','entrada','Ensalada fresca','',0),
  ('e3','entrada','Papa a la huancaína','',0),
  ('e4','entrada','Tequeños','',0),
  ('arma','arma','Arma tu plato','Fit: proteína por gramos, carbohidrato, vegetales cocidos y frescos, y aderezos.',0),
  ('s1','shots','Shot de jengibre y limón','Jengibre fresco, limón y una pizca de miel.',5),
  ('s2','shots','Shot verde','Espinaca, manzana verde y apio.',5),
  ('s3','shots','Shot de cúrcuma y naranja','Cúrcuma, naranja y pimienta negra.',5)
on conflict (id) do nothing;

-- ---------- Perfiles (clientes registrados) ----------
create table if not exists public.profiles (
  id      uuid primary key references auth.users(id) on delete cascade,
  name    text not null default '',
  phone   text not null default '',
  address text not null default ''
);
-- Ubicación de entrega guardada (para autocompletar el mapa del checkout)
alter table public.profiles add column if not exists lat numeric(9,6);
alter table public.profiles add column if not exists lng numeric(9,6);

-- Crea el perfil automáticamente al registrarse
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name', ''),
          coalesce(new.raw_user_meta_data->>'phone', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Pedidos ----------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  user_id        uuid references auth.users(id) on delete set null, -- null = invitado
  customer_name  text not null,
  phone          text not null,
  email          text not null default '',
  mode           text not null check (mode in ('delivery','recojo')),
  address        text not null default '',
  notes          text not null default '',
  subtotal       numeric(10,2) not null,
  delivery_fee   numeric(10,2) not null default 0,
  total          numeric(10,2) not null,
  status         text not null default 'pendiente'
                 check (status in ('pendiente','preparando','en_camino','listo','entregado','cancelado')),
  payment_status text not null default 'pendiente'
                 check (payment_status in ('pendiente','procesando','pagado','fallido')),
  payment_ref    text,
  payment_method text not null default 'tarjeta' check (payment_method in ('tarjeta','yape','plin')),
  created_at     timestamptz not null default now()
);

create table if not exists public.order_items (
  id       bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id  text not null references public.menu_items(id),
  name     text not null,
  price    numeric(10,2) not null,
  qty      int not null check (qty > 0)
);
-- Composición del plato armado ("Pollo · Arroz · ..."); vacío para platos normales
alter table public.order_items add column if not exists detail text not null default '';

-- ---------- Arma tu plato ----------
-- Precio base = menu_items('arma').price; cada opción suma su "price" (0 = incluido).
create table if not exists public.build_groups (
  id      text primary key,
  label   text not null,
  min_sel int  not null default 0,
  max_sel int  not null default 1,
  sort    int  not null default 0
);
create table if not exists public.build_options (
  id     text primary key,
  grp    text not null references public.build_groups(id),
  name   text not null,
  price  numeric(10,2) not null default 0 check (price >= 0),
  active boolean not null default true,
  sort   int not null default 0,
  img    text not null default ''
);
alter table public.build_options add column if not exists img text not null default '';
-- Porciones (fit): [{ "g": 120, "price": 15 }, ...]. Si tiene porciones, el precio sale de la porción elegida.
alter table public.build_options add column if not exists sizes jsonb not null default '[]'::jsonb;
-- Subgrupo dentro de un paso (ej. vegetales "Cocidos" / "Frescos"); el máximo del paso cuenta todos juntos
alter table public.build_options add column if not exists sub text not null default '';

insert into public.build_groups (id, label, min_sel, max_sel, sort) values
  ('proteina','Proteína',1,1,1), ('carbo','Carbohidrato',1,1,2),
  ('acomp','Vegetales',0,2,3), ('crema','Aderezos',0,2,4),
  ('taper','Táper',1,1,5)
on conflict (id) do nothing;

-- Opciones fit de EJEMPLO (se editan en el panel). Proteínas con porción en gramos y precio por porción.
insert into public.build_options (id, grp, name, price, sort, img, sizes, sub) values
  ('p-pollo','proteina','Pechuga de pollo',0,1,'/img/arma/pollo.webp','[{"g":120,"price":15},{"g":180,"price":18},{"g":250,"price":22}]',''),
  ('p-res','proteina','Lomo fino de res',0,2,'/img/arma/res.webp','[{"g":120,"price":18},{"g":180,"price":22},{"g":250,"price":27}]',''),
  ('p-pescado','proteina','Filete de pescado',0,3,'/img/arma/pescado.webp','[{"g":120,"price":17},{"g":180,"price":21},{"g":250,"price":25}]',''),
  ('p-pavita','proteina','Pavita al horno',0,4,'/img/arma/pavita.webp','[{"g":120,"price":16},{"g":180,"price":19},{"g":250,"price":23}]',''),
  ('c-arroz','carbo','Arroz graneado',0,1,'/img/arma/arroz.webp','[]',''),
  ('c-quinua','carbo','Quinua',1.5,2,'/img/arma/quinua.webp','[]',''),
  ('c-camote','carbo','Camote al horno',1,3,'/img/arma/camote.webp','[]',''),
  ('c-papa','carbo','Papa sancochada',0,4,'/img/arma/papa.webp','[]',''),
  ('c-sin','carbo','Sin carbohidrato (doble ensalada)',0,5,'/img/arma/sin-carbo.webp','[]',''),
  ('a-brocoli','acomp','Brócoli al vapor',0,1,'/img/arma/brocoli.webp','[]','Cocidos'),
  ('a-vainitas','acomp','Vainitas salteadas',0,2,'/img/arma/vainitas.webp','[]','Cocidos'),
  ('a-zanahoria','acomp','Zanahoria salteada',0,3,'/img/arma/zanahoria.webp','[]','Cocidos'),
  ('a-choclo','acomp','Choclo',0,4,'/img/arma/choclo.webp','[]','Cocidos'),
  ('f-ensalada','acomp','Ensalada verde',0,5,'/img/arma/ensalada.webp','[]','Frescos'),
  ('f-tomate','acomp','Tomate y pepino',0,6,'/img/arma/tomate-pepino.webp','[]','Frescos'),
  ('f-palta','acomp','Palta',2,7,'/img/arma/palta.webp','[]','Frescos'),
  ('k-vinagreta','crema','Vinagreta de limón',0,1,'/img/arma/vinagreta.webp','[]',''),
  ('k-yogur','crema','Yogur con hierbas',0,2,'/img/arma/yogur.webp','[]',''),
  ('k-huacatay','crema','Crema de huacatay',0,3,'/img/arma/huacatay.webp','[]',''),
  ('k-criolla','crema','Salsa criolla',0,4,'/img/arma/criolla.webp','[]',''),
  ('t-bagazo','taper','Táper de bagazo (biodegradable)',0.5,1,'/img/taper/bagazo-foto.webp','[]',''),
  ('t-kraft','taper','Bowl kraft con tapa',1,2,'/img/taper/kraft.svg','[]',''),
  ('t-reutilizable','taper','Táper reutilizable hermético',2,3,'/img/taper/reutilizable-foto.webp','[]','')
on conflict (id) do nothing;

-- Ubicación exacta de entrega (opcional, desde el mapa del checkout)
alter table public.orders add column if not exists lat numeric(9,6);
alter table public.orders add column if not exists lng numeric(9,6);

-- Medio de pago (Yape/Plin se confirman a mano desde el panel)
alter table public.orders add column if not exists payment_method text not null default 'tarjeta';
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check (payment_method in ('tarjeta','yape','plin'));

-- Si la tabla ya existía de la etapa 2, ampliar los estados de pago permitidos
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('pendiente','procesando','pagado','fallido'));

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------- Seguridad (RLS) ----------
alter table public.menu_items  enable row level security;
alter table public.profiles    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.build_groups  enable row level security;
alter table public.build_options enable row level security;

drop policy if exists "grupos publicos" on public.build_groups;
create policy "grupos publicos" on public.build_groups for select using (true);
drop policy if exists "opciones publicas" on public.build_options;
create policy "opciones publicas" on public.build_options for select using (active);

drop policy if exists "carta publica" on public.menu_items;
create policy "carta publica" on public.menu_items for select using (active);

drop policy if exists "perfil propio ver" on public.profiles;
create policy "perfil propio ver" on public.profiles for select using (auth.uid() = id);
drop policy if exists "perfil propio editar" on public.profiles;
create policy "perfil propio editar" on public.profiles for update using (auth.uid() = id);

-- Un cliente solo ve sus propios pedidos. Nadie inserta directo: se usa create_order().
drop policy if exists "pedidos propios" on public.orders;
create policy "pedidos propios" on public.orders for select using (auth.uid() = user_id);
drop policy if exists "lineas propias" on public.order_items;
create policy "lineas propias" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ---------- Crear pedido (invitado o registrado) ----------
-- Los precios SIEMPRE se leen de la base: el navegador nunca manda precios.
-- p = { name, phone, email, mode, address, notes, items: [{id, qty}] }
-- Plato armado: { id: 'arma', qty, options: ['p-pollo','c-arroz',...] } (se validan los mínimos/máximos de cada grupo)
-- Menú del día: { id: 'm1', qty, taper: 't-kraft', entrada: 'e1' } (el táper es obligatorio y suma su precio; la entrada va incluida)
-- Constancia de que aceptó Términos y Privacidad en cada pedido
alter table public.orders add column if not exists terms_version text;
alter table public.orders add column if not exists terms_at timestamptz;

create or replace function public.create_order(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_fee_amount constant numeric := 3;    -- tarifa de delivery (S/)
  v_free_from  constant numeric := 40;   -- delivery gratis desde (S/)
  v_mode text := p->>'mode';
  v_subtotal numeric := 0;
  v_fee numeric := 0;
  v_code text;
  v_order uuid;
  v_lines jsonb := '[]'::jsonb;
  v_lat numeric;
  v_lng numeric;
  v_qty int;
  v_price numeric;
  v_detail text;
  v_entrada text;
  v_opts text[];
  v_n int;
  v_ids text[];
  v_raw text;
  v_g text;
  v_sp numeric;
  v_parts jsonb;
  ob record;
  it jsonb;
  g record;
  r record;
begin
  if coalesce(trim(p->>'name'), '') = '' or coalesce(trim(p->>'phone'), '') = '' then
    raise exception 'Nombre y celular son obligatorios';
  end if;
  if v_mode not in ('delivery','recojo') then
    raise exception 'Modalidad inválida';
  end if;
  if v_mode = 'delivery' and coalesce(trim(p->>'address'), '') = '' then
    raise exception 'La dirección es obligatoria para delivery';
  end if;
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 then
    raise exception 'El pedido está vacío';
  end if;

  -- Cada línea se valida y se le pone precio desde la base
  for it in select * from jsonb_array_elements(p->'items') loop
    v_qty := nullif(it->>'qty', '')::int;
    if v_qty is null or v_qty < 1 or v_qty > 50 then raise exception 'Cantidad inválida'; end if;

    if it->>'id' = 'arma' then
      select price into v_price from public.menu_items where id = 'arma' and active;
      if not found then raise exception 'Arma tu plato no está disponible'; end if;

      -- Cada opción llega como "id" o "id@gramos" (porción). Una opción por id.
      v_opts := array(select distinct jsonb_array_elements_text(coalesce(it->'options', '[]'::jsonb)));
      v_ids := array(select distinct split_part(x, '@', 1) from unnest(v_opts) x);
      if cardinality(v_ids) <> cardinality(v_opts) then raise exception 'Revisa tu táper: opción repetida'; end if;

      v_parts := '[]'::jsonb;
      foreach v_raw in array v_opts loop
        select o.*, bg.sort as gsort into ob
        from public.build_options o join public.build_groups bg on bg.id = o.grp
        where o.id = split_part(v_raw, '@', 1) and o.active;
        if not found then raise exception 'Alguna opción de tu plato ya no está disponible'; end if;

        v_g := nullif(split_part(v_raw, '@', 2), '');
        if jsonb_array_length(ob.sizes) > 0 then
          if v_g is null then raise exception 'Elige la porción de %', ob.name; end if;
          v_sp := null;
          select (s->>'price')::numeric into v_sp from jsonb_array_elements(ob.sizes) s where s->>'g' = v_g;
          if v_sp is null then raise exception 'Porción no disponible: % % g', ob.name, v_g; end if;
          v_parts := v_parts || jsonb_build_object('gs', ob.gsort, 'os', ob.sort, 'label', ob.name || ' ' || v_g || ' g', 'price', v_sp);
        else
          if v_g is not null then raise exception 'Opción inválida: %', ob.name; end if;
          v_parts := v_parts || jsonb_build_object('gs', ob.gsort, 'os', ob.sort, 'label', ob.name, 'price', ob.price);
        end if;
      end loop;

      for g in select * from public.build_groups loop
        select count(*) into v_n from public.build_options where id = any(v_ids) and grp = g.id;
        if v_n < g.min_sel or v_n > g.max_sel then raise exception 'Revisa tu táper: %', g.label; end if;
      end loop;

      select v_price + coalesce(sum((x->>'price')::numeric), 0),
             coalesce(string_agg(x->>'label', ' · ' order by (x->>'gs')::int, (x->>'os')::int), '')
        into v_price, v_detail
      from jsonb_array_elements(v_parts) x;

      v_lines := v_lines || jsonb_build_object('item_id', 'arma', 'name', 'Arma tu plato', 'detail', v_detail, 'price', v_price, 'qty', v_qty);
    else
      select id, name, price, cat into r from public.menu_items where id = it->>'id' and active and cat not in ('arma', 'entrada');
      if not found then raise exception 'Un producto de tu pedido ya no está disponible'; end if;
      v_price := r.price;
      v_detail := '';

      -- La entrada que eligió el cliente va incluida en el menú: queda en el detalle para la cocina
      if r.cat = 'menu' and coalesce(it->>'entrada', '') <> '' then
        select name into v_entrada from public.menu_items where id = it->>'entrada' and cat = 'entrada' and active;
        if not found then raise exception 'La entrada de tu % ya no está disponible', r.name; end if;
        v_detail := 'Entrada: ' || v_entrada;
      end if;

      -- Los menús del día van con táper (si hay alguno disponible): se suma su precio
      if r.cat = 'menu' and exists (select 1 from public.build_options where grp = 'taper' and active) then
        select name, price into g from public.build_options where id = it->>'taper' and grp = 'taper' and active;
        if not found then raise exception 'Elige el táper de tu %', r.name; end if;
        v_price := v_price + g.price;
        v_detail := concat_ws(' · ', nullif(v_detail, ''), g.name);
      end if;

      v_lines := v_lines || jsonb_build_object('item_id', r.id, 'name', r.name, 'detail', v_detail, 'price', v_price, 'qty', v_qty);
    end if;

    v_subtotal := v_subtotal + v_price * v_qty;
  end loop;

  if v_subtotal <= 0 then raise exception 'Productos inválidos'; end if;
  if v_mode = 'delivery' and v_subtotal < v_free_from then v_fee := v_fee_amount; end if;

  loop
    v_code := 'ZAB-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    exit when not exists (select 1 from public.orders where code = v_code);
  end loop;

  -- Coordenadas solo si son válidas y están en el Perú (si no, se ignoran)
  if v_mode = 'delivery' and jsonb_typeof(p->'lat') = 'number' and jsonb_typeof(p->'lng') = 'number'
     and (p->>'lat')::numeric between -18.5 and 0 and (p->>'lng')::numeric between -81.5 and -68.5 then
    v_lat := round((p->>'lat')::numeric, 6);
    v_lng := round((p->>'lng')::numeric, 6);
  end if;

  if coalesce(p->>'payment_method', 'tarjeta') not in ('tarjeta','yape','plin') then
    raise exception 'Medio de pago inválido';
  end if;

  -- Constancia de aceptación: la versión viene del navegador y la hora la pone el servidor
  if coalesce(trim(p->>'terms_version'), '') = '' then
    raise exception 'Debes aceptar los Términos y la Política de Privacidad';
  end if;

  insert into public.orders (code, user_id, customer_name, phone, email, mode, address, notes,
                             subtotal, delivery_fee, total, payment_method, lat, lng, terms_version, terms_at)
  values (v_code, auth.uid(), trim(p->>'name'), trim(p->>'phone'), coalesce(trim(p->>'email'), ''),
          v_mode, coalesce(trim(p->>'address'), ''), coalesce(trim(p->>'notes'), ''),
          v_subtotal, v_fee, v_subtotal + v_fee, coalesce(p->>'payment_method', 'tarjeta'), v_lat, v_lng,
          left(trim(p->>'terms_version'), 40), now())
  returning id into v_order;

  insert into public.order_items (order_id, item_id, name, detail, price, qty)
  select v_order, l.item_id, l.name, l.detail, l.price, l.qty
  from jsonb_to_recordset(v_lines) as l(item_id text, name text, detail text, price numeric, qty int);

  return v_code;
end $$;

grant execute on function public.create_order(jsonb) to anon, authenticated;

-- =============================================================
--  ETAPA 4 · Panel de pedidos (administradores)
-- =============================================================

-- Orden y etiquetas de la carta de ejemplo
update public.menu_items set sort = v.s, tag = v.t
from (values ('m1',1,'Más pedido'),('m2',2,''),('m3',3,''),('m4',4,'Saludable'),
             ('arma',5,''),('s1',6,''),('s2',7,'Detox'),('s3',8,''),
             ('e1',9,''),('e2',10,''),('e3',11,''),('e4',12,'')) as v(id,s,t)
where public.menu_items.id = v.id and public.menu_items.sort = 0;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- Cada usuario solo puede saber si él mismo es admin
drop policy if exists "admin se ve a si mismo" on public.admins;
create policy "admin se ve a si mismo" on public.admins for select using (user_id = auth.uid());

drop policy if exists "admin ve pedidos" on public.orders;
create policy "admin ve pedidos" on public.orders for select using (public.is_admin());
drop policy if exists "admin actualiza pedidos" on public.orders;
create policy "admin actualiza pedidos" on public.orders for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin ve lineas" on public.order_items;
create policy "admin ve lineas" on public.order_items for select using (public.is_admin());

drop policy if exists "admin gestiona carta" on public.menu_items;
create policy "admin gestiona carta" on public.menu_items for all using (public.is_admin()) with check (public.is_admin());

-- PRIMER ADMINISTRADOR: regístrate en la web con tu correo y luego ejecuta (cambia el correo):
--   insert into public.admins (user_id) select id from auth.users where email = 'tu-correo@ejemplo.com';

-- =============================================================
--  ETAPA 4b · Historial de cada pedido (línea de tiempo en el panel)
-- =============================================================
alter table public.orders add column if not exists history jsonb not null default '[]'::jsonb;
-- El panel se actualiza pidiendo solo los pedidos que cambiaron desde la última vez
alter table public.orders add column if not exists updated_at timestamptz not null default now();
create index if not exists orders_updated_idx on public.orders (updated_at);

create or replace function public.orders_history() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.history := jsonb_build_array(jsonb_build_object('type','status','value',new.status,'at',now()));
  else
    if new.status is distinct from old.status then
      new.history := coalesce(new.history,'[]'::jsonb) || jsonb_build_object('type','status','value',new.status,'at',now());
    end if;
    if new.payment_status is distinct from old.payment_status then
      new.history := coalesce(new.history,'[]'::jsonb) || jsonb_build_object('type','payment','value',new.payment_status,'at',now());
    end if;
  end if;
  return new;
end $$;

drop trigger if exists orders_history_trg on public.orders;
create trigger orders_history_trg before insert or update on public.orders
  for each row execute function public.orders_history();

-- =============================================================
--  Arma tu plato · el panel administra opciones y precios
-- =============================================================
drop policy if exists "admin gestiona grupos" on public.build_groups;
create policy "admin gestiona grupos" on public.build_groups for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin gestiona opciones" on public.build_options;
create policy "admin gestiona opciones" on public.build_options for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================
--  "Sigue tu pedido": consulta pública con código + últimos 4 dígitos del celular
--  (no expone nombre, celular ni dirección; solo estado, platos y total)
-- =============================================================
create or replace function public.track_order(p_code text, p_phone text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  o public.orders;
  v_last4 text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 4);
begin
  if length(v_last4) < 4 then return null; end if;
  select * into o from public.orders
  where code = upper(trim(p_code))
    and right(regexp_replace(phone, '\D', '', 'g'), 4) = v_last4;
  if not found then return null; end if;
  return jsonb_build_object(
    'code', o.code, 'status', o.status, 'payment', o.payment_status, 'method', o.payment_method,
    'mode', o.mode, 'total', o.total, 'createdAt', o.created_at, 'history', o.history,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name', i.name, 'detail', i.detail, 'qty', i.qty) order by i.id), '[]'::jsonb)
              from public.order_items i where i.order_id = o.id)
  );
end $$;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- =============================================================
--  ETAPA 6 · Menú semanal y fotos de la carta
-- =============================================================
alter table public.menu_items add column if not exists img text not null default '';

-- Qué segundos y entradas salen cada día (0 = domingo) y en qué orden; sort 0 es el primero
create table if not exists public.weekly_menu (
  day     smallint not null check (day between 0 and 6),
  item_id text not null references public.menu_items(id) on delete cascade,
  sort    int  not null default 0,
  primary key (day, item_id)
);
create index if not exists weekly_menu_sort_idx on public.weekly_menu (day, sort);

alter table public.weekly_menu enable row level security;
drop policy if exists "semana publica" on public.weekly_menu;
create policy "semana publica" on public.weekly_menu for select using (true);
drop policy if exists "admin gestiona semana" on public.weekly_menu;
create policy "admin gestiona semana" on public.weekly_menu for all using (public.is_admin()) with check (public.is_admin());

-- Plan de ejemplo: solo si aún no hay ninguno (re-ejecutar este archivo no pisa lo que edite el cliente)
insert into public.weekly_menu (day, item_id, sort)
select v.day, v.item_id, v.sort
from (values (1,'m1',0),(1,'m2',1),(1,'m3',2),(1,'e1',3),(1,'e2',4),(1,'e3',5),
             (2,'m3',0),(2,'m4',1),(2,'m1',2),(2,'e2',3),(2,'e4',4),(2,'e1',5),
             (3,'m2',0),(3,'m1',1),(3,'m4',2),(3,'e3',3),(3,'e1',4),(3,'e4',5),
             (4,'m4',0),(4,'m3',1),(4,'m2',2),(4,'e1',3),(4,'e3',4),(4,'e2',5),
             (5,'m1',0),(5,'m4',1),(5,'m2',2),(5,'e4',3),(5,'e2',4),(5,'e1',5),
             (6,'m2',0),(6,'m3',1),(6,'m4',2),(6,'e2',3),(6,'e3',4),(6,'e4',5)) as v(day, item_id, sort)
where not exists (select 1 from public.weekly_menu);

-- Bebida del día: viene incluida, el cliente no la elige
create table if not exists public.weekly_drink (
  day  smallint primary key check (day between 0 and 6),
  name text not null default ''
);
alter table public.weekly_drink enable row level security;
drop policy if exists "bebida publica" on public.weekly_drink;
create policy "bebida publica" on public.weekly_drink for select using (true);
drop policy if exists "admin gestiona bebida" on public.weekly_drink;
create policy "admin gestiona bebida" on public.weekly_drink for all using (public.is_admin()) with check (public.is_admin());

insert into public.weekly_drink (day, name) values
  (1,'Chicha morada'),(2,'Limonada'),(3,'Maracuyá'),(4,'Chicha morada'),(5,'Limonada'),(6,'Emoliente')
on conflict (day) do nothing;

-- Fotos de los platos: lectura pública, solo los administradores suben o cambian
insert into storage.buckets (id, name, public) values ('menu', 'menu', true) on conflict (id) do nothing;
drop policy if exists "fotos menu publicas" on storage.objects;
create policy "fotos menu publicas" on storage.objects for select using (bucket_id = 'menu');
drop policy if exists "admin sube fotos menu" on storage.objects;
create policy "admin sube fotos menu" on storage.objects for insert with check (bucket_id = 'menu' and public.is_admin());
drop policy if exists "admin borra fotos menu" on storage.objects;
create policy "admin borra fotos menu" on storage.objects for delete using (bucket_id = 'menu' and public.is_admin());

-- =============================================================
--  ETAPA 7 · Permiso para publicidad y correo de bienvenida
-- =============================================================
alter table public.profiles add column if not exists accepts_marketing boolean not null default false;
alter table public.profiles add column if not exists terms_version text; -- versión de Términos y Privacidad aceptada
alter table public.profiles add column if not exists terms_at timestamptz;
alter table public.profiles add column if not exists marketing_at timestamptz; -- cuándo dio (o retiró) su permiso
alter table public.profiles add column if not exists welcomed_at timestamptz;  -- lo marca la función welcome-email

-- El permiso se toma de la casilla del registro (sin marcar = no acepta)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_ok boolean := coalesce(new.raw_user_meta_data->>'accepts_marketing', '') = 'true';
begin
  insert into public.profiles (id, name, phone, accepts_marketing, marketing_at, terms_version, terms_at)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name', ''),
          coalesce(new.raw_user_meta_data->>'phone', ''),
          v_ok,
          case when v_ok then now() end,
          left(new.raw_user_meta_data->>'terms_version', 40),
          case when new.raw_user_meta_data ? 'terms_version' then now() end)
  on conflict (id) do nothing;
  return new;
end $$;

-- Registra cuándo cambió el permiso. El cliente no puede tocar welcomed_at (se reenviaría el correo).
create or replace function public.profiles_guard() returns trigger
language plpgsql as $$
begin
  if new.accepts_marketing is distinct from old.accepts_marketing then
    new.marketing_at := now();
  end if;
  if current_user not in ('service_role', 'postgres') then
    new.welcomed_at := old.welcomed_at;
    new.terms_version := old.terms_version;
    new.terms_at := old.terms_at;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_trg on public.profiles;
create trigger profiles_guard_trg before update on public.profiles
  for each row execute function public.profiles_guard();

-- Lista para el panel: solo administradores, solo quienes aceptaron
create or replace function public.marketing_contacts()
returns table (name text, email text, accepted_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  return query
    select p.name, u.email::text, p.marketing_at
    from public.profiles p join auth.users u on u.id = p.id
    where p.accepts_marketing and u.email is not null
    order by p.marketing_at desc nulls last;
end $$;
revoke execute on function public.marketing_contacts() from public, anon;
grant execute on function public.marketing_contacts() to authenticated;

-- =============================================================
--  ETAPA 9 · Notificaciones del navegador para seguir un pedido
-- =============================================================
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique (order_id, endpoint)
);
alter table public.push_subscriptions enable row level security;
-- Los clientes no leen esta tabla: guardan con la función de abajo. Los administradores solo ven si hay avisos activos.
drop policy if exists "admin ve avisos" on public.push_subscriptions;
create policy "admin ve avisos" on public.push_subscriptions for select using (public.is_admin());

-- Mismo control que "Sigue tu pedido": código + últimos 4 dígitos del celular. Sirve con o sin cuenta.
create or replace function public.save_push_subscription(p_code text, p_phone text, p_sub jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid;
  v_last4 text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 4);
  v_endpoint text := p_sub->>'endpoint';
  v_p256dh text := p_sub#>>'{keys,p256dh}';
  v_auth text := p_sub#>>'{keys,auth}';
begin
  if length(v_last4) < 4 or v_endpoint is null or v_endpoint not like 'https://%' or length(v_endpoint) > 1000
     or coalesce(length(v_p256dh), 0) not between 20 and 200 or coalesce(length(v_auth), 0) not between 8 and 100 then
    return false;
  end if;
  select id into v_order from public.orders
  where code = upper(trim(p_code))
    and right(regexp_replace(phone, '\D', '', 'g'), 4) = v_last4
    and status not in ('entregado', 'cancelado');
  if not found then return false; end if;
  if (select count(*) from public.push_subscriptions where order_id = v_order and endpoint <> v_endpoint) >= 5 then
    return false;
  end if;
  insert into public.push_subscriptions (order_id, endpoint, p256dh, auth)
  values (v_order, v_endpoint, v_p256dh, v_auth)
  on conflict (order_id, endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth;
  return true;
end $$;
revoke execute on function public.save_push_subscription(text, text, jsonb) from public;
grant execute on function public.save_push_subscription(text, text, jsonb) to anon, authenticated;

-- =============================================================
--  ETAPA 10 · Promociones (solo informan: no cambian precios)
-- =============================================================
create table if not exists public.promotions (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (length(trim(title)) between 1 and 80),
  descr      text not null default '' check (length(descr) <= 300),
  img        text not null default '',
  starts_on  date,
  ends_on    date,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  check (starts_on is null or ends_on is null or ends_on >= starts_on)
);
alter table public.promotions enable row level security;
-- El público solo ve las visibles y vigentes hoy en Lima. Las programadas y vencidas quedan para el panel.
drop policy if exists "promociones vigentes" on public.promotions;
create policy "promociones vigentes" on public.promotions for select using (
  active
  and (starts_on is null or starts_on <= (now() at time zone 'America/Lima')::date)
  and (ends_on is null or ends_on >= (now() at time zone 'America/Lima')::date)
);
drop policy if exists "admin gestiona promociones" on public.promotions;
create policy "admin gestiona promociones" on public.promotions for all using (public.is_admin()) with check (public.is_admin());
