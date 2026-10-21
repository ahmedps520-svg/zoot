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

All in `src/js/data.js` → `CONFIG`:

- **`prices`**: the magazine marks prices as *pending sample approval*, so the current numbers (hoodie 289, sirwal 229, set 479 SAR) are **placeholders**.
- **`whatsapp`**: number in international format (e.g. `9665XXXXXXXX`). Checkout then shows "Confirm on WhatsApp" with the full order pre-written.
- **`orderEndpoint`** / **`newsletterEndpoint`**: optional URLs that accept a JSON `POST` (Formspree, Make, Google Sheets, your backend).
  > ⚠️ With neither `whatsapp` nor `orderEndpoint` set, orders are only shown on-screen and saved in the visitor's browser. Nothing reaches you.
- **`socials`**: Instagram and TikTok profile URLs.

Final fabric, sizing and print specs are labelled "proposed / confirmed with supplier samples", exactly as in the magazine.

## Code map

```
partials/            header, footer, cart & checkout, loader, logo + icon sprites (inlined at build)
src/js/data.js       catalogue: looks, statements, colourways, fabrics, palette, products, CONFIG
src/js/core/         i18n (data-en attributes), cart store, UI (header/menu/cart/checkout/toasts), motion
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
