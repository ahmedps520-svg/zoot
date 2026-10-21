-- Minimal stand-ins for the parts of Supabase the migration relies on, so the
-- schema can be tested on a plain PostgreSQL (see scripts/test-db.sh).
do $$
begin
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
exception when duplicate_object then null;
end $$;

create schema auth;
create table auth.users (id uuid primary key, email text);

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

create publication supabase_realtime;
