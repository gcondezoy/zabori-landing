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
  ('e1','extras','Entrada extra','Sopa o ensalada del día.',5),
  ('e2','extras','Postre del día','Mazamorra, gelatina o fruta.',4),
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
-- Los precios SIEMPRE se leen de menu_items: el navegador nunca manda precios.
-- p = { name, phone, email, mode, address, notes, items: [{id, qty}] }
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

  select coalesce(sum(m.price * i.qty), 0) into v_subtotal
  from jsonb_to_recordset(p->'items') as i(id text, qty int)
  join public.menu_items m on m.id = i.id and m.active
  where i.qty > 0 and i.qty <= 50;

  if v_subtotal <= 0 then raise exception 'Productos inválidos'; end if;
  if v_mode = 'delivery' and v_subtotal < v_free_from then v_fee := v_fee_amount; end if;

  loop
    v_code := 'ZAB-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    exit when not exists (select 1 from public.orders where code = v_code);
  end loop;

  insert into public.orders (code, user_id, customer_name, phone, email, mode, address, notes,
                             subtotal, delivery_fee, total)
  values (v_code, auth.uid(), trim(p->>'name'), trim(p->>'phone'), coalesce(trim(p->>'email'), ''),
          v_mode, coalesce(trim(p->>'address'), ''), coalesce(trim(p->>'notes'), ''),
          v_subtotal, v_fee, v_subtotal + v_fee)
  returning id into v_order;

  insert into public.order_items (order_id, item_id, name, price, qty)
  select v_order, m.id, m.name, m.price, i.qty
  from jsonb_to_recordset(p->'items') as i(id text, qty int)
  join public.menu_items m on m.id = i.id and m.active
  where i.qty > 0 and i.qty <= 50;

  return v_code;
end $$;

grant execute on function public.create_order(jsonb) to anon, authenticated;

-- =============================================================
--  ETAPA 4 · Panel de pedidos (administradores)
-- =============================================================

-- Orden y etiquetas de la carta de ejemplo
update public.menu_items set sort = v.s, tag = v.t
from (values ('m1',1,'Más pedido'),('m2',2,''),('m3',3,''),('m4',4,'Saludable'),
             ('e1',5,''),('e2',6,''),('b1',7,''),('b2',8,'')) as v(id,s,t)
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
