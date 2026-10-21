-- ============================================================================
-- ZOOOT delivery couriers
--  · couriers sign in to their own app (/courier/) with a Supabase account
--  · they only ever touch orders through the security-definer RPCs below, so
--    they see just what a delivery needs and can't edit prices or other orders
--  · while out for delivery their phone shares its location; customers see it
--    on the tracking page (or the ETA when no fresh location is available)
-- ============================================================================

create table if not exists public.couriers (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  name       text not null default '',
  phone      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_courier()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.couriers where user_id = auth.uid() and active);
$$;

alter table public.orders
  add column if not exists courier_id          uuid references public.couriers (user_id) on delete set null,
  add column if not exists delivery_eta        timestamptz,
  add column if not exists delivery_location   text,
  add column if not exists out_for_delivery_at timestamptz,
  add column if not exists delivered_at        timestamptz;

create index if not exists orders_courier_idx on public.orders (courier_id, status);

create table if not exists public.courier_locations (
  courier_id uuid primary key references public.couriers (user_id) on delete cascade,
  lat        double precision not null check (lat between -90 and 90),
  lng        double precision not null check (lng between -180 and 180),
  accuracy   real,
  heading    real,
  speed      real,
  updated_at timestamptz not null default now()
);

-- Stamp delivery times whatever path the status takes (owner dashboard or courier app).
create or replace function public.orders_delivery_times()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'shipped' and (tg_op = 'INSERT' or old.status is distinct from 'shipped') then
    new.out_for_delivery_at := coalesce(new.out_for_delivery_at, now());
  end if;
  if new.status = 'delivered' and (tg_op = 'INSERT' or old.status is distinct from 'delivered') then
    new.delivered_at := now();
  end if;
  return new;
end $$;

drop trigger if exists orders_delivery_times on public.orders;
create trigger orders_delivery_times before insert or update of status on public.orders
  for each row execute function public.orders_delivery_times();

-- ---------------------------------------------------------------- courier RPCs
/** One order as the courier app sees it: delivery details only. */
create or replace function public.courier_order_json(o public.orders)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id, 'order_no', o.order_no, 'status', o.status, 'created_at', o.created_at,
    'customer_name', o.customer_name, 'customer_phone', o.customer_phone,
    'city', o.city, 'district', o.district, 'address', o.address, 'customer_note', o.customer_note,
    'lang', o.lang, 'payment_method', o.payment_method, 'payment_status', o.payment_status,
    'total', o.total, 'balance', greatest(o.total - o.paid_amount, 0),
    'courier_id', o.courier_id, 'mine', o.courier_id = auth.uid(),
    'delivery_eta', o.delivery_eta, 'delivery_location', o.delivery_location,
    'out_for_delivery_at', o.out_for_delivery_at, 'delivered_at', o.delivered_at,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty, 'image', i.image, 'options', i.options) order by i.created_at)
                       from public.order_items i where i.order_id = o.id), '[]'));
$$;

/** Orders that need delivering: mine (active + delivered in the last day) and unassigned ready ones. */
create or replace function public.courier_orders()
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not public.is_courier() then
    raise exception 'not_courier' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(public.courier_order_json(o) order by o.created_at)
    from public.orders o
    where (o.courier_id = auth.uid()
           and (o.status in ('confirmed', 'preparing', 'shipped')
                or (o.status = 'delivered' and o.delivered_at > now() - interval '24 hours')))
       or (o.courier_id is null
           and o.status in ('confirmed', 'preparing')
           and coalesce(o.courier, '') in ('', 'ZOOOT'))
  ), '[]');
end $$;

/**
 * Courier actions on one order:
 *   claim     take an unassigned ready order
 *   start     out for delivery (status → shipped) with an ETA
 *   eta       update the ETA
 *   location  save the address / pin the customer sent
 *   delivered handed over; p_collected records cash taken on the doorstep
 *   release   give the order back (not yet delivered)
 *   note      add a note to the order timeline
 */
create or replace function public.courier_action(
  p_order uuid, p_action text, p_eta timestamptz default null, p_text text default null, p_collected numeric default null)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  o public.orders;
begin
  if not public.is_courier() then
    raise exception 'not_courier' using errcode = '42501';
  end if;
  select * into o from public.orders where id = p_order for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if o.courier_id is distinct from v_uid
     and not (o.courier_id is null and p_action in ('claim', 'start') and o.status in ('confirmed', 'preparing', 'shipped')) then
    raise exception 'not_your_order' using errcode = '42501';
  end if;

  if p_action = 'claim' then
    update public.orders set courier_id = v_uid, courier = coalesce(nullif(courier, ''), 'ZOOOT') where id = o.id;
  elsif p_action = 'start' then
    if o.status not in ('confirmed', 'preparing', 'shipped') then
      raise exception 'bad_status:%', o.status using errcode = '22023';
    end if;
    update public.orders
       set courier_id = v_uid, courier = coalesce(nullif(courier, ''), 'ZOOOT'), status = 'shipped',
           delivery_eta = coalesce(p_eta, delivery_eta, now() + interval '45 minutes')
     where id = o.id;
  elsif p_action = 'eta' then
    update public.orders set delivery_eta = p_eta where id = o.id;
  elsif p_action = 'location' then
    update public.orders set delivery_location = left(nullif(btrim(p_text), ''), 500) where id = o.id;
  elsif p_action = 'delivered' then
    if o.status <> 'shipped' then
      raise exception 'bad_status:%', o.status using errcode = '22023';
    end if;
    if coalesce(p_collected, 0) > 0 then
      insert into public.payments (order_id, amount, method, note)
      values (o.id, least(p_collected, greatest(o.total - o.paid_amount, 0)), 'cash', 'collected by courier');
    end if;
    update public.orders set status = 'delivered' where id = o.id;
  elsif p_action = 'release' then
    if o.status = 'delivered' then
      raise exception 'bad_status:%', o.status using errcode = '22023';
    end if;
    update public.orders set courier_id = null, delivery_eta = null where id = o.id;
  elsif p_action = 'note' then
    insert into public.order_events (order_id, type, data, actor)
    values (o.id, 'note', jsonb_build_object('text', left(coalesce(p_text, ''), 2000)), auth.jwt() ->> 'email');
  else
    raise exception 'unknown_action' using errcode = '22023';
  end if;

  select * into o from public.orders where id = p_order;
  return public.courier_order_json(o);
