import '../../styles/outfit.css';
import { byId, COLORWAYS, FABRICS, LOOKS, STATEMENTS } from '../data.js';

/**
 * Live outfit renderer: a recolourable hoodie (back view) with any statement
 * print, over a sirwal whose fabric and «زوووط» colourway can be swapped.
 * Built from the magazine's flat illustrations + cut-out statement artwork.
 *
 * config = { hoodie: '#hex', statement: 'S01'|'ORIGINAL', fabric: 'souq-woven', colorway: 'souq-pop' }
 */
export const DEFAULT_OUTFIT = { hoodie: '#151515', statement: 'S01', fabric: 'souq-woven', colorway: 'souq-pop' };

export const HOODIE_COLORS = [
  ...new Map(LOOKS.map((l) => [l.hoodie, { hex: l.hoodie, look: l }])).values(),
];

// Absolute URL: a relative url() inside a custom property would resolve against the
// stylesheet (assets/) in production, not the page.
const fabricTile = (f) => new URL(`img/studio/fab-${f.img.split('/').pop().replace('.webp', '')}.webp`, document.baseURI).href;

export function createOutfit(host, config = DEFAULT_OUTFIT, { label = '' } = {}) {
  host.classList.add('outfit');
  host.setAttribute('role', 'img');
  host.innerHTML = `
    <div class="o-sirwal">
      <div class="o-fabric"></div>
      <div class="o-fold"></div>
      <img class="o-trim" src="img/studio/sirwal-trim.webp" alt="" width="942" height="1600" draggable="false">
      <svg class="o-logo" aria-hidden="true"><use href="#zooot-logo"/></svg>
    </div>
    <div class="o-hoodie">
      <img class="o-shade" src="img/studio/hoodie-shade.webp" alt="" width="938" height="1181" draggable="false">
      <div class="o-tint"></div>
      <svg class="o-mini" aria-hidden="true"><use href="#zooot-logo"/></svg>
      <div class="o-print"><img alt="" draggable="false"></div>
    </div>`;
  const printImg = host.querySelector('.o-print img');
  let current = {};

  const update = (next = {}) => {
    const c = { ...DEFAULT_OUTFIT, ...current, ...next };
    const fabric = byId(FABRICS, c.fabric) || FABRICS[0];
    const cw = byId(COLORWAYS, c.colorway) || COLORWAYS[0];
    const st = byId(STATEMENTS, c.statement);
    host.style.setProperty('--hoodie', c.hoodie);
    host.style.setProperty('--fab', `url("${fabricTile(fabric)}")`);
    host.style.setProperty('--fab-size', `${fabric.size}%`);
    host.style.setProperty('--zl-fill', cw.fill);
    host.style.setProperty('--zl-edge', cw.edge);
    host.style.setProperty('--zl-shadow', cw.shadow);
    // Light hoodies need the dark-ink version of the mini logo to stay legible.
    host.classList.toggle('is-light-hoodie', luminance(c.hoodie) > 0.55);
    if (c.statement !== current.statement) {
      host.classList.toggle('no-print', !st);
      if (st) {
        printImg.classList.remove('is-in');
        const src = st.cut;
        const img = new Image();
        img.onload = () => {
          printImg.src = src;
          requestAnimationFrame(() => printImg.classList.add('is-in'));
        };
        img.src = src;
      }
    }
    current = c;
    if (label) host.setAttribute('aria-label', typeof label === 'function' ? label(c) : label);
    return c;
  };
  update(config);
  return { update, get config() { return current; } };
}

export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Config → compact query string and back (for shareable studio links). */
export const encodeOutfit = (c) => new URLSearchParams({ h: c.hoodie.replace('#', ''), s: c.statement, f: c.fabric, c: c.colorway }).toString();
export function decodeOutfit(search) {
  const p = new URLSearchParams(search);
  const out = {};
  if (/^[0-9a-f]{6}$/i.test(p.get('h') || '')) out.hoodie = `#${p.get('h')}`;
  if (byId(STATEMENTS, p.get('s'))) out.statement = p.get('s');
  if (byId(FABRICS, p.get('f'))) out.fabric = p.get('f');
  if (byId(COLORWAYS, p.get('c'))) out.colorway = p.get('c');
  return out;
}
