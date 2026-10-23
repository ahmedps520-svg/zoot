-- ZOOOT — live updates for customers and couriers.
--
-- Customers (anon) and couriers can't read `orders` directly, so Postgres Changes can't reach them.
-- Instead every order change broadcasts an empty "changed" ping on public Realtime topics:
--   order:<order id>     the tracking page (it learns the id from track_order, i.e. after the phone check)
--   courier:<user id>    the courier app (orders assigned to that courier)
--   couriers             every courier app (unassigned orders ready for delivery, the shared pool)
-- The ping carries no data; clients refetch through the RPCs that already check access.

-- ---------------------------------------------------------------- pings
create or replace function public.order_ping()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform realtime.send('{}'::jsonb, 'changed', 'order:' || new.id::text, false);
  if new.courier_id is not null then
    perform realtime.send('{}'::jsonb, 'changed', 'courier:' || new.courier_id::text, false);
  end if;
  if tg_op = 'UPDATE' and old.courier_id is not null and old.courier_id is distinct from new.courier_id then
    perform realtime.send('{}'::jsonb, 'changed', 'courier:' || old.courier_id::text, false);
  end if;
  -- Same rule as courier_orders' pool: unassigned, ready, delivered by ZOOOT itself.
  if (new.courier_id is null and new.status in ('confirmed', 'preparing') and coalesce(new.courier, '') in ('', 'ZOOOT'))
     or (tg_op = 'UPDATE' and old.courier_id is null and old.status in ('confirmed', 'preparing') and coalesce(old.courier, '') in ('', 'ZOOOT')) then
    perform realtime.send('{}'::jsonb, 'changed', 'couriers', false);
  end if;
  return null;
end $$;

create or replace trigger orders_ping
after insert or update on public.orders
for each row execute function public.order_ping();

-- The courier's phone moved: tell the tracking pages of the orders they're delivering.
create or replace function public.courier_location_ping()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  for v_id in select o.id from public.orders o where o.courier_id = new.courier_id and o.status = 'shipped' loop
    perform realtime.send('{"location":true}'::jsonb, 'changed', 'order:' || v_id::text, false);
  end loop;
  return null;
end $$;

create or replace trigger courier_locations_ping
after insert or update on public.courier_locations
for each row execute function public.courier_location_ping();

-- ---------------------------------------------------------------- tracking (adds the order id = live topic)
create or replace function public.track_order(p_order_no text, p_phone text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
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
-- Trigger functions are never called directly (Supabase grants EXECUTE to the API roles by default).
revoke execute on function public.order_ping() from public, anon, authenticated;
revoke execute on function public.courier_location_ping() from public, anon, authenticated;
revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated, service_role;
