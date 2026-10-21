-- =============================================================================
-- ZOOOT — DROP 001 · store backend
-- Orders, payments, inventory, subscribers and settings for the owner dashboard.
--
-- Security model
--   * Every table has RLS. Only rows in public.admins (owner accounts) can read
--     or change orders, payments, customers, subscribers or settings.
--   * The public storefront never touches tables directly: it calls a few
--     SECURITY DEFINER functions that validate input and use server-side prices.
-- =============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------- admins
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ----------------------------------------------------------------------------- products
create table if not exists public.products (
  id               text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  type             text not null default 'extra' check (type in ('set', 'hoodie', 'sirwal', 'extra', 'custom')),
  ref              text,
  name             jsonb not null,                -- {"ar": "...", "en": "..."}
  sub              jsonb,
  description      jsonb,
  price            numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price is null or compare_at_price >= 0),
  images           jsonb not null default '[]',
  swatches         jsonb not null default '[]',
  sizes            jsonb not null default '[]',   -- ["XS", …]; [] = one size
  stock            jsonb,                         -- {"M": 4} · {"ONE": 10} · null = not tracked
  out_of_stock     boolean not null default false,
  active           boolean not null default true,
  sort             int not null default 100,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------- orders
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id                   uuid primary key default gen_random_uuid(),
  order_no             text not null unique default ('ZT-' || nextval('public.order_number_seq')),
  status               text not null default 'new'
                         check (status in ('new', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
  payment_status       text not null default 'unpaid' check (payment_status in ('unpaid', 'partial', 'paid', 'refunded')),
  payment_method       text not null default 'cod',
  source               text not null default 'web',
  customer_name        text not null check (length(customer_name) between 1 and 120),
  customer_phone       text not null check (length(customer_phone) between 6 and 20),
  customer_email       text check (customer_email is null or length(customer_email) <= 254),
  city                 text,
  district             text,
  address              text,
  customer_note        text,
  internal_note        text,
  lang                 text not null default 'ar' check (lang in ('ar', 'en')),
  currency             text not null default 'SAR',
  subtotal             numeric(10, 2) not null default 0,
  discount             numeric(10, 2) not null default 0 check (discount >= 0),
  shipping             numeric(10, 2) not null default 0 check (shipping >= 0),
  total                numeric(10, 2) not null default 0,
  paid_amount          numeric(10, 2) not null default 0,
  courier              text,
  tracking_no          text,
  confirmation_sent_at timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_phone_idx on public.orders (customer_phone);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  product_id text references public.products (id) on delete set null,
  name       jsonb not null,
  image      text,
  options    jsonb not null default '[]',
  size       text,                                 -- stock key that was decremented
  meta       jsonb,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  qty        int not null check (qty between 1 and 99),
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  amount     numeric(10, 2) not null check (amount <> 0),   -- negative = refund
  method     text not null default 'cash',
  reference  text,
  note       text,
  paid_at    timestamptz not null default now(),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments (order_id);

create table if not exists public.order_events (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  type       text not null,          -- created | status | payment | price | note | email
  data       jsonb not null default '{}',
  actor      text,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at);

-- ----------------------------------------------------------------------------- subscribers, settings, logs
create table if not exists public.subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  lang            text not null default 'ar' check (lang in ('ar', 'en')),
  source          text not null default 'footer',
  status          text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  token           uuid not null default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists public.settings (
  key        text primary key,          -- 'public' is readable by the storefront
  value      jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.email_log (
  id          bigint generated always as identity primary key,
  to_email    text not null,
  subject     text not null,
  template    text not null,
  status      text not null,            -- sent | failed | skipped
  provider_id text,
  error       text,
  order_id    uuid references public.orders (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid(),
  keys       jsonb not null,
  created_at timestamptz not null default now()
);

-- ============================================================================= triggers

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- Totals and payment status are always derived, never trusted from clients.
create or replace function public.orders_derive()
returns trigger language plpgsql as $$
begin
  new.total := greatest(round(new.subtotal - new.discount + new.shipping, 2), 0);
  new.payment_status := case
    when new.total > 0 and new.paid_amount >= new.total then 'paid'
    when new.paid_amount > 0 then 'partial'
    when exists (select 1 from public.payments p where p.order_id = new.id and p.amount < 0) then 'refunded'
    else 'unpaid'
  end;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists orders_derive on public.orders;
create trigger orders_derive before insert or update on public.orders
  for each row execute function public.orders_derive();

create or replace function public.recalc_order(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders o set
    subtotal    = coalesce((select round(sum(i.unit_price * i.qty), 2) from public.order_items i where i.order_id = o.id), 0),
    paid_amount = coalesce((select round(sum(p.amount), 2) from public.payments p where p.order_id = o.id), 0)
  where o.id = p_order;
end $$;

create or replace function public.order_children_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_order(old.order_id);
  else
    perform public.recalc_order(new.order_id);
  end if;
  if tg_table_name = 'payments' and tg_op = 'INSERT' then
    insert into public.order_events (order_id, type, data, actor)
    values (new.order_id, 'payment', jsonb_build_object('amount', new.amount, 'method', new.method, 'reference', new.reference),
            auth.jwt() ->> 'email');
  end if;
  return null;
end $$;

drop trigger if exists order_items_changed on public.order_items;
create trigger order_items_changed after insert or update or delete on public.order_items
  for each row execute function public.order_children_changed();

drop trigger if exists payments_changed on public.payments;
create trigger payments_changed after insert or update or delete on public.payments
  for each row execute function public.order_children_changed();

-- Return / re-take stock for an order's items (used when cancelling / un-cancelling).
create or replace function public.adjust_stock(p_order uuid, p_sign int)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select i.product_id, coalesce(i.size, 'ONE') as k, i.qty
    from public.order_items i
    where i.order_id = p_order and i.product_id is not null
  loop
    update public.products
       set stock = jsonb_set(stock, array[r.k], to_jsonb(greatest(coalesce((stock ->> r.k)::int, 0) + p_sign * r.qty, 0)))
     where id = r.product_id and stock is not null and stock ? r.k;
  end loop;
end $$;

create or replace function public.orders_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor text := auth.jwt() ->> 'email';
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_id, type, data, actor)
    values (new.id, 'created', jsonb_build_object('source', new.source, 'total', new.total), v_actor);
    return null;
  end if;
  if new.status is distinct from old.status then
    insert into public.order_events (order_id, type, data, actor)
    values (new.id, 'status', jsonb_build_object('from', old.status, 'to', new.status), v_actor);
    if new.status = 'cancelled' then perform public.adjust_stock(new.id, 1); end if;
    if old.status = 'cancelled' then perform public.adjust_stock(new.id, -1); end if;
  end if;
  -- price edits after the order was placed (not the running total while it is being created)
  if new.total is distinct from old.total and old.created_at <> now() then
    insert into public.order_events (order_id, type, data, actor)
    values (new.id, 'price', jsonb_build_object('from', old.total, 'to', new.total), v_actor);
  end if;
  return null;
end $$;

-- Deleting a live order puts its items back on the shelf (cancelled ones already did).
create or replace function public.orders_before_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status <> 'cancelled' then perform public.adjust_stock(old.id, 1); end if;
  return old;
end $$;

drop trigger if exists orders_before_delete on public.orders;
create trigger orders_before_delete before delete on public.orders
  for each row execute function public.orders_before_delete();

drop trigger if exists orders_audit on public.orders;
create trigger orders_audit after insert or update on public.orders
  for each row execute function public.orders_audit();

-- ============================================================================= public API (storefront)

-- Place an order. Customers get server-side prices and stock checks; signed-in
-- owners may also set prices, discounts, shipping, source, status and payments
-- (manual orders from Instagram / WhatsApp / pop-ups).
create or replace function public.create_order(p jsonb)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_admin    boolean := public.is_admin();
  v_settings jsonb := coalesce((select value from public.settings where key = 'public'), '{}');
  v_order    public.orders;
  v_item     jsonb;
  v_prod     public.products;
  v_qty      int;
  v_key      text;
  v_price    numeric;
  v_image    text;
  v_sub      numeric := 0;
  v_ship     numeric;
  v_free     numeric;
  v_paid     numeric;
begin
  if coalesce(btrim(p ->> 'customer_name'), '') = '' or length(p ->> 'customer_name') > 120 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if coalesce(p ->> 'customer_phone', '') !~ '^\+?[0-9 ]{9,18}$' then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;
  if nullif(btrim(p ->> 'customer_email'), '') is not null
     and (p ->> 'customer_email') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if not v_admin and (coalesce(btrim(p ->> 'city'), '') = '' or coalesce(btrim(p ->> 'address'), '') = '') then
    raise exception 'invalid_address' using errcode = '22023';
  end if;
  if jsonb_typeof(p -> 'items') is distinct from 'array'
     or jsonb_array_length(p -> 'items') = 0 or jsonb_array_length(p -> 'items') > 30 then
    raise exception 'invalid_items' using errcode = '22023';
  end if;

  insert into public.orders (customer_name, customer_phone, customer_email, city, district, address,
                             customer_note, internal_note, lang, source, payment_method, status)
  values (
    btrim(p ->> 'customer_name'),
    btrim(p ->> 'customer_phone'),
    nullif(lower(btrim(p ->> 'customer_email')), ''),
    left(nullif(btrim(p ->> 'city'), ''), 80),
    left(nullif(btrim(p ->> 'district'), ''), 80),
    left(nullif(btrim(p ->> 'address'), ''), 500),
    left(nullif(btrim(p ->> 'customer_note'), ''), 1000),
    case when v_admin then left(nullif(btrim(p ->> 'internal_note'), ''), 2000) end,
    case when p ->> 'lang' = 'en' then 'en' else 'ar' end,
    case when v_admin then coalesce(nullif(p ->> 'source', ''), 'manual') else 'web' end,
    case when coalesce(p ->> 'payment_method', '') ~ '^[a-z]{2,12}$' then p ->> 'payment_method' else 'cod' end,
    case when v_admin and p ->> 'status' in ('new', 'confirmed', 'preparing', 'shipped', 'delivered') then p ->> 'status' else 'new' end
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    v_qty := greatest(1, least(coalesce((v_item ->> 'qty')::int, 1), case when v_admin then 99 else 10 end));
    select * into v_prod from public.products where id = v_item ->> 'pid';
    if v_prod.id is null then
      raise exception 'unknown_product:%', v_item ->> 'pid' using errcode = '22023';
    end if;
    if not v_admin and (v_prod.out_of_stock or not v_prod.active) then
      raise exception 'out_of_stock:%', v_prod.id using errcode = 'P0001';
    end if;

    v_key := coalesce(nullif(v_item ->> 'size', ''), 'ONE');
    if v_prod.stock is not null and v_prod.stock ? v_key then
      if not v_admin and (v_prod.stock ->> v_key)::int < v_qty then
        raise exception 'out_of_stock:%:%', v_prod.id, v_key using errcode = 'P0001';
      end if;
      update public.products
         set stock = jsonb_set(stock, array[v_key], to_jsonb(greatest((stock ->> v_key)::int - v_qty, 0)))
       where id = v_prod.id;
    end if;

    v_price := case
      when v_admin and (v_item ->> 'unit_price') ~ '^[0-9]+(\.[0-9]{1,2})?$' then (v_item ->> 'unit_price')::numeric
      else v_prod.price
    end;
    v_image := case
      when v_admin or coalesce(v_item ->> 'image', '') ~ '^img/[a-z0-9/_.-]{1,120}$' then nullif(v_item ->> 'image', '')
    end;

    insert into public.order_items (order_id, product_id, name, image, options, size, meta, unit_price, qty)
    values (
      v_order.id, v_prod.id,
      case when v_admin and jsonb_typeof(v_item -> 'name') = 'object' then v_item -> 'name' else v_prod.name end,
      coalesce(v_image, v_prod.images ->> 0),
      case when jsonb_typeof(v_item -> 'options') = 'array' and length((v_item -> 'options')::text) < 2000
           then v_item -> 'options' else '[]'::jsonb end,
      nullif(v_item ->> 'size', ''),
      case when length(coalesce((v_item -> 'meta')::text, '')) < 1000 then v_item -> 'meta' end,
      v_price, v_qty
    );
    v_sub := v_sub + v_price * v_qty;
  end loop;

  v_ship := coalesce((v_settings ->> 'shipping_fee')::numeric, 0);
  v_free := coalesce((v_settings ->> 'free_shipping_over')::numeric, 0);
  if v_free > 0 and v_sub >= v_free then v_ship := 0; end if;
  if v_admin and (p ->> 'shipping') ~ '^[0-9]+(\.[0-9]{1,2})?$' then v_ship := (p ->> 'shipping')::numeric; end if;

  update public.orders set
    shipping = v_ship,
    discount = case when v_admin and (p ->> 'discount') ~ '^[0-9]+(\.[0-9]{1,2})?$' then (p ->> 'discount')::numeric else 0 end
  where id = v_order.id;

  v_paid := case when v_admin and (p ->> 'paid_amount') ~ '^[0-9]+(\.[0-9]{1,2})?$' then (p ->> 'paid_amount')::numeric else 0 end;
  if v_paid > 0 then
    insert into public.payments (order_id, amount, method, reference)
    values (v_order.id, v_paid, coalesce(nullif(p ->> 'payment_method', ''), 'cash'), nullif(p ->> 'payment_reference', ''));
  end if;

  select * into v_order from public.orders where id = v_order.id;
  return jsonb_build_object('id', v_order.id, 'order_no', v_order.order_no, 'total', v_order.total,
                            'subtotal', v_order.subtotal, 'shipping', v_order.shipping);
end $$;

-- Customer-facing tracking: order number + the phone used at checkout.
-- Returns status and items only — never the address or other personal data.
create or replace function public.track_order(p_order_no text, p_phone text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'order_no', o.order_no, 'status', o.status, 'payment_status', o.payment_status,
    'created_at', o.created_at, 'updated_at', o.updated_at,
    'courier', o.courier, 'tracking_no', o.tracking_no,
    'total', o.total, 'currency', o.currency, 'lang', o.lang,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty, 'image', i.image, 'options', i.options)
                                        order by i.created_at)
                       from public.order_items i where i.order_id = o.id), '[]'),
    'events', coalesce((select jsonb_agg(jsonb_build_object('type', e.type, 'to', e.data ->> 'to', 'at', e.created_at)
                                         order by e.created_at)
                        from public.order_events e where e.order_id = o.id and e.type in ('created', 'status')), '[]')
  )
  from public.orders o
  where upper(o.order_no) = upper(btrim(p_order_no))
    and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 9
    and right(regexp_replace(o.customer_phone, '\D', '', 'g'), 9) = right(regexp_replace(p_phone, '\D', '', 'g'), 9)
  limit 1;
$$;

create or replace function public.subscribe(p_email text, p_lang text default 'ar', p_source text default 'footer')
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare v_rows int := 0; v_email text := lower(btrim(p_email));
begin
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  insert into public.subscribers (email, lang, source)
  values (v_email, case when p_lang = 'en' then 'en' else 'ar' end, left(coalesce(p_source, 'footer'), 30))
  on conflict (email) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    update public.subscribers set status = 'subscribed', unsubscribed_at = null
     where email = v_email and status = 'unsubscribed';
    get diagnostics v_rows = row_count;
  end if;
  return jsonb_build_object('is_new', v_rows > 0);
end $$;

create or replace function public.unsubscribe(p_token uuid)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  update public.subscribers set status = 'unsubscribed', unsubscribed_at = now()
   where token = p_token and status = 'subscribed';
  return found;
end $$;

revoke all on function public.create_order(jsonb) from public;
revoke all on function public.track_order(text, text) from public;
revoke all on function public.subscribe(text, text, text) from public;
revoke all on function public.unsubscribe(uuid) from public;
revoke all on function public.recalc_order(uuid) from public;
revoke all on function public.adjust_stock(uuid, int) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated, service_role;
grant execute on function public.track_order(text, text) to anon, authenticated, service_role;
grant execute on function public.subscribe(text, text, text) to anon, authenticated, service_role;
grant execute on function public.unsubscribe(uuid) to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ============================================================================= row level security
alter table public.admins             enable row level security;
alter table public.products           enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.payments           enable row level security;
alter table public.order_events       enable row level security;
alter table public.subscribers        enable row level security;
alter table public.settings           enable row level security;
alter table public.email_log          enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select to authenticated using (user_id = auth.uid());

drop policy if exists products_read on public.products;
create policy products_read on public.products for select to anon, authenticated using (active or public.is_admin());
drop policy if exists products_admin on public.products;
create policy products_admin on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select to anon, authenticated using (key = 'public' or public.is_admin());
drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['orders', 'order_items', 'payments', 'order_events', 'subscribers', 'email_log', 'push_subscriptions'] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
                   t || '_admin', t);
  end loop;
end $$;

grant select on public.products, public.settings to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ============================================================================= realtime + storage
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders, public.order_items, public.payments, public.order_events, public.products;
  end if;
exception when duplicate_object then null;
end $$;

-- Product photos uploaded from the dashboard (public read, owners write).
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('products', 'products', true) on conflict (id) do nothing;
    execute 'drop policy if exists "products images read" on storage.objects';
    execute 'create policy "products images read" on storage.objects for select using (bucket_id = ''products'')';
    execute 'drop policy if exists "products images write" on storage.objects';
    execute 'create policy "products images write" on storage.objects for all to authenticated using (bucket_id = ''products'' and public.is_admin()) with check (bucket_id = ''products'' and public.is_admin())';
  end if;
end $$;
