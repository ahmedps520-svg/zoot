-- Courier app behaviour: what a courier can see and do, and what customers see.
\set ON_ERROR_STOP on
\set QUIET on

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000c0001', 'courier1demo@zooot.sa'),
  ('00000000-0000-0000-0000-0000000c0002', 'courier2@zooot.sa'),
  ('00000000-0000-0000-0000-0000000e0001', 'someone@example.com');

-- ---------------------------------------------------------------- owner sets up
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","email":"admindemo@zooot.sa","role":"authenticated"}', false);

do $$
declare c public.couriers; r jsonb;
begin
  c := public.admin_add_courier('Courier1Demo@zooot.sa', 'سالم', '0550000001');
  assert c.name = 'سالم' and c.active, 'courier added by email';
  perform public.admin_add_courier('courier2@zooot.sa', 'Fahad', null);
  begin
    perform public.admin_add_courier('nobody@zooot.sa', 'x', null);
    raise exception 'should fail';
  exception when others then
    assert sqlerrm = 'user_not_found', 'unknown email: ' || sqlerrm;
  end;
  -- a ready order (no shipping company) and one going by SMSA
  r := public.create_order('{"customer_name":"Reem","customer_phone":"0507654321","city":"Riyadh","address":"Narjis 4",
        "status":"preparing","payment_method":"cod","items":[{"pid":"sirwal-late-night","qty":1,"size":"M"}]}');
  perform set_config('test.ready', r ->> 'id', false);
  perform set_config('test.ready_no', r ->> 'order_no', false);
  r := public.create_order('{"customer_name":"Smsa","customer_phone":"0507654322","city":"Abha","address":"x",
        "status":"preparing","items":[{"pid":"sirwal-late-night","qty":1,"size":"M"}]}');
  update public.orders set courier = 'SMSA' where id = (r ->> 'id')::uuid;
  perform set_config('test.smsa', r ->> 'id', false);
end $$;

-- ---------------------------------------------------------------- strangers
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000e0001","email":"someone@example.com","role":"authenticated"}', false);
do $$
begin
  perform public.courier_orders();
  raise exception 'should fail';
exception when others then
  assert sqlerrm = 'not_courier', 'non-courier blocked: ' || sqlerrm;
end $$;

-- ---------------------------------------------------------------- courier 1
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000c0001","email":"courier1demo@zooot.sa","role":"authenticated"}', false);
do $$
declare list jsonb; r jsonb; ready uuid := current_setting('test.ready')::uuid; v_rows int;
begin
  list := public.courier_orders();
  assert exists (select 1 from jsonb_array_elements(list) e where (e ->> 'id')::uuid = ready), 'ready order visible';
  assert not exists (select 1 from jsonb_array_elements(list) e where (e ->> 'id')::uuid = current_setting('test.smsa')::uuid), 'SMSA order hidden';
  assert not exists (select 1 from jsonb_array_elements(list) e where e ? 'internal_note' or e ? 'subtotal'), 'only delivery fields';

  r := public.courier_action(ready, 'start', now() + interval '30 minutes');
  assert r ->> 'status' = 'shipped' and (r ->> 'mine')::boolean, 'out for delivery';
  assert r ->> 'out_for_delivery_at' is not null and r ->> 'delivery_eta' is not null, 'stamped with ETA';

  perform public.courier_ping(24.7136, 46.6753, 12, 90, 8);
  r := public.courier_me('سالم', null);
  assert r ->> 'name' = 'سالم', 'profile';

  -- couriers still can't read or touch orders directly (RLS: owners only)
  update public.orders set discount = 999 where id = ready;
  get diagnostics v_rows = row_count;
  assert v_rows = 0, 'direct update must not apply';
  assert not exists (select 1 from public.orders), 'no direct reads';
end $$;

-- ---------------------------------------------------------------- customer tracking
reset role;
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$
declare r jsonb;
begin
  r := public.track_order(current_setting('test.ready_no'), '0507654321');
  assert r -> 'driver' ->> 'name' = 'سالم', 'driver name shown';
  assert (r -> 'driver' -> 'location' ->> 'lat')::float = 24.7136, 'live location shown';
  assert r -> 'driver' ->> 'eta' is not null, 'eta shown';
end $$;
reset role;
-- stale ping → no location, ETA stays
update public.courier_locations set updated_at = now() - interval '30 minutes';
set role anon;
do $$
declare r jsonb;
begin
  r := public.track_order(current_setting('test.ready_no'), '0507654321');
  assert r -> 'driver' -> 'location' = 'null'::jsonb or r -> 'driver' -> 'location' is null, 'stale location hidden';
  assert r -> 'driver' ->> 'eta' is not null, 'eta fallback';
end $$;
reset role;

-- ---------------------------------------------------------------- courier 2 can't take it
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000c0002","email":"courier2@zooot.sa","role":"authenticated"}', false);
do $$
declare list jsonb;
begin
  list := public.courier_orders();
  assert not exists (select 1 from jsonb_array_elements(list) e where (e ->> 'id')::uuid = current_setting('test.ready')::uuid), 'other courier’s order hidden';
  perform public.courier_action(current_setting('test.ready')::uuid, 'delivered');
  raise exception 'should fail';
exception when others then
  assert sqlerrm = 'not_your_order', 'other courier blocked: ' || sqlerrm;
end $$;

-- ---------------------------------------------------------------- delivered + cash
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000c0001","email":"courier1demo@zooot.sa","role":"authenticated"}', false);
do $$
declare r jsonb;
begin
  r := public.courier_action(current_setting('test.ready')::uuid, 'delivered', null, null, 9999);
  assert r ->> 'status' = 'delivered' and r ->> 'delivered_at' is not null, 'delivered';
  assert (r ->> 'balance')::numeric = 0 and r ->> 'payment_status' = 'paid', 'cash collected: ' || (r ->> 'balance');
  -- still listed today as done
  assert exists (select 1 from jsonb_array_elements(public.courier_orders()) e where e ->> 'id' = r ->> 'id' and e ->> 'status' = 'delivered'), 'done today';
end $$;
reset role;
do $$
declare o public.orders; n int;
begin
  select * into o from public.orders where id = current_setting('test.ready')::uuid;
  assert o.paid_amount = o.total, 'cash capped at the balance: ' || o.paid_amount || '/' || o.total;
  assert o.courier = 'ZOOOT' and o.out_for_delivery_at is not null, 'courier + timestamps';
  select count(*) into n from public.order_events where order_id = o.id and actor = 'courier1demo@zooot.sa';
  assert n >= 3, 'courier actions audited, got ' || n;
end $$;
\echo 'courier tests passed'
