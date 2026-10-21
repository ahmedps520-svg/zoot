import { boot } from '../main.js';
import '../../styles/studio.css';
import { gsap, reduceMotion } from '../core/motion.js';
import { $, $$, addToCart, esc, toast } from '../core/ui.js';
import { formatPrice, t, UI, ui } from '../core/i18n.js';
import { byId, COLORWAYS, CONFIG, FABRICS, LOOKS, STATEMENTS } from '../data.js';
import { createOutfit, decodeOutfit, DEFAULT_OUTFIT, encodeOutfit, HOODIE_COLORS } from '../components/outfit.js';

let state = { ...DEFAULT_OUTFIT, sizeH: null, sizeS: null, ...decodeOutfit(location.search) };
let outfit;

const lookOf = (hex) => HOODIE_COLORS.find((h) => h.hex === hex)?.look;

function renderControls() {
  $('[data-presets]').innerHTML = LOOKS.map(
    (l) => `<button type="button" class="preset" data-preset="${l.id}" title="${esc(t({ ar: l.ar, en: l.en }))}">
      <span class="preset-sw" style="--h:${l.hoodie};--p:${l.print[2] || l.print[0]};--s:${l.sirwal[2]}"></span>
      <span class="preset-name">${esc(t({ ar: l.ar, en: l.en }))}</span>
    </button>`,
  ).join('');

  $('[data-group="hoodie"]').innerHTML = HOODIE_COLORS.map(
    (h) => `<button type="button" class="swatch-btn" role="radio" data-pick="hoodie" data-value="${h.hex}" aria-label="${esc(t({ ar: h.look.ar, en: h.look.en }))}" title="${esc(t({ ar: h.look.ar, en: h.look.en }))}"><i class="sw" style="--c:${h.hex}"></i></button>`,
  ).join('');

  $('[data-group="statement"]').innerHTML = STATEMENTS.map(
    (s) => `<button type="button" class="st-tile" role="radio" data-pick="statement" data-value="${s.id}" aria-label="${esc(`S${s.n} — «${s.quote.ar}»`)}">
      <img src="${s.cut}" alt="" loading="lazy"><span class="num">S${s.n}</span>
    </button>`,
  ).join('');

  $('[data-group="fabric"]').innerHTML = FABRICS.map(
    (f) => `<button type="button" class="fab-tile" role="radio" data-pick="fabric" data-value="${f.id}" aria-label="${esc(t({ ar: f.ar, en: f.en }))}">
      <span class="fab-img" style="background-image:url(${f.img})"></span><span class="fab-name">${esc(t({ ar: f.ar, en: f.en }))}</span>
    </button>`,
  ).join('');

  $('[data-group="colorway"]').innerHTML = COLORWAYS.map(
    (c) => `<button type="button" class="cw-tile" role="radio" data-pick="colorway" data-value="${c.id}" aria-label="${esc(t({ ar: c.ar, en: c.en }))}" style="--zl-fill:${c.fill};--zl-edge:${c.edge};--zl-shadow:${c.shadow}">
      <svg aria-hidden="true"><use href="#zooot-logo"/></svg><span>${esc(t({ ar: c.ar, en: c.en }))}</span>
    </button>`,
  ).join('');

  ['sizeH', 'sizeS'].forEach((k) => {
    $(`[data-group="${k}"]`).innerHTML = CONFIG.sizes.map((s) => `<button type="button" class="opt opt--size" role="radio" data-pick="${k}" data-value="${s}">${s}</button>`).join('');
  });
}

