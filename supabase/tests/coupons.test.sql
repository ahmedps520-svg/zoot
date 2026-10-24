-- Coupons: server-side pricing, limits, and the envelope reveal page.
\set ON_ERROR_STOP on
\set QUIET on

-- ---------------------------------------------------------------- owner sets up the envelope coupon (opens later)
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","email":"admindemo@zooot.sa","role":"authenticated"}', false);
insert into public.coupons (code, label, kind, value, starts_at, ends_at, max_uses, reveal_key)
values ('TEST30-ENV', 'Envelopes', 'percent', 30, now() + interval '1 day', now() + interval '30 days', 2, 'envKey123');
insert into public.coupons (code, kind, value, min_subtotal) values ('BIG50', 'fixed', 50, 1000);
insert into public.coupons (code, kind, value, starts_at) values ('SOON15', 'percent', 15, now() + interval '3 days');
insert into public.coupons (code, kind, value, ends_at, starts_at) values ('OLD10', 'percent', 10, now() - interval '1 day', now() - interval '9 days');

-- ---------------------------------------------------------------- before the day: countdown only, code locked
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$
declare r jsonb;
begin
  r := public.coupon_reveal('envKey123');
  assert r ->> 'state' = 'waiting', 'waiting: ' || r::text;
  assert r ->> 'code' is null and r ->> 'value' is null, 'code and value hidden before the day';
  assert (r ->> 'starts_at')::timestamptz > now() and r ? 'now', 'countdown data';
  assert public.coupon_reveal('wrongKey99') is null, 'wrong key → nothing';
  begin
    perform public.check_coupon('test30-env');
    raise exception 'should fail';
  exception when others then
    assert sqlerrm = 'coupon_invalid', 'secret code hides itself before the day: ' || sqlerrm;
  end;
  begin
    perform public.check_coupon('SOON15');
    raise exception 'should fail';
  exception when others then
    assert sqlerrm = 'coupon_not_started', 'announced code says not yet: ' || sqlerrm;
  end;
  begin
    perform public.create_order('{"customer_name":"Early","customer_phone":"0501110001","city":"Riyadh","address":"x",
          "coupon":"TEST30-ENV","items":[{"pid":"sirwal-late-night","qty":1,"size":"M"}]}');
    raise exception 'should fail';
  exception when others then
    assert sqlerrm = 'coupon_invalid', 'early order: ' || sqlerrm;
  end;
  begin
    perform count(*) from public.coupons;
    raise exception 'should fail';
  exception when insufficient_privilege then
    null; -- customers never read the coupons table
  end;
  assert not has_function_privilege('anon', 'public.coupon_validate(public.coupons, text, numeric)', 'execute'), 'validator internal';
end $$;

-- ---------------------------------------------------------------- the day comes
reset role;
update public.coupons set starts_at = now() - interval '1 minute' where code = 'TEST30-ENV';
set role anon;
do $$
declare r jsonb; o jsonb; sub numeric;
begin
  r := public.coupon_reveal('envKey123');
  assert r ->> 'state' = 'open' and r ->> 'code' = 'TEST30-ENV' and (r ->> 'value')::numeric = 30, 'revealed: ' || r::text;

  r := public.check_coupon(' test30-env ', null, 229);
  assert (r ->> 'discount')::numeric = 68.70 and r ->> 'kind' = 'percent', 'preview 30% of 229: ' || r::text;

  o := public.create_order('{"customer_name":"Sara","customer_phone":"0501110001","city":"Riyadh","address":"x",
        "coupon":"test30-env","items":[{"pid":"sirwal-late-night","qty":1,"size":"M"}]}');
  sub := (o ->> 'subtotal')::numeric;
  assert (o ->> 'discount')::numeric = round(sub * 0.30, 2), 'server-side 30%: ' || o::text;
  assert (o ->> 'total')::numeric = sub - round(sub * 0.30, 2) + (o ->> 'shipping')::numeric, 'total after discount';
  assert o ->> 'coupon_code' = 'TEST30-ENV', 'code stored';
  perform set_config('test.cpn_order', o ->> 'id', false);

  -- a client-sent discount is ignored for customers
  o := public.create_order('{"customer_name":"Cheeky","customer_phone":"0501110009","city":"Riyadh","address":"x",
        "discount":"999","items":[{"pid":"sirwal-late-night","qty":1,"size":"M"}]}');
  assert (o ->> 'discount')::numeric = 0, 'no discount without a coupon';

  begin
    perform public.create_order('{"customer_name":"Sara again","customer_phone":"+966 50 111 0001","city":"Riyadh","address":"x",
          "coupon":"TEST30-ENV","items":[{"pid":"sirwal-late-night","qty":1,"size":"M"}]}');
    raise exception 'should fail';
  exception when others then
    assert sqlerrm = 'coupon_already_used', 'once per mobile: ' || sqlerrm;
  end;

  perform public.create_order('{"customer_name":"Noura","customer_phone":"0501110002","city":"Riyadh","address":"x",
        "coupon":"TEST30-ENV","items":[{"pid":"sirwal-late-night","qty":1,"size":"M"}]}');
  begin
    perform public.create_order('{"customer_name":"Third","customer_phone":"0501110003","city":"Riyadh","address":"x",
          "coupon":"TEST30-ENV","items":[{"pid":"sirwal-late-night","qty":1,"size":"M"}]}');
    raise exception 'should fail';
  exception when others then
    assert sqlerrm = 'coupon_used_up', 'max uses: ' || sqlerrm;
  end;
  assert public.coupon_reveal('envKey123') ->> 'state' = 'used_up', 'reveal page knows it ran out';

  begin
    perform public.check_coupon('BIG50', null, 229);
    raise exception 'should fail';
  exception when others then
    assert sqlerrm = 'coupon_min:1000.00', 'minimum order: ' || sqlerrm;
  end;
  begin
    perform public.check_coupon('OLD10');
    raise exception 'should fail';
  exception when others then
    assert sqlerrm = 'coupon_expired', 'expired: ' || sqlerrm;
  end;
  begin
    perform public.check_coupon('NOPE');
    raise exception 'should fail';
  exception when others then
    assert sqlerrm = 'coupon_invalid', 'unknown: ' || sqlerrm;
  end;
end $$;

-- ---------------------------------------------------------------- owner cancels one → the use comes back; stats
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","email":"admindemo@zooot.sa","role":"authenticated"}', false);
update public.orders set status = 'cancelled' where id = current_setting('test.cpn_order')::uuid;
do $$
declare s record;
begin
  select * into s from public.coupon_stats() where code = 'TEST30-ENV';
  assert s.uses = 1 and s.discount > 0, 'stats count live orders only: ' || s.uses;
  assert exists (select 1 from public.coupons where code = 'TEST30-ENV'), 'owner reads coupons';
end $$;
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$
begin
  perform public.create_order('{"customer_name":"Third","customer_phone":"0501110003","city":"Riyadh","address":"x",
        "coupon":"TEST30-ENV","items":[{"pid":"sirwal-late-night","qty":1,"size":"M"}]}');
  assert not has_function_privilege('anon', 'public.coupon_stats()', 'execute'), 'stats are owner-only';
end $$;

-- ---------------------------------------------------------------- after the end date: nothing to reveal
reset role;
update public.coupons set ends_at = now() - interval '1 second', starts_at = now() - interval '2 days' where code = 'TEST30-ENV';
set role anon;
do $$
declare r jsonb;
begin
  r := public.coupon_reveal('envKey123');
  assert r ->> 'state' = 'ended' and r ->> 'code' is null, 'ended: ' || r::text;
end $$;
reset role;
\echo 'coupon tests passed'
