# زوووط ZOOOT — DROP 001

**Wear the mood. Own the street.**

The website for ZOOOT (زوووط): oversized hoodies, souq-fabric sirwals and one loud word on the back.
Built from *ZOOOT Issue 01 — The Loud Launch* (pp. 45–64). Arabic first (RTL), with a full English toggle.

Brand design by **Shatha & Sarah Alghamdi** · Website developed by **Mamar**.

---

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Campaign hero, scroll-lit manifesto, the iconic back, **statement explorer** (S01–S06, autoplay), draggable **mood meter** that picks your statement, pinned horizontal **collection** of the 8 looks, live studio teaser, draggable street polaroids, the flip-card "surprise inside the box". |
| `shop.html` | All 20 pieces (8 look sets, 6 statement hoodies, 6 sirwal colourways), animated filter & sort (GSAP Flip), hover quick-add by size. |
| `product.html?id=…` | Follows the magazine's e-store concept (p.62): starts from the **back**, then look → statement → size. Hover zoom on the print, live recoloured preview for any hoodie colour, sirwal anatomy hotspots, "how to wear it", fit guide, sticky mobile buy bar. |
| `studio.html` | **ZOOOT Studio** configurator: hoodie colour × statement × souq fabric × «زوووط» colourway, rendered live (2,300+ combinations), zoom views, randomiser, shareable URLs, add the custom set to the bag. |
| `story.html` | The brand system as an editorial: signature rules, logo variants, colourways, click-to-copy colour system, souq fabrics, anatomy, hoodie & print spec, print methods, founders' signature collection. |
| `track.html` | **Order tracking** for customers: order number + the mobile used at checkout → live status timeline, courier and tracking number, items. Also handles newsletter unsubscribe links. |
| `admin/` | **ZOOOT HQ**, the owners' dashboard (installable app). See below. |
| `404.html` | "هالصفحة مو مزبوووطة". |

Site-wide: intro loader, page-wipe transitions, smooth scrolling (Lenis), word-by-word reveals (Arabic-safe: split on words, never letters), custom cursor, magnetic buttons, velocity-reactive marquees, cart drawer with persistent bag, checkout with validation and order confirmation, newsletter form, AR/EN switch, reduced-motion support, keyboard and screen-reader labels.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/
npm run preview
```

Everything builds to plain static files with relative paths, so `dist/` can be hosted anywhere: GitHub Pages, Netlify, Vercel, S3 or any web server.

### Deploy on GitHub Pages
`.github/workflows/deploy.yml` builds the site on every push to `main` and publishes `dist/` to the `gh-pages` branch, which GitHub Pages serves.
If Pages isn't on yet: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `gh-pages` / `(root)`**.

## Before launch: fill these in

- **Prices**: the magazine marks prices as *pending sample approval*, so the current numbers (hoodie 289, sirwal 229, set 479 SAR) are **placeholders**. Change them per product in the dashboard (**Products & stock**), or the defaults in `src/js/data.js` → `CONFIG.prices`.
- **WhatsApp, bank transfer details, shipping fee, payment methods, Instagram/TikTok**: dashboard → **Settings**.
- **Connect Supabase** (below). Until then the site runs in *demo mode*: orders are saved in the visitor's own browser and never reach you.

Final fabric, sizing and print specs are labelled "proposed / confirmed with supplier samples", exactly as in the magazine.

## Owner dashboard — ZOOOT HQ (`/admin/`)

An installable app (PWA) for the owners, in Arabic and English, on desktop and phone.

- **Overview**: sales, money collected, orders, average order, units sold and what's still owed, each compared with the previous period. Also a sales chart (with a table view), best sellers, size demand, cities, order sources, open orders, a live feed and stock alerts.
- **Orders**: search, filters, a list or a drag-and-drop **board**, bulk status changes, CSV export.
- **Order page**:
  - Status steps (asks for courier and tracking number when you mark it shipped).
  - **Edit any price**, quantity, discount or shipping; add or remove items. Every change is logged in the timeline.
  - Record payments, partial payments and refunds.
  - Customer details with call and WhatsApp buttons, internal notes, status or custom emails to the customer, printable invoice, tracking link.
- **New order**: for Instagram, WhatsApp or pop-up sales. Tap products, pick sizes, override prices, mark as paid. Returning customers are recognised by phone number.
- **Payments**: ledger, totals by method, balances still owed, with a one-tap WhatsApp reminder that includes your bank details.
- **Products & stock**: edit prices inline, stock per size (auto-deducted by orders, restocked on cancel), a **sold-out** switch, a show/hide switch, add new products with photos.
  - Changes show on the store instantly: sold-out badges, disabled sizes, new prices.
- **Customers**: lifetime spend, repeat rate, top customers, CSV export.
- **Subscribers**: growth chart, add or remove subscribers, CSV export.
- **Emails**:
  - Previews of every email, in Arabic and English, desktop and mobile: welcome, order received, confirmed, preparing, shipped, delivered, cancelled, custom message, and your new-order alert.
  - Campaign composer with a test send, plus the send log.
- **Live**: new orders pop up with a sound, a toast, the app badge and (optionally) phone notifications. The customer's tracking page updates on its own too.

### Demo mode vs live mode

| | Demo (default) | Live (Supabase connected) |
| --- | --- | --- |
| Data | This browser's storage only; tabs sync live | Shared Postgres database, realtime on every device |
| Owner login | Demo account, stored only as a hash; keeps casual visitors out but **is not real security** | Supabase Auth, with every table locked down by Row Level Security |
| Emails | Rendered into the **Emails → Log** preview, nothing is sent | Sent by **Resend** |

The demo owner login is `admindemo@zooot.sa` (the password you chose). It stops working once Supabase is connected; owners then sign in with their Supabase accounts.

### Going live: Supabase + Resend (≈20 minutes, free tiers)

1. **Create a project** at [supabase.com](https://supabase.com).
2. **Database**: open the SQL editor and run, in order:
   - `supabase/migrations/20261021000000_owner_dashboard.sql`
   - `supabase/seed.sql`

   Or use `supabase link` and then `supabase db push`.
3. **Owner account**:
   - *Option 1*: in **Authentication → Users → Add user** (tick *auto-confirm*), then run:
     ```sql
     insert into public.admins (user_id, email) select id, email from auth.users where email = 'owner@example.com';
     ```
   - *Option 2*: from your own machine:
     ```bash
     SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run create-admin -- owner@example.com
     ```
   - Repeat for your partner. The service-role key is a server secret: never commit it or put it in the website.
4. **Connect the website**: in GitHub go to **Settings → Secrets and variables → Actions → Variables** and add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` (the public *anon* / *publishable* key from **Project Settings → API**)

   Then re-run the deploy workflow. The site and dashboard switch to live mode.
