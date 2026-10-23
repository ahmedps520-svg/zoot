-- Live pings: order changes broadcast an empty "changed" message to the order's and the courier's topics.
\set ON_ERROR_STOP on
\set QUIET on

-- ---------------------------------------------------------------- customer checks out + tracks
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$
declare r jsonb; t jsonb;
begin
  r := public.create_order('{"customer_name":"Live","customer_phone":"0509990001","city":"Riyadh","address":"x",
        "items":[{"pid":"sirwal-late-night","qty":1,"size":"M"}]}');
  perform set_config('test.live', r ->> 'id', false);
  t := public.track_order(r ->> 'order_no', '+966 50 999 0001');
  assert t ->> 'id' = r ->> 'id', 'tracking hands out the live topic (order id)';
end $$;
reset role;
do $$
declare v_topic text := 'order:' || current_setting('test.live');
begin
  assert exists (select 1 from realtime.messages m where m.topic = v_topic and m.event = 'changed' and m.private = false), 'ping on create';
  assert not exists (select 1 from realtime.messages m where m.topic = v_topic and m.payload <> '{}'::jsonb), 'ping carries no data';
  assert not has_function_privilege('anon', 'public.order_ping()', 'execute'), 'trigger fn not callable by anon';
  assert not has_function_privilege('authenticated', 'public.courier_location_ping()', 'execute'), 'trigger fn not callable by users';
  delete from realtime.messages;
end $$;

-- ---------------------------------------------------------------- owner confirms → every courier sees it in the pool
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","email":"admindemo@zooot.sa","role":"authenticated"}', false);
update public.orders set status = 'confirmed' where id = current_setting('test.live')::uuid;
reset role;
do $$
begin
  assert exists (select 1 from realtime.messages where topic = 'couriers'), 'courier pool pinged';
  delete from realtime.messages;
end $$;

-- ---------------------------------------------------------------- owner hands it to courier 1
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","email":"admindemo@zooot.sa","role":"authenticated"}', false);
update public.orders set courier_id = '00000000-0000-0000-0000-0000000c0001', status = 'shipped' where id = current_setting('test.live')::uuid;
reset role;
do $$
begin
  assert exists (select 1 from realtime.messages where topic = 'order:' || current_setting('test.live')), 'customer pinged';
  assert exists (select 1 from realtime.messages where topic = 'courier:00000000-0000-0000-0000-0000000c0001'), 'courier pinged';
  assert exists (select 1 from realtime.messages where topic = 'couriers'), 'pool pinged (order left it)';
  delete from realtime.messages;
end $$;

-- ---------------------------------------------------------------- courier moves → the tracking page hears it
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000c0001","email":"courier1demo@zooot.sa","role":"authenticated"}', false);
select public.courier_ping(24.7, 46.7, 12);
reset role;
do $$
begin
  assert exists (select 1 from realtime.messages where topic = 'order:' || current_setting('test.live') and payload = '{"location":true}'), 'location ping';
  delete from realtime.messages;
end $$;

-- ---------------------------------------------------------------- reassigned → both couriers refresh
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","email":"admindemo@zooot.sa","role":"authenticated"}', false);
update public.orders set courier_id = '00000000-0000-0000-0000-0000000c0002' where id = current_setting('test.live')::uuid;
reset role;
do $$
begin
  assert exists (select 1 from realtime.messages where topic = 'courier:00000000-0000-0000-0000-0000000c0001'), 'old courier pinged';
  assert exists (select 1 from realtime.messages where topic = 'courier:00000000-0000-0000-0000-0000000c0002'), 'new courier pinged';
end $$;
\echo 'live tests passed'
