-- Zabori · Etapa 11: horarios de entrega y stock del día.
-- Correr en Supabase → SQL Editor. Se puede repetir; no borra ni cambia pedidos, cupos ni stock existentes.

-- Horario de entrega y stock del día (etapa 11)
alter table public.orders add column if not exists delivery_date date;
alter table public.orders add column if not exists delivery_slot text;
create index if not exists orders_delivery_idx on public.orders (delivery_date, delivery_slot);
alter table public.order_items add column if not exists entrada_id text;
-- Unidades por día de cada plato; vacío = sin límite
alter table public.menu_items add column if not exists daily_stock int check (daily_stock is null or daily_stock >= 0);

create table if not exists public.delivery_slots (
  id       text primary key,                  -- '12:00-12:30'
  start_at time not null,
  capacity int  not null default 20 check (capacity >= 0),
  days     int[] not null default '{1,2,3,4,5,6}' -- 0 = domingo
);
insert into public.delivery_slots (id, start_at) values
  ('12:00-12:30','12:00'), ('12:30-13:00','12:30'), ('13:00-13:30','13:00'),
  ('13:30-14:00','13:30'), ('14:00-14:30','14:00'), ('14:30-15:00','14:30')
on conflict (id) do nothing;
-- Un rango se puede elegir hasta que termina
alter table public.delivery_slots add column if not exists end_at time;
update public.delivery_slots set end_at = split_part(id, '-', 2)::time where end_at is null;

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
  v_today date := (now() at time zone 'America/Lima')::date;
  v_time time := (now() at time zone 'America/Lima')::time;
  v_slot text := p->>'delivery_slot';
  v_need jsonb := '{}'::jsonb; -- unidades que pide este pedido de cada plato o entrada
  v_entrada_id text;
  v_left int;
  sl public.delivery_slots;
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

  -- Uno a la vez por día: dos clientes no pueden tomar el último cupo o la última unidad
  perform pg_advisory_xact_lock(hashtext('zabori-cupos'), (v_today - date '2000-01-01'));

  select * into sl from public.delivery_slots where id = v_slot;
  if not found then raise exception 'Elige tu horario de entrega'; end if;
  if not (extract(dow from v_today)::int = any(sl.days)) or sl.end_at <= v_time then
    raise exception 'Ese horario ya no está disponible. Elige otro.';
  end if;
  if (select count(*) from public.orders o where o.delivery_date = v_today and o.delivery_slot = v_slot and o.status <> 'cancelado') >= sl.capacity then
    raise exception 'Ese horario ya se llenó. Elige otro.';
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
      v_entrada_id := null;
      v_need := v_need || jsonb_build_object(r.id, coalesce((v_need->>r.id)::int, 0) + v_qty);

      -- La entrada que eligió el cliente va incluida en el menú: queda en el detalle para la cocina
      if r.cat = 'menu' and coalesce(it->>'entrada', '') <> '' then
        select name into v_entrada from public.menu_items where id = it->>'entrada' and cat = 'entrada' and active;
        if not found then raise exception 'La entrada de tu % ya no está disponible', r.name; end if;
        v_detail := 'Entrada: ' || v_entrada;
        v_entrada_id := it->>'entrada';
        v_need := v_need || jsonb_build_object(v_entrada_id, coalesce((v_need->>v_entrada_id)::int, 0) + v_qty);
      end if;

      -- Los menús del día van con táper (si hay alguno disponible): se suma su precio
      if r.cat = 'menu' and exists (select 1 from public.build_options where grp = 'taper' and active) then
        select name, price into g from public.build_options where id = it->>'taper' and grp = 'taper' and active;
        if not found then raise exception 'Elige el táper de tu %', r.name; end if;
        v_price := v_price + g.price;
        v_detail := concat_ws(' · ', nullif(v_detail, ''), g.name);
      end if;

      v_lines := v_lines || jsonb_build_object('item_id', r.id, 'entrada_id', v_entrada_id, 'name', r.name, 'detail', v_detail, 'price', v_price, 'qty', v_qty);
    end if;

    v_subtotal := v_subtotal + v_price * v_qty;
  end loop;

  if v_subtotal <= 0 then raise exception 'Productos inválidos'; end if;

  -- Stock del día: lo vendido hoy (sin cancelados) más este pedido no puede pasar del límite
  for r in
    select m.id, m.name, m.daily_stock, (n.value)::int as need
    from jsonb_each_text(v_need) n join public.menu_items m on m.id = n.key
    where m.daily_stock is not null
  loop
    select r.daily_stock - coalesce(sum(i.qty), 0) into v_left
    from public.order_items i join public.orders o on o.id = i.order_id
    where o.delivery_date = v_today and o.status <> 'cancelado' and (i.item_id = r.id or i.entrada_id = r.id);
    if v_left <= 0 then raise exception 'Se agotó por hoy: %', r.name; end if;
    if r.need > v_left then raise exception 'Solo quedan % de %', v_left, r.name; end if;
  end loop;
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
                             subtotal, delivery_fee, total, payment_method, lat, lng, terms_version, terms_at, delivery_date, delivery_slot)
  values (v_code, auth.uid(), trim(p->>'name'), trim(p->>'phone'), coalesce(trim(p->>'email'), ''),
          v_mode, coalesce(trim(p->>'address'), ''), coalesce(trim(p->>'notes'), ''),
          v_subtotal, v_fee, v_subtotal + v_fee, coalesce(p->>'payment_method', 'tarjeta'), v_lat, v_lng,
          left(trim(p->>'terms_version'), 40), now(), v_today, v_slot)
  returning id into v_order;

  insert into public.order_items (order_id, item_id, entrada_id, name, detail, price, qty)
  select v_order, l.item_id, l.entrada_id, l.name, l.detail, l.price, l.qty
  from jsonb_to_recordset(v_lines) as l(item_id text, entrada_id text, name text, detail text, price numeric, qty int);

  return v_code;
