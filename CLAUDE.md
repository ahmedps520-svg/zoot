# ZOOOT (زوووط) — store, owner dashboard, courier app

Vite multi-page site, deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`
(https://ahmedps520-svg.github.io/zoot/). Arabic-first (RTL) with English via `data-en` / `L(ar, en)`.

- Storefront: `*.html` + `src/js/` (checkout, newsletter, live catalogue in `core/store.js`, tracking in `pages/track.js`)
- Owner dashboard (PWA): `admin/` + `src/admin/`
- Courier app (PWA): `courier/` + `src/courier/`
- Backend switch: `src/js/backend/config.js` — **live**: defaults to the ZOOOT Supabase project (public URL +
  publishable key). `VITE_DEMO=1` switches to demo mode (localStorage only) for trying changes without real data;
  the Playwright checks in this repo's history ran against `VITE_DEMO=1 npx vite`.
- Supabase: `supabase/migrations/*.sql` (schema, RLS, RPCs), `supabase/seed.sql` (products), edge functions in
  `supabase/functions/` (`place-order`, `subscribe`, `admin-email`, all `verify_jwt = false`, they check auth themselves).

Commands: `npm run dev`, `npm run build`, `npm run seed:sql`, `PGHOST=… PGUSER=postgres npm run test:db`.

## The owner doesn't use a terminal or read docs

Explain things in chat in plain steps. Never ask for passwords, API keys or tokens in chat: the owner types those
into Supabase / GitHub / Resend settings pages themselves.

## Supabase (project ref `ffwjxvrporoittxrllru`) — live since 2026-10-23

- Schema = `supabase/migrations/*.sql` + `supabase/seed.sql` (21 products). On the live project they were applied in
  pieces through the Supabase connector: statements like `drop ... if exists` and `delete` wait for the owner's
  confirmation and time out after 60 s, so on a fresh object leave them out, and remove data as the owner via the
  REST API (RLS lets admins delete) instead of `delete` through the connector.
- Edge functions `place-order`, `subscribe`, `admin-email` are deployed with JWT verification off (they check auth
  themselves). The deployed copies import `./_shared/…` (bundled per function) instead of the repo's `../_shared/…`.
- Accounts: owner `admindemo@zooot.sa`, courier `courier1demo@zooot.sa` (display name «مندوب زوووط»). The owner chose
  these test passwords in chat; suggest changing them (dashboard → Settings → Change password) and adding real
  owner/courier accounts (Supabase → Authentication → Users → Add user, then `public.admins` /
  `public.admin_add_courier`).
- Emails are logged as `skipped` until the owner adds the edge-function secrets `RESEND_API_KEY`, `MAIL_FROM`
  (e.g. `ZOOOT <orders@zooot.sa>`), `SITE_URL`, `OWNER_EMAIL` in Supabase (Edge Functions → Secrets) — needs the
  zooot.sa domain verified in Resend first. Never handle those values in chat.
- Live updates for customers/couriers (who can't read `orders` under RLS): triggers broadcast an empty `changed` ping
  on public Realtime topics `order:<id>`, `courier:<user id>` and `couriers` (pool) — see
  `20261023000000_live_tracking.sql`. Clients refetch through `track_order` / `courier_orders`. The storefront loads
  `@supabase/realtime-js` lazily (`watchTopic` in `src/js/backend/public.js`); the tracking page remembers
  order number + mobile per device (`src/js/core/orders.js`, "My orders"). There is no customer login yet: a real
  phone login needs an SMS/WhatsApp OTP provider set up in Supabase Auth by the owner.
- `place-order` answers right after `create_order` and sends emails/push via `EdgeRuntime.waitUntil`; the checkout
  warms it up (OPTIONS) when it opens.
- Supabase grants EXECUTE on new functions to `anon`/`authenticated` by default: revoke it explicitly on internal
  helpers and trigger functions (see the security notes in the migrations).
