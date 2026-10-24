-- ZOOOT — coupons & discounts.
--
-- Codes are checked and priced only on the server (create_order); the storefront previews them with
-- check_coupon. A coupon can also back a reveal page (the Ramadan envelopes): the QR in the envelope
-- carries `reveal_key`, and coupon_reveal hands out the code only once `starts_at` has passed, by the
-- database's clock. Real codes and keys live only in the database, never in this (public) repo.

-- ---------------------------------------------------------------- tables
create table if not exists public.coupons (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique check (code ~ '^[A-Z0-9-]{3,24}$'),
  label             text check (label is null or length(label) <= 80),
  kind              text not null default 'percent' check (kind in ('percent', 'fixed')),
  value             numeric(10, 2) not null check (value > 0),
  min_subtotal      numeric(10, 2) not null default 0 check (min_subtotal >= 0),
  starts_at         timestamptz,
  ends_at           timestamptz,
  max_uses          int check (max_uses is null or max_uses > 0),
  once_per_customer boolean not null default true,
  active            boolean not null default true,
  reveal_key        text unique check (reveal_key is null or reveal_key ~ '^[A-Za-z0-9]{6,32}$'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create or replace trigger coupons_touch before update on public.coupons
  for each row execute function public.touch_updated_at();

alter table public.orders add column if not exists coupon_code text;
create index if not exists orders_coupon_idx on public.orders (coupon_code) where coupon_code is not null;

-- ---------------------------------------------------------------- rules
-- Every order carrying the code counts, except cancelled ones (cancelling gives the use back).
create or replace function public.coupon_uses(p_code text)
returns int
language sql stable security definer
set search_path = public
as $$
  select count(*)::int from public.orders where coupon_code = p_code and status <> 'cancelled';
$$;

-- Raises the reason a coupon can't be used; returns the discount for p_subtotal (null without one).
create or replace function public.coupon_validate(c public.coupons, p_phone text, p_subtotal numeric)
returns numeric
language plpgsql stable security definer
set search_path = public
as $$
begin
  if c.id is null or not c.active then
    raise exception 'coupon_invalid' using errcode = '22023';
  end if;
  if c.starts_at is not null and now() < c.starts_at then
    -- A secret (envelope) code doesn't even admit it exists before its day.
    raise exception '%', case when c.reveal_key is not null then 'coupon_invalid' else 'coupon_not_started' end using errcode = '22023';
  end if;
  if c.ends_at is not null and now() >= c.ends_at then
    raise exception 'coupon_expired' using errcode = '22023';
  end if;
  if c.max_uses is not null and public.coupon_uses(c.code) >= c.max_uses then
    raise exception 'coupon_used_up' using errcode = '22023';
  end if;
  if c.once_per_customer and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 9 and exists (
       select 1 from public.orders o
        where o.coupon_code = c.code and o.status <> 'cancelled'
          and right(regexp_replace(o.customer_phone, '\D', '', 'g'), 9) = right(regexp_replace(p_phone, '\D', '', 'g'), 9)) then
    raise exception 'coupon_already_used' using errcode = '22023';
  end if;
  if p_subtotal is not null and p_subtotal < c.min_subtotal then
    raise exception 'coupon_min:%', c.min_subtotal using errcode = '22023';
  end if;
  return case
    when p_subtotal is null then null
    when c.kind = 'percent' then round(p_subtotal * c.value / 100, 2)
    else least(c.value, p_subtotal)
  end;
end $$;

-- ---------------------------------------------------------------- storefront
-- "Apply" in the checkout: preview only, create_order checks again when the order is placed.
create or replace function public.check_coupon(p_code text, p_phone text default null, p_subtotal numeric default null)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  c      public.coupons;
  v_disc numeric;
begin
  select * into c from public.coupons where code = upper(btrim(coalesce(p_code, '')));
  v_disc := public.coupon_validate(c, p_phone, p_subtotal);
  return jsonb_build_object('code', c.code, 'kind', c.kind, 'value', c.value, 'min_subtotal', c.min_subtotal,
                            'ends_at', c.ends_at, 'discount', v_disc);
end $$;

-- The envelope page: countdown data always, the code (and what it's worth) only once it's open.
create or replace function public.coupon_reveal(p_key text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'now', now(), 'starts_at', c.starts_at, 'ends_at', c.ends_at, 'state', s.state,
    'code',  case when s.state = 'open' then c.code end,
    'kind',  case when s.state = 'open' then c.kind end,
    'value', case when s.state = 'open' then c.value end,
    'min_subtotal', case when s.state = 'open' then c.min_subtotal end,
    'once_per_customer', c.once_per_customer)
  from public.coupons c
  cross join lateral (select case
      when not c.active then 'off'
      when c.ends_at is not null and now() >= c.ends_at then 'ended'
      when c.starts_at is not null and now() < c.starts_at then 'waiting'
      when c.max_uses is not null and public.coupon_uses(c.code) >= c.max_uses then 'used_up'
      else 'open' end as state) s
  where c.reveal_key is not null and c.reveal_key = btrim(coalesce(p_key, ''));
$$;

-- ---------------------------------------------------------------- dashboard
create or replace function public.coupon_stats()
returns table (code text, uses int, discount numeric, revenue numeric)
language sql stable security definer
set search_path = public
as $$
  select o.coupon_code, count(*)::int, coalesce(sum(o.discount), 0), coalesce(sum(o.total), 0)
  from public.orders o
  where public.is_admin() and o.coupon_code is not null and o.status <> 'cancelled'
  group by o.coupon_code;
$$;

-- ---------------------------------------------------------------- checkout (adds coupons)
-- Same as before, plus: `coupon` is validated with the coupon row locked (so max_uses can't be
-- overrun by two shoppers at once) and its discount is priced on the server.
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
  v_coupon   public.coupons;
  v_disc     numeric;
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

  if nullif(btrim(coalesce(p ->> 'coupon', '')), '') is not null then
    select * into v_coupon from public.coupons where code = upper(btrim(p ->> 'coupon')) for update;
    v_disc := public.coupon_validate(v_coupon, p ->> 'customer_phone', v_sub);
  end if;

  update public.orders set
    shipping    = v_ship,
    coupon_code = v_coupon.code,
    discount    = case when v_admin and (p ->> 'discount') ~ '^[0-9]+(\.[0-9]{1,2})?$' then (p ->> 'discount')::numeric
                       else coalesce(v_disc, 0) end
  where id = v_order.id;

  v_paid := case when v_admin and (p ->> 'paid_amount') ~ '^[0-9]+(\.[0-9]{1,2})?$' then (p ->> 'paid_amount')::numeric else 0 end;
  if v_paid > 0 then
    insert into public.payments (order_id, amount, method, reference)
    values (v_order.id, v_paid, coalesce(nullif(p ->> 'payment_method', ''), 'cash'), nullif(p ->> 'payment_reference', ''));
  end if;

  select * into v_order from public.orders where id = v_order.id;
  return jsonb_build_object('id', v_order.id, 'order_no', v_order.order_no, 'total', v_order.total,
                            'subtotal', v_order.subtotal, 'shipping', v_order.shipping,
                            'discount', v_order.discount, 'coupon_code', v_order.coupon_code);
end $$;

-- ---------------------------------------------------------------- security
alter table public.coupons enable row level security;
drop policy if exists coupons_admin on public.coupons;
create policy coupons_admin on public.coupons for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.coupons to authenticated;

-- Internal helpers: only reachable through the functions above.
revoke execute on function public.coupon_uses(text) from public, anon, authenticated;
revoke execute on function public.coupon_validate(public.coupons, text, numeric) from public, anon, authenticated;

revoke all on function public.check_coupon(text, text, numeric) from public;
revoke all on function public.coupon_reveal(text) from public;
revoke all on function public.coupon_stats() from public, anon;
revoke all on function public.create_order(jsonb) from public;
grant execute on function public.check_coupon(text, text, numeric) to anon, authenticated, service_role;
grant execute on function public.coupon_reveal(text) to anon, authenticated, service_role;
grant execute on function public.coupon_stats() to authenticated;
grant execute on function public.create_order(jsonb) to anon, authenticated, service_role;