function sync() {
  $$('[data-pick]').forEach((b) => b.setAttribute('aria-checked', String(state[b.dataset.pick] === b.dataset.value)));
  const look = lookOf(state.hoodie);
  const st = byId(STATEMENTS, state.statement);
  const fab = byId(FABRICS, state.fabric);
  const cw = byId(COLORWAYS, state.colorway);
  $('[data-label="hoodie"]').textContent = look ? t({ ar: look.ar, en: look.en }) : state.hoodie;
  $('[data-label="statement"]').textContent = `«${st.quote.ar}»`;
  $('[data-label="fabric"]').textContent = t({ ar: fab.ar, en: fab.en });
  $('[data-label="colorway"]').textContent = t({ ar: cw.ar, en: cw.en });
  $$('[data-preset]').forEach((b) => {
    const l = byId(LOOKS, b.dataset.preset);
    b.classList.toggle('is-active', l.hoodie === state.hoodie && l.fabric === state.fabric && l.colorway === state.colorway);
  });
  $('[data-summary]').innerHTML = [
    [ui('hoodieColor'), `<i class="sw" style="--c:${state.hoodie}"></i> ${esc(look ? t({ ar: look.ar, en: look.en }) : '')}`],
    [ui('statement'), `S${st.n} · <span lang="ar">«${esc(st.quote.ar)}»</span>`],
    [ui('fabric'), esc(t({ ar: fab.ar, en: fab.en }))],
    [ui('backLogo'), `<i class="sw" style="--c:${cw.fill}"></i> ${esc(t({ ar: cw.ar, en: cw.en }))}`],
    [ui('hoodieSize'), state.sizeH || '—'],
    [ui('sirwalSize'), state.sizeS || '—'],
  ]
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`)
    .join('');
  const price = formatPrice(CONFIG.prices.set);
  $('[data-price]').textContent = price;
  $('[data-price-bar]').textContent = price;
  outfit.update(state);
  const url = new URL(location.href);
  url.search = encodeOutfit(state);
  history.replaceState(null, '', url);
}

function pick(key, value, { pop = true } = {}) {
  state[key] = value;
  sync();
  if (!pop || reduceMotion) return;
  const target = { hoodie: '.o-hoodie', statement: '.o-print', fabric: '.o-sirwal', colorway: '.o-logo' }[key];
  if (target) gsap.fromTo($(target, $('[data-outfit]')), { scale: 0.94 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)', transformOrigin: '50% 50%' });
}

function randomize() {
  const r = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const roll = () => ({ hoodie: r(HOODIE_COLORS).hex, statement: r(STATEMENTS).id, fabric: r(FABRICS).id, colorway: r(COLORWAYS).id });
  if (reduceMotion) {
    Object.assign(state, roll());
    return sync();
  }
  let n = 0;
  const tick = () => {
    Object.assign(state, roll());
    sync();
    if (++n < 7) setTimeout(tick, 70 + n * 22);
    else gsap.fromTo($('.stage-outfit'), { rotate: -4, scale: 0.95 }, { rotate: 0, scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.4)' });
  };
  tick();
}

async function share() {
  const url = location.href;
  const title = t({ ar: 'طقمي من استوديو زوووط', en: 'My ZOOOT studio build' });
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) return await navigator.share({ title, url });
    await navigator.clipboard.writeText(url);
    toast(ui('copied'));
  } catch {
    /* user cancelled */
  }
}

function add() {
  if (CONFIG.customSoldOut) return toast(ui('soldOutLong'));
  if (!state.sizeH || !state.sizeS) {
    toast(ui('pickSizes'));
    const step = $('[data-group="sizeH"]').closest('.step');
    step.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    if (!reduceMotion) gsap.fromTo(step, { x: -12 }, { x: 0, duration: 0.7, ease: 'elastic.out(1, 0.3)' });
    return;
  }
  const look = lookOf(state.hoodie);
  const st = byId(STATEMENTS, state.statement);
  const fab = byId(FABRICS, state.fabric);
  const cw = byId(COLORWAYS, state.colorway);
  addToCart({
    pid: 'custom-set',
    name: UI.customSet,
    img: st.cut,
    imgBg: state.hoodie,
    price: CONFIG.prices.set,
    meta: { h: state.hoodie, s: state.statement, f: state.fabric, c: state.colorway },
    options: [
      { label: UI.hoodieColor, value: { ar: look.ar, en: look.en }, swatch: state.hoodie },
      { label: UI.statement, value: `S${st.n}` },
      { label: UI.fabric, value: { ar: fab.ar, en: fab.en } },
      { label: UI.backLogo, value: { ar: cw.ar, en: cw.en }, swatch: cw.fill },
      { label: UI.hoodieSize, value: state.sizeH },
      { label: UI.sirwalSize, value: state.sizeS },
    ],
  });
}

boot({
  setup() {
    outfit = createOutfit($('[data-outfit]'), state, { label: () => t({ ar: 'معاينة طقمك', en: 'Your set preview' }) });
    renderControls();
    sync();
    document.addEventListener('click', (e) => {
      const p = e.target.closest('[data-pick]');
      if (p) return pick(p.dataset.pick, p.dataset.value, { pop: !p.dataset.pick.startsWith('size') });
      const pre = e.target.closest('[data-preset]');
      if (pre) {
        const l = byId(LOOKS, pre.dataset.preset);
        Object.assign(state, { hoodie: l.hoodie, fabric: l.fabric, colorway: l.colorway });
        sync();
        if (!reduceMotion) gsap.fromTo($('.stage-outfit'), { y: 20, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
        return;
      }
      const v = e.target.closest('[data-view-btn]');
      if (v) {
        $('[data-stage]').dataset.view = v.dataset.viewBtn;
        $$('[data-view-btn]').forEach((b) => b.setAttribute('aria-selected', String(b === v)));
        return;
      }
      if (e.target.closest('[data-random]')) return randomize();
      if (e.target.closest('[data-share]')) return share();
      if (e.target.closest('[data-add]')) add();
    });
    window.addEventListener('langchange', () => {
      renderControls();
      sync();
    });
  },
  intro() {
    if (reduceMotion) return;
    gsap.from('.stage-outfit', { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out' });
    gsap.from('.step', { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07, delay: 0.1 });
  },
});
