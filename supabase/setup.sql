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
  ('m1','menu','Menú Criollo','Entrada del día, lomo saltado con arroz y papas, refresco.',14),
  ('m2','menu','Menú Marino','Entrada del día, arroz con mariscos, refresco.',16),
  ('m3','menu','Menú Casero','Entrada del día, seco de res con frejoles, refresco.',13),
  ('m4','menu','Menú Ligero','Ensalada fresca, pollo a la plancha con puré, refresco.',13),
  ('arma','arma','Arma tu plato','Elige proteína, carbohidrato, acompañamientos y cremas.',12),
  ('b1','bebidas','Chicha morada 500 ml','Hecha en casa.',4),
  ('b2','bebidas','Limonada frozen','Con hierbabuena.',5)
on conflict (id) do nothing;

-- ---------- Perfiles (clientes registrados) ----------
create table if not exists public.profiles (
  id      uuid primary key references auth.users(id) on delete cascade,
  name    text not null default '',
  phone   text not null default '',
  address text not null default ''
);

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

insert into public.build_groups (id, label, min_sel, max_sel, sort) values
  ('proteina','Proteína',1,1,1), ('carbo','Carbohidrato',1,1,2),
  ('acomp','Acompañamientos',0,2,3), ('crema','Cremas',0,2,4),
  ('taper','Táper',1,1,5)
on conflict (id) do nothing;

insert into public.build_options (id, grp, name, price, sort) values
  ('p-pollo','proteina','Pollo a la plancha',0,1), ('p-res','proteina','Lomo de res',3,2),
  ('p-pescado','proteina','Pescado frito',2,3), ('p-cerdo','proteina','Chicharrón de cerdo',2,4),
  ('p-tortilla','proteina','Tortilla de verduras',0,5),
  ('c-arroz','carbo','Arroz blanco',0,1), ('c-chaufa','carbo','Arroz chaufa',1,2),
  ('c-fritas','carbo','Papas fritas',1,3), ('c-sancochada','carbo','Papa sancochada',0,4),
  ('c-quinua','carbo','Quinua',1.5,5),
  ('a-menestra','acomp','Menestra del día',0,1), ('a-ensalada','acomp','Ensalada fresca',0,2),
  ('a-platano','acomp','Plátano frito',1,3), ('a-camote','acomp','Camote frito',1,4),
  ('a-choclo','acomp','Choclo',0,5),
  ('k-aji','crema','Ají',0,1), ('k-huancaina','crema','Huancaína',0,2),
  ('k-criolla','crema','Salsa criolla',0,3), ('k-tartara','crema','Tártara',0,4)
on conflict (id) do nothing;

insert into public.build_options (id, grp, name, price, sort, img) values
  ('t-bagazo','taper','Táper de bagazo (biodegradable)',0.5,1,'/img/taper/bagazo.svg'),
  ('t-kraft','taper','Bowl kraft con tapa',1,2,'/img/taper/kraft.svg'),
  ('t-reutilizable','taper','Táper reutilizable hermético',2,3,'/img/taper/reutilizable.svg')
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
-- Menú del día: { id: 'm1', qty, taper: 't-kraft' } (el táper es obligatorio y suma su precio)
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
  v_opts text[];
  v_n int;
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

      v_opts := array(select distinct jsonb_array_elements_text(coalesce(it->'options', '[]'::jsonb)));
      if (select count(*) from public.build_options where id = any(v_opts) and active) <> cardinality(v_opts) then
        raise exception 'Alguna opción de tu plato ya no está disponible';
      end if;
      for g in select * from public.build_groups loop
        select count(*) into v_n from public.build_options where id = any(v_opts) and grp = g.id;
        if v_n < g.min_sel or v_n > g.max_sel then raise exception 'Revisa tu plato: %', g.label; end if;
      end loop;

      select v_price + coalesce(sum(o.price), 0), coalesce(string_agg(o.name, ' · ' order by bg.sort, o.sort), '')
        into v_price, v_detail
      from public.build_options o join public.build_groups bg on bg.id = o.grp
      where o.id = any(v_opts);

      v_lines := v_lines || jsonb_build_object('item_id', 'arma', 'name', 'Arma tu plato', 'detail', v_detail, 'price', v_price, 'qty', v_qty);
    else
      select id, name, price, cat into r from public.menu_items where id = it->>'id' and active and cat <> 'arma';
      if not found then raise exception 'Un producto de tu pedido ya no está disponible'; end if;
      v_price := r.price;
      v_detail := '';

      -- Los menús del día van con táper (si hay alguno disponible): se suma su precio
      if r.cat = 'menu' and exists (select 1 from public.build_options where grp = 'taper' and active) then
        select name, price into g from public.build_options where id = it->>'taper' and grp = 'taper' and active;
        if not found then raise exception 'Elige el táper de tu %', r.name; end if;
        v_price := v_price + g.price;
        v_detail := g.name;
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

  insert into public.orders (code, user_id, customer_name, phone, email, mode, address, notes,
                             subtotal, delivery_fee, total, payment_method, lat, lng)
  values (v_code, auth.uid(), trim(p->>'name'), trim(p->>'phone'), coalesce(trim(p->>'email'), ''),
          v_mode, coalesce(trim(p->>'address'), ''), coalesce(trim(p->>'notes'), ''),
          v_subtotal, v_fee, v_subtotal + v_fee, coalesce(p->>'payment_method', 'tarjeta'), v_lat, v_lng)
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
             ('arma',5,''),('b1',7,''),('b2',8,'')) as v(id,s,t)
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

create or replace function public.orders_history() returns trigger
language plpgsql as $$
begin
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
