# ZOOOT (زوووط) — store, owner dashboard, courier app

Vite multi-page site, deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`
(https://ahmedps520-svg.github.io/zoot/). Arabic-first (RTL) with English via `data-en` / `L(ar, en)`.

- Storefront: `*.html` + `src/js/` (checkout, newsletter, live catalogue in `core/store.js`, tracking in `pages/track.js`)
- Owner dashboard (PWA): `admin/` + `src/admin/`
- Courier app (PWA): `courier/` + `src/courier/`
- Backend switch: `src/js/backend/config.js` — `MODE` is `supabase` when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
  are set at build time, otherwise `demo` (everything in the visitor's localStorage).
- Supabase: `supabase/migrations/*.sql` (schema, RLS, RPCs), `supabase/seed.sql` (products), edge functions in
  `supabase/functions/` (`place-order`, `subscribe`, `admin-email`, all `verify_jwt = false`, they check auth themselves).

Commands: `npm run dev`, `npm run build`, `npm run seed:sql`, `PGHOST=… PGUSER=postgres npm run test:db`.

## The owner doesn't use a terminal or read docs

Explain things in chat in plain steps. Never ask for passwords, API keys or tokens in chat: the owner types those
into Supabase / GitHub / Resend settings pages themselves.

## Going live on Supabase (project ref `ffwjxvrporoittxrllru`)

The site is still in demo mode. When the Supabase connector is available in the session:

1. Apply `supabase/migrations/20261021000000_owner_dashboard.sql`, then `supabase/migrations/20261021010000_couriers.sql`,
   then run `supabase/seed.sql`. Check with a quick select that 21 products exist.
2. Deploy the edge functions `place-order`, `subscribe`, `admin-email` (each imports files from `supabase/functions/_shared/`),
   with JWT verification off.
3. Ask the owner to create their own logins in the Supabase dashboard (Authentication → Users → Add user, auto-confirm)
   for themselves, their partner and each courier. Then make owners admins
   (`insert into public.admins (user_id, email) select id, email from auth.users where email = '…'`) and couriers
   couriers (`select public.admin_add_courier('email', 'Name', 'phone')` as an admin, or insert into `public.couriers`).
4. Get the project URL and the publishable/anon key (both public by design; RLS protects the data) and make them the
   defaults in `src/js/backend/config.js` so the build switches to Supabase mode (repository variables still override).
   Only do this after steps 1–3, otherwise the live store breaks. Build, push `main`, and verify on the live site:
   owner login, place an order from the shop, see it live in the dashboard, track it, courier login + delivery.
5. Emails later (needs the zooot.sa domain verified in Resend): the owner adds the edge-function secrets
   `RESEND_API_KEY`, `MAIL_FROM` (e.g. `ZOOOT <orders@zooot.sa>`), `SITE_URL`, `OWNER_EMAIL` in the Supabase dashboard
   (Edge Functions → Secrets). Until then the functions skip sending and log it.
