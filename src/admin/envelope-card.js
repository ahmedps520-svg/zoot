/**
 * The Ramadan envelope card, print-ready: 4×6 in (101.6×152.4 mm) + 3 mm bleed, drawn as one SVG
 * in units of 1/300 in. Retro Egyptian-poster look: grainy sky, Ruqaa lettering in a yellow oval,
 * blue starburst, a sticker-cut QR (the hero), a parody roundel with the ZOOOT logo, yellow ticker.
 * The QR opens the reveal page with the coupon's secret key, so the card is only ever generated
 * from the dashboard (the key never lives in the repo).
 */
import { encode } from 'uqr';

const W = 1271; // 107.6 mm @ 300 dpi (trim + 2 × 3 mm bleed)
const H = 1871; // 158.4 mm
const C = { ink: '#0D0D0D', yellow: '#FFD21F', red: '#F2542D', blue: '#2350E0', teal: '#0B3B3B', sky: '#5DB2E6', white: '#FFFFFF', orange: '#F26B21', magenta: '#E5197F' };

/** Small seeded PRNG so every print of the card looks identical. */
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** QR as one path (dark modules), with rounded finder eyes and a clear square in the middle for the logo. */
function qrPaths(url, size) {
  const qr = encode(url, { ecc: 'H', border: 0 });
  const n = qr.size;
  const m = size / n;
  const hole = Math.ceil(n * 0.26) | 1; // logo area: ~7% of the code — ECC H restores up to 30%
  const h0 = (n - hole) / 2;
  const inEye = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const inHole = (x, y) => x >= h0 && x < h0 + hole && y >= h0 && y < h0 + hole;
  let d = '';
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (qr.data[y][x] && !inEye(x, y) && !inHole(x, y)) d += `M${(x * m).toFixed(2)} ${(y * m).toFixed(2)}h${m.toFixed(2)}v${m.toFixed(2)}h-${m.toFixed(2)}z`;
  const eye = (ex, ey) => {
    const X = ex * m;
    const Y = ey * m;
    return `<rect x="${X + m / 2}" y="${Y + m / 2}" width="${6 * m}" height="${6 * m}" rx="${1.6 * m}" fill="none" stroke="${C.ink}" stroke-width="${m}"/>
      <rect x="${X + 2 * m}" y="${Y + 2 * m}" width="${3 * m}" height="${3 * m}" rx="${0.8 * m}" fill="${C.ink}"/>`;
  };
  return { n, m, hole: hole * m, holeAt: h0 * m, svg: `<path d="${d}" fill="${C.ink}"/>${eye(0, 0)}${eye(n - 7, 0)}${eye(0, n - 7)}` };
}

/** Jagged starburst polygon. */
function burst(cx, cy, rOut, rIn, spikes, rand) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    const r = i % 2 ? rIn * (0.92 + rand() * 0.16) : rOut * (0.8 + rand() * 0.28);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/**
 * @param {{ url: string, base: string, line?: string, word?: string, ticker?: string, handle?: string[] }} o
 *   url  — what the QR opens; base — site root for images (ends with /).
 */