end $$;

/** Live location ping from the courier's phone. */
create or replace function public.courier_ping(p_lat double precision, p_lng double precision,
  p_accuracy real default null, p_heading real default null, p_speed real default null)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_courier() then
    raise exception 'not_courier' using errcode = '42501';
  end if;
  insert into public.courier_locations (courier_id, lat, lng, accuracy, heading, speed, updated_at)
  values (auth.uid(), p_lat, p_lng, p_accuracy, p_heading, p_speed, now())
  on conflict (courier_id) do update
    set lat = excluded.lat, lng = excluded.lng, accuracy = excluded.accuracy,
        heading = excluded.heading, speed = excluded.speed, updated_at = now();
end $$;

/** The courier's own profile (the name customers see in messages and on tracking). */
create or replace function public.courier_me(p_name text default null, p_phone text default null)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare c public.couriers;
begin
  if not public.is_courier() then
    raise exception 'not_courier' using errcode = '42501';
  end if;
  update public.couriers
     set name = coalesce(nullif(btrim(p_name), ''), name), phone = coalesce(nullif(btrim(p_phone), ''), phone)
   where user_id = auth.uid()
  returning * into c;
  return jsonb_build_object('user_id', c.user_id, 'email', c.email, 'name', c.name, 'phone', c.phone);
end $$;

/** Owners add a courier by the email of an existing Supabase user. */
create or replace function public.admin_add_courier(p_email text, p_name text, p_phone text default null)
returns public.couriers
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid;
  c public.couriers;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  insert into public.couriers (user_id, email, name, phone, active)
  values (v_user, lower(btrim(p_email)), coalesce(nullif(btrim(p_name), ''), split_part(p_email, '@', 1)), p_phone, true)
  on conflict (user_id) do update set name = excluded.name, phone = coalesce(excluded.phone, couriers.phone), active = true
  returning * into c;
  return c;
end $$;

-- ---------------------------------------------------------------- customer tracking
-- Same as before plus the courier: name, ETA and — only while the order is out
-- for delivery and the phone pinged in the last 10 minutes — the live position.
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
    'delivered_at', o.delivered_at,
    'driver', case when o.status = 'shipped' and o.courier_id is not null then jsonb_build_object(
        'name', c.name, 'phone', c.phone, 'eta', o.delivery_eta, 'out_at', o.out_for_delivery_at,
        'location', case when l.updated_at > now() - interval '10 minutes' then
          jsonb_build_object('lat', l.lat, 'lng', l.lng, 'accuracy', l.accuracy, 'heading', l.heading, 'at', l.updated_at) end) end,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty, 'image', i.image, 'options', i.options)
                                        order by i.created_at)
                       from public.order_items i where i.order_id = o.id), '[]'),
    'events', coalesce((select jsonb_agg(jsonb_build_object('type', e.type, 'to', e.data ->> 'to', 'at', e.created_at)
                                         order by e.created_at)
                        from public.order_events e where e.order_id = o.id and e.type in ('created', 'status')), '[]')
  )
  from public.orders o
  left join public.couriers c on c.user_id = o.courier_id
  left join public.courier_locations l on l.courier_id = o.courier_id
  where upper(o.order_no) = upper(btrim(p_order_no))
    and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 9
    and right(regexp_replace(o.customer_phone, '\D', '', 'g'), 9) = right(regexp_replace(p_phone, '\D', '', 'g'), 9)
  limit 1;
$$;

-- ---------------------------------------------------------------- security
alter table public.couriers          enable row level security;
alter table public.courier_locations enable row level security;

drop policy if exists couriers_admin on public.couriers;
create policy couriers_admin on public.couriers for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists couriers_self on public.couriers;
create policy couriers_self on public.couriers for select to authenticated using (user_id = auth.uid());
drop policy if exists courier_locations_admin on public.courier_locations;
create policy courier_locations_admin on public.courier_locations for select to authenticated using (public.is_admin());

grant select, insert, update, delete on public.couriers to authenticated;
grant select on public.courier_locations to authenticated;

revoke all on function public.courier_order_json(public.orders) from public;
revoke all on function public.courier_orders() from public;
revoke all on function public.courier_action(uuid, text, timestamptz, text, numeric) from public;
revoke all on function public.courier_ping(double precision, double precision, real, real, real) from public;
revoke all on function public.courier_me(text, text) from public;
revoke all on function public.admin_add_courier(text, text, text) from public;
grant execute on function public.is_courier() to anon, authenticated, service_role;
grant execute on function public.courier_orders() to authenticated;
grant execute on function public.courier_action(uuid, text, timestamptz, text, numeric) to authenticated;
grant execute on function public.courier_ping(double precision, double precision, real, real, real) to authenticated;
grant execute on function public.courier_me(text, text) to authenticated;
grant execute on function public.admin_add_courier(text, text, text) to authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.courier_locations;
  end if;
exception when duplicate_object then null;
end $$;
