-- Zabori · Etapa 12: Libro de Reclamaciones virtual (Código de Protección y Defensa del Consumidor,
-- D.S. 011-2011-PCM y modificatorias). Correr en Supabase → SQL Editor. Se puede repetir.
-- Las hojas no se borran: la ley pide conservarlas al menos 2 años. Por eso no hay permiso de borrado.

create table if not exists public.complaints (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,                 -- correlativo por año: LR-2026-00001
  kind        text not null check (kind in ('reclamo', 'queja')),
  name        text not null check (length(trim(name)) between 3 and 120),
  doc_type    text not null check (doc_type in ('DNI', 'CE', 'Pasaporte', 'RUC')),
  doc_number  text not null check (length(trim(doc_number)) between 6 and 15),
  address     text not null check (length(trim(address)) between 5 and 200),
  phone       text not null check (length(trim(phone)) between 6 and 20),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 120),
  guardian    text not null default '' check (length(guardian) <= 120), -- si quien reclama es menor de edad
  item_type   text not null check (item_type in ('producto', 'servicio')),
  order_code  text not null default '' check (length(order_code) <= 20),
  amount      numeric(10,2) check (amount is null or amount >= 0),
  item_descr  text not null check (length(trim(item_descr)) between 3 and 500),
  detail      text not null check (length(trim(detail)) between 10 and 2000),
  request     text not null check (length(trim(request)) between 3 and 1000),
  user_id     uuid references auth.users(id) on delete set null,
  status      text not null default 'pendiente' check (status in ('pendiente', 'respondido')),
  response    text not null default '' check (length(response) <= 3000),
  responded_at timestamptz,
  emailed_at  timestamptz,                          -- constancia enviada al correo del consumidor
  created_at  timestamptz not null default now()
);
create index if not exists complaints_created_idx on public.complaints (created_at desc);

alter table public.complaints enable row level security;
-- Nadie inserta directo (solo con create_complaint). El administrador ve y responde; nadie borra.
drop policy if exists "admin ve reclamos" on public.complaints;
create policy "admin ve reclamos" on public.complaints for select using (public.is_admin());
drop policy if exists "admin responde reclamos" on public.complaints;
create policy "admin responde reclamos" on public.complaints for update using (public.is_admin()) with check (public.is_admin());

-- Registra la hoja y devuelve su número correlativo. Sin huecos: el número se toma con candado por año.
create or replace function public.create_complaint(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_year text := to_char(now() at time zone 'America/Lima', 'YYYY');
  v_email text := lower(trim(coalesce(p->>'email', '')));
  v_n int;
  v_code text;
  v_row public.complaints;
begin
  -- Freno contra envíos repetidos desde un mismo correo
  if (select count(*) from public.complaints where email = v_email and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Ya registraste varias hojas hoy con este correo. Si necesitas agregar algo, escríbenos por WhatsApp.';
  end if;

  perform pg_advisory_xact_lock(hashtext('complaints-' || v_year));
  select coalesce(max(split_part(code, '-', 3)::int), 0) + 1 into v_n
  from public.complaints where code like 'LR-' || v_year || '-%';
  v_code := 'LR-' || v_year || '-' || lpad(v_n::text, 5, '0');

  insert into public.complaints (code, kind, name, doc_type, doc_number, address, phone, email, guardian,
    item_type, order_code, amount, item_descr, detail, request, user_id)
  values (v_code, p->>'kind', trim(p->>'name'), p->>'doc_type', trim(p->>'doc_number'), trim(p->>'address'),
    trim(p->>'phone'), v_email, trim(coalesce(p->>'guardian', '')), p->>'item_type',
    upper(trim(coalesce(p->>'order_code', ''))), nullif(p->>'amount', '')::numeric,
    trim(p->>'item_descr'), trim(p->>'detail'), trim(p->>'request'), auth.uid())
  returning * into v_row;

  return jsonb_build_object('code', v_row.code, 'created_at', v_row.created_at);
exception
  when check_violation or not_null_violation then
    raise exception 'Revisa los datos: hay campos vacíos o demasiado cortos.';
end $$;
revoke execute on function public.create_complaint(jsonb) from public;
grant execute on function public.create_complaint(jsonb) to anon, authenticated;