end $$;

grant execute on function public.create_order(jsonb) to anon, authenticated;

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
    'deliverySlot', o.delivery_slot, 'deliveryDate', o.delivery_date,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name', i.name, 'detail', i.detail, 'qty', i.qty) order by i.id), '[]'::jsonb)
              from public.order_items i where i.order_id = o.id)
  );
end $$;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- =============================================================
--  ETAPA 11 · Horarios de entrega y stock del día
-- =============================================================
alter table public.delivery_slots enable row level security;
drop policy if exists "horarios publicos" on public.delivery_slots;
create policy "horarios publicos" on public.delivery_slots for select using (true);
drop policy if exists "admin gestiona horarios" on public.delivery_slots;
create policy "admin gestiona horarios" on public.delivery_slots for all using (public.is_admin()) with check (public.is_admin());

-- Lo que el cliente puede pedir ahora. Los números de venta solo los ve el administrador.
create or replace function public.availability() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'America/Lima')::date;
  v_time time := (now() at time zone 'America/Lima')::time;
  v_result jsonb;
begin
  with taken as (
    select s.*, (select count(*)::int from public.orders o
                 where o.delivery_date = v_today and o.delivery_slot = s.id and o.status <> 'cancelado') as n
    from public.delivery_slots s
  ), sold as (
    select m.id, m.daily_stock, (select coalesce(sum(i.qty), 0)::int
                 from public.order_items i join public.orders o on o.id = i.order_id
                 where o.delivery_date = v_today and o.status <> 'cancelado' and (i.item_id = m.id or i.entrada_id = m.id)) as n
    from public.menu_items m where m.cat in ('menu', 'entrada', 'shots')
  )
  select jsonb_build_object(
    'slots', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id,
        'status', case when not (extract(dow from v_today)::int = any(t.days)) then 'closed'
                       when t.end_at <= v_time then 'past'
                       when t.n >= t.capacity then 'full'
                       else 'open' end
      ) order by t.start_at), '[]'::jsonb) from taken t),
    'stock', (select coalesce(jsonb_object_agg(x.id, greatest(x.daily_stock - x.n, 0)), '{}'::jsonb) from sold x where x.daily_stock is not null),
    'admin', case when public.is_admin() then jsonb_build_object(
        'taken', (select coalesce(jsonb_object_agg(t.id, t.n), '{}'::jsonb) from taken t),
        'sold', (select coalesce(jsonb_object_agg(x.id, x.n), '{}'::jsonb) from sold x)
      ) end
  ) into v_result;
  return v_result;
end $$;
grant execute on function public.availability() to anon, authenticated;