5. **Emails with Resend**:
   1. Create an account at [resend.com](https://resend.com) and **verify your domain**. Until it's verified, Resend only delivers to your own address.
   2. Then, with the [Supabase CLI](https://supabase.com/docs/guides/cli):
      ```bash
      supabase secrets set RESEND_API_KEY=re_… MAIL_FROM="ZOOOT <orders@your-domain>" SITE_URL=https://ahmedps520-svg.github.io/zoot OWNER_EMAIL=you@example.com
      supabase functions deploy place-order subscribe admin-email
      ```
   3. Check **Dashboard → Settings → Connections**: it should show Resend as connected.
6. **Phone notifications (optional)**:
   1. Run `npx web-push generate-vapid-keys`.
   2. Set the Supabase secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT=mailto:you@example.com`.
   3. Add the repository variable `VAPID_PUBLIC_KEY`.
   4. Tap **Turn on** under *This device* in the dashboard settings.

Database rules, prices, stock and totals are enforced on the server (`create_order`, triggers, RLS), so a shopper can't change a price or see anyone else's order. Run the schema tests against any local Postgres with `PGHOST=… PGUSER=postgres npm run test:db`. After editing the catalogue in `data.js`, regenerate the seed with `npm run seed:sql`.

## Code map

```
partials/            header, footer, cart & checkout, loader, logo + icon sprites (inlined at build)
src/js/data.js       catalogue: looks, statements, colourways, fabrics, palette, products, CONFIG
src/js/core/         i18n (data-en attributes), cart store, live catalogue sync (store.js), UI (header/menu/cart/checkout/toasts), motion
src/js/backend/      order/payment model, demo backend (localStorage), Supabase adapters (dashboard + light public client)
src/admin/           ZOOOT HQ dashboard: shell/router (main.js), charts, UI kit, one module per screen in views/
supabase/            schema + RLS + RPCs (migrations/), catalogue seed, SQL tests, edge functions + bilingual email templates
src/js/components/   outfit renderer, mood gauge, anatomy hotspots, product card
src/js/pages/        one entry per page
src/styles/          base tokens, components, one stylesheet per page
public/img/          optimised WebP assets extracted from the magazine
```

**Translations** sit next to the Arabic in the HTML: `data-en="…"` for text and `data-en-placeholder`, `data-en-aria-label` or `data-en-alt` for attributes. JS-only strings live in `UI` in `src/js/core/i18n.js`.

**The logo** is the real vector «زوووط» from the magazine, used as an SVG symbol with three CSS variables (`--zl-fill`, `--zl-edge`, `--zl-shadow`). That lets the studio and the colourway pickers recolour it live.

## Imagery

All photos and artwork come from the magazine PDF. Low-resolution shots were upscaled locally with Real-ESRGAN. The statement artworks were cut out from their black backgrounds so they can sit on any hoodie colour. The studio renders the magazine's flat illustrations with live recolouring and fabric masks; it is labelled on-site as a digital preview.

## Banana Claude (AI image skill)

[`AgriciDaniel/banana-claude`](https://github.com/AgriciDaniel/banana-claude) is registered for this project in `.claude/settings.json`. Claude Code offers to install the plugin when you open the repo.
It generates and edits images with Google's Gemini (Nano Banana) models, for example new campaign shots of each statement hoodie in every colourway. It needs a **`GEMINI_API_KEY` from a billing-enabled Google AI project**; Gemini image generation has no free tier. Banana shows the exact prompt and cost estimate and asks before every paid call.

---

© ZOOOT — زوووط · DROP 001 · Designed by Shatha & Sarah Alghamdi · Developed by Mamar