export function envelopeCardSVG({ url, base, line = 'امسحه أول يوم', word = 'رمضان', ticker = 'SCAN ON RAMADAN 1ST', handle = ['ZOOOT.SHOP', '— RAMADAN 1448'], images = {}, fontCss = '' }) {
  const rand = rng(1448);
  const img = (p) => images[p] || `${base}${p}`;
  // poster (inside the black frame)
  const P = { x: 95, y: 95, w: W - 190, h: H - 190 };
  const cx = W / 2;
  const qrSize = 520;
  const qr = qrPaths(url, qrSize);
  const pad = 34;
  const card = qrSize + pad * 2;
  const qy = 1110; // QR centre

  const specks = Array.from({ length: 260 }, () => {
    const x = P.x + rand() * P.w;
    const y = P.y + rand() * P.h;
    const r = 0.6 + rand() * 2.4;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${rand() > 0.55 ? '#fff' : '#0b1d3a'}" opacity="${(0.25 + rand() * 0.5).toFixed(2)}"/>`;
  }).join('');
  const scratches = Array.from({ length: 26 }, () => {
    const x = P.x + rand() * P.w;
    const y = P.y + rand() * P.h;
    const l = 20 + rand() * 90;
    const a = rand() * Math.PI;
    return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + l * Math.cos(a)).toFixed(1)}" y2="${(y + l * Math.sin(a)).toFixed(1)}" stroke="#fff" stroke-width="${(0.8 + rand() * 1.4).toFixed(1)}" opacity="${(0.25 + rand() * 0.4).toFixed(2)}"/>`;
  }).join('');
  const tick = Array.from({ length: 8 }, () => `${ticker} . ZOOOT .`).join(' ');

  // Ruqaa word with black shadow, white keyline and black outline — the hand-painted sign look
  const lettering = (txt, x, y, size, fill) => `
    <g font-family="'Aref Ruqaa', serif" font-weight="700" font-size="${size}" text-anchor="middle" direction="rtl">
      <text x="${x + size * 0.045}" y="${y + size * 0.055}" fill="${C.ink}" stroke="${C.ink}" stroke-width="${size * 0.09}" stroke-linejoin="round">${esc(txt)}</text>
      <text x="${x}" y="${y}" fill="${C.white}" stroke="${C.white}" stroke-width="${size * 0.09}" stroke-linejoin="round">${esc(txt)}</text>
      <text x="${x}" y="${y}" fill="${fill}" stroke="${C.ink}" stroke-width="${size * 0.032}" stroke-linejoin="round" paint-order="stroke">${esc(txt)}</text>
    </g>`;

  // Ramadan lantern (fanoos), sticker-cut
  const lantern = (x, y, s, rot) => `
    <g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
      <line x1="0" y1="-210" x2="0" y2="-120" stroke="${C.ink}" stroke-width="5"/>
      <g stroke="${C.white}" stroke-width="26" stroke-linejoin="round" fill="${C.white}">
        <path d="M-34 -120h68l20 40h-108z"/><path d="M-54 -80h108l26 70-26 80h-108l-26-80z"/><path d="M-40 70h80l-16 40h-48z"/>
      </g>
      <path d="M-34 -120h68l20 40h-108z" fill="${C.ink}"/>
      <circle cx="0" cy="-130" r="12" fill="none" stroke="${C.ink}" stroke-width="6"/>
      <path d="M-54 -80h108l26 70-26 80h-108l-26-80z" fill="${C.yellow}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M-18 -80v150M18 -80v150M-80 -10h160" stroke="${C.ink}" stroke-width="6"/>
      <path d="M-54 -80l-26 70 26 80" fill="${C.magenta}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M54 -80l26 70-26 80" fill="${C.blue}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M-40 70h80l-16 40h-48z" fill="${C.ink}"/>
      <circle cx="0" cy="-10" r="20" fill="#fff6c2"/>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    ${fontCss ? `<style>${fontCss}</style>` : ''}
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3E9BDA"/><stop offset=".45" stop-color="${C.sky}"/><stop offset=".72" stop-color="#9FD3F0"/><stop offset="1" stop-color="#C9E7F6"/>
    </linearGradient>
    <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0D9A8"/><stop offset="1" stop-color="#D9AE6B"/></linearGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="table" tableValues="0 .5"/></feComponentTransfer>
    </filter>
    <filter id="blotch" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".011" numOctaves="4" seed="21"/>
      <feColorMatrix type="matrix" values="0 0 0 0 .07  0 0 0 0 .2  0 0 0 0 .42  0 0 0 -9 5.2"/>
    </filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="10" dy="14" stdDeviation="8" flood-color="#000" flood-opacity=".35"/></filter>
    <clipPath id="poster"><rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="${C.ink}"/>
  <g clip-path="url(#poster)">
    <rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" fill="url(#sky)"/>
    <rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h * 0.75}" filter="url(#blotch)" opacity=".55"/>
    <path d="M${P.x} 1380 C 260 1300 420 1350 560 1395 S 900 1330 1176 1380 V 1776 H ${P.x} Z" fill="url(#sand)"/>
    <path d="M${P.x} 1480 C 300 1420 520 1500 760 1470 S 1050 1430 1176 1460 V 1776 H ${P.x} Z" fill="#E2BC7E" opacity=".85"/>

    <polygon points="${burst(cx, qy, 560, 360, 18, rand)}" fill="${C.blue}"/>

    <text x="${P.x + 38}" y="${P.y + 58}" direction="ltr" font-family="Archivo, sans-serif" font-stretch="75%" font-weight="700" font-size="30" fill="#fff" letter-spacing="1">${esc(handle[0])}</text>
    <text x="${P.x + 70}" y="${P.y + 94}" direction="ltr" font-family="Archivo, sans-serif" font-stretch="75%" font-weight="700" font-size="26" fill="#fff" letter-spacing="1">${esc(handle[1] || '')}</text>

    <text x="${cx}" y="300" font-family="'Aref Ruqaa', serif" font-weight="700" font-size="128" text-anchor="middle" direction="rtl" fill="#141414" transform="rotate(-2 ${cx} 300)">${esc(line)}</text>

    <g transform="rotate(-5 ${cx} 520)">
      <ellipse cx="${cx + 14}" cy="${520 + 16}" rx="440" ry="172" fill="${C.ink}"/>
      <ellipse cx="${cx}" cy="520" rx="440" ry="172" fill="${C.yellow}" stroke="${C.teal}" stroke-width="12"/>
      ${lettering(word, cx, 600, 300, C.red)}
    </g>

    <g transform="translate(1050 330) rotate(-18)">
      <path d="M0 -92a92 92 0 1 0 64 158 76 76 0 1 1 0 -158 92 92 0 0 0 -64 0z" fill="${C.white}" stroke="${C.white}" stroke-width="30" stroke-linejoin="round"/>
      <path d="M0 -92a92 92 0 1 0 64 158 76 76 0 1 1 0 -158 92 92 0 0 0 -64 0z" fill="${C.yellow}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>
    </g>

    ${lantern(205, 930, 1.05, 6)}
    ${lantern(1075, 1000, 0.9, -8)}

    <g opacity=".9">${specks}${scratches}</g>
    <rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" filter="url(#grain)" style="mix-blend-mode:multiply"/>

    <g transform="rotate(-3 ${cx} ${qy})" filter="url(#shadow)">
      <rect x="${cx - card / 2 - 16}" y="${qy - card / 2 - 16}" width="${card + 32}" height="${card + 32}" rx="56" fill="${C.white}"/>
      <rect x="${cx - card / 2}" y="${qy - card / 2}" width="${card}" height="${card}" rx="40" fill="${C.white}" stroke="${C.ink}" stroke-width="6"/>
      <g transform="translate(${cx - qrSize / 2} ${qy - qrSize / 2})">
        ${qr.svg}
        <rect x="${qr.holeAt + 6}" y="${qr.holeAt + 6}" width="${qr.hole - 12}" height="${qr.hole - 12}" rx="22" fill="${C.ink}"/>
        <image href="${esc(img('img/brand/logo-pop.webp'))}" x="${qr.holeAt + 14}" y="${qr.holeAt + qr.hole / 2 - (qr.hole - 28) * 0.24}" width="${qr.hole - 28}" height="${(qr.hole - 28) * 0.48}" preserveAspectRatio="xMidYMid meet"/>
      </g>
    </g>

    <g transform="translate(265 1520) rotate(-10)">
      <circle r="168" fill="${C.white}"/>
      <circle r="156" fill="${C.orange}" stroke="${C.ink}" stroke-width="6"/>
      <circle r="124" fill="${C.yellow}"/>
      <circle r="92" fill="none" stroke="${C.orange}" stroke-width="22"/>
      <circle r="48" fill="none" stroke="${C.orange}" stroke-width="18"/>
      <image href="${esc(img('img/brand/logo-sticker.webp'))}" x="-170" y="-95" width="340" height="190" preserveAspectRatio="xMidYMid meet"/>
    </g>

    <rect x="${P.x}" y="${P.y + P.h - 74}" width="${P.w}" height="74" fill="${C.yellow}"/>
    <text x="${P.x + 10}" y="${P.y + P.h - 24}" direction="ltr" font-family="Archivo, sans-serif" font-stretch="70%" font-weight="600" font-size="40" fill="${C.ink}" letter-spacing=".5">${esc(tick)}</text>
  </g>
</svg>`;
}

