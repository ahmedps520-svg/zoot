-- Behaviour tests for the store schema. Each block raises on failure.
\set ON_ERROR_STOP on
\set QUIET on

-- An owner account and some stock to play with.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000a001', 'admindemo@zooot.sa');
insert into public.admins (user_id, email) values ('00000000-0000-0000-0000-00000000a001', 'admindemo@zooot.sa');
update public.products set stock = '{"XS":0,"S":2,"M":5,"L":5,"XL":1,"XXL":0}' where id = 'hoodie-01';
update public.settings set value = value || '{"shipping_fee": 25, "free_shipping_over": 600}' where key = 'public';

-- ---------------------------------------------------------------- customers (anon)
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);

do $$
declare r jsonb;
begin
  -- Prices come from the database, even if the client sends its own.
  r := public.create_order('{"customer_name":"Test","customer_phone":"0501234567","city":"Jeddah","address":"St 1",
        "items":[{"pid":"hoodie-01","qty":2,"size":"M","unit_price":"1"}]}');
  assert (r ->> 'subtotal')::numeric = 578, 'server-side price expected 578, got ' || (r ->> 'subtotal');
  assert (r ->> 'shipping')::numeric = 25, 'shipping fee expected';
  assert (r ->> 'total')::numeric = 603, 'total expected 603, got ' || (r ->> 'total');
  assert r ->> 'order_no' = 'ZT-1001', 'first order number should be ZT-1001';
end $$;

do $$
begin
  perform public.create_order('{"customer_name":"Test","customer_phone":"0501234567","city":"Jeddah","address":"St 1",
        "items":[{"pid":"hoodie-01","qty":1,"size":"XXL"}]}');
  raise exception 'should have failed: XXL has no stock';
exception when others then
  assert sqlerrm like 'out_of_stock:hoodie-01:XXL%', 'unexpected error: ' || sqlerrm;
end $$;

do $$
begin
  perform public.create_order('{"customer_name":"","customer_phone":"0501234567","items":[{"pid":"hoodie-01"}]}');
  raise exception 'should have failed: no name';
exception when others then
  assert sqlerrm = 'invalid_name', 'unexpected error: ' || sqlerrm;
end $$;

do $$
declare n int;
begin
  begin
    select count(*) into n from public.orders;
    assert n = 0, 'anon must not read orders (RLS)';
  exception when insufficient_privilege then null;  -- no grant at all: also fine
  end;
  select count(*) into n from public.products;
  assert n > 0, 'anon can read the catalogue';
  begin
    update public.products set price = 1 where id = 'hoodie-01';
  exception when insufficient_privilege then null;
  end;
end $$;

do $$
declare r jsonb;
begin
  r := public.track_order('zt-1001', '+966 50 123 4567');
  assert r ->> 'status' = 'new', 'tracking with the right phone works';
  assert r -> 'customer_name' is null and r -> 'address' is null, 'tracking hides personal data';
  assert public.track_order('ZT-1001', '0509999999') is null, 'wrong phone returns nothing';
  r := public.subscribe('Fan@Example.com', 'en', 'footer');
  assert (r ->> 'is_new')::boolean, 'first subscribe is new';
  r := public.subscribe('fan@example.com');
  assert not (r ->> 'is_new')::boolean, 'second subscribe is not new';
end $$;

reset role;

-- ---------------------------------------------------------------- owner (authenticated admin)
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","email":"admindemo@zooot.sa","role":"authenticated"}', false);

do $$
declare o public.orders; s jsonb; r jsonb; n int;
begin
  assert public.is_admin(), 'owner is admin';
  select * into o from public.orders where order_no = 'ZT-1001';
  assert o.id is not null, 'owner can read orders';
  select stock into s from public.products where id = 'hoodie-01';
  assert (s ->> 'M')::int = 3, 'stock decremented to 3, got ' || (s ->> 'M');

  -- price editing → totals + audit event
  update public.order_items set unit_price = 250 where order_id = o.id;
  update public.orders set discount = 50 where id = o.id;
  select * into o from public.orders where id = o.id;
  assert o.subtotal = 500 and o.total = 475, 'edited total expected 475, got ' || o.total;

  -- payments → payment status
  insert into public.payments (order_id, amount, method) values (o.id, 200, 'transfer');
  select * into o from public.orders where id = o.id;
  assert o.payment_status = 'partial' and o.paid_amount = 200, 'partial payment';
  insert into public.payments (order_id, amount, method) values (o.id, 275, 'mada');
  select * into o from public.orders where id = o.id;
  assert o.payment_status = 'paid', 'fully paid';

  -- status flow + cancellation returns stock
  update public.orders set status = 'confirmed' where id = o.id;
  update public.orders set status = 'cancelled' where id = o.id;
  select stock into s from public.products where id = 'hoodie-01';
  assert (s ->> 'M')::int = 5, 'cancel returns stock, got ' || (s ->> 'M');
  update public.orders set status = 'new' where id = o.id;
  select stock into s from public.products where id = 'hoodie-01';
  assert (s ->> 'M')::int = 3, 'un-cancel takes stock again';

  -- refund
  insert into public.payments (order_id, amount, method) values (o.id, -475, 'refund');
  select * into o from public.orders where id = o.id;
  assert o.payment_status = 'refunded', 'refunded, got ' || o.payment_status;

  select count(*) into n from public.order_events where order_id = o.id and type = 'status';
  assert n = 3, 'three status events, got ' || n;
  select count(*) into n from public.order_events where order_id = o.id and type = 'payment';
  assert n = 3, 'three payment events, got ' || n;
  select count(*) into n from public.order_events where order_id = o.id and type = 'price';
  assert n >= 1, 'price edit was audited';

  -- manual order with owner overrides
  r := public.create_order('{"customer_name":"DM order","customer_phone":"0551112233","source":"instagram","status":"confirmed",
        "discount":"20","shipping":"0","paid_amount":"100","payment_method":"stcpay",
        "items":[{"pid":"sirwal-souq-pop","qty":1,"size":"L","unit_price":"200"}]}');
  select * into o from public.orders where id = (r ->> 'id')::uuid;
  assert o.source = 'instagram' and o.status = 'confirmed', 'owner overrides kept';
  assert o.total = 180 and o.paid_amount = 100 and o.payment_status = 'partial', 'manual totals, got ' || o.total;

  select count(*) into n from public.subscribers;
  assert n = 1, 'owner sees subscribers';

  -- deleting a live order restocks it
  r := public.create_order('{"customer_name":"Del","customer_phone":"0551112233","items":[{"pid":"hoodie-01","qty":2,"size":"L"}]}');
  select stock into s from public.products where id = 'hoodie-01';
  assert (s ->> 'L')::int = 3, 'L decremented to 3';
  delete from public.orders where id = (r ->> 'id')::uuid;
  select stock into s from public.products where id = 'hoodie-01';
  assert (s ->> 'L')::int = 5, 'delete restocks L to 5, got ' || (s ->> 'L');
end $$;

reset role;
\echo 'schema tests passed'