/** A printable page: one card per sheet at its real size (choose "Actual size" / 100% when printing). */
export function envelopeCardPage(opts) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>ZOOOT — بطاقة ظرف رمضان</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@700&family=Archivo:wdth,wght@62..125,600..700&display=block" rel="stylesheet">
<style>
  @page { size: 107.6mm 158.4mm; margin: 0; }
  html, body { margin: 0; background: #2a2a2a; }
  .sheet { width: 107.6mm; height: 158.4mm; margin: 0 auto; }
  .sheet svg { display: block; width: 100%; height: 100%; }
  @media screen { body { padding: 24px 0; } .sheet { box-shadow: 0 10px 40px #0008; } }
</style>
</head>
<body><div class="sheet">${envelopeCardSVG(opts)}</div></body>
</html>`;
}

const W_PX = W;
const H_PX = H;
const dataURL = async (u) => {
  const blob = await (await fetch(u)).blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
};

/**
 * Browser only: the card as a 300 dpi PNG (with bleed) — fonts and images are inlined so the SVG
 * renders on its own. fonts = { ruqaa, archivo } URLs of the woff2 files.
 */
export async function envelopeCardPNG({ url, base, fonts }) {
  const P = ['img/brand/logo-pop.webp', 'img/brand/logo-sticker.webp'];
  const [ruqaa, archivo, ...pics] = await Promise.all([fonts.ruqaa, fonts.archivo, ...P.map((p) => base + p)].map(dataURL));
  const fontCss = `@font-face{font-family:'Aref Ruqaa';font-weight:700;src:url(${ruqaa}) format('woff2')}@font-face{font-family:'Archivo';font-weight:100 900;font-stretch:62% 125%;src:url(${archivo}) format('woff2')}`;
  const svg = envelopeCardSVG({ url, base, fontCss, images: Object.fromEntries(P.map((p, i) => [p, pics[i]])) });
  const src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const im = new Image();
    im.src = src;
    await im.decode();
    await new Promise((r) => setTimeout(r, 150)); // let the embedded fonts settle
    const c = document.createElement('canvas');
    c.width = W_PX;
    c.height = H_PX;
    c.getContext('2d').drawImage(im, 0, 0, W_PX, H_PX);
    return await new Promise((r) => c.toBlob(r, 'image/png'));
  } finally {
    URL.revokeObjectURL(src);
  }
}
