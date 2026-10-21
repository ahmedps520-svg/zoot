import { boot } from '../main.js';
import '../../styles/product.css';
import { gsap, reduceMotion, ScrollTrigger, finePointer, lockScroll } from '../core/motion.js';
import { $, $$, addToCart, esc, toast } from '../core/ui.js';
import { formatPrice, getLang, t, UI, ui } from '../core/i18n.js';
import { byId, COLORWAYS, CONFIG, FABRICS, LOOKS, PRODUCTS, productById, STATEMENTS } from '../data.js';
import { createOutfit, encodeOutfit, HOODIE_COLORS } from '../components/outfit.js';
import { productCard, bindQuickAdd, productCode, TYPE_LABEL } from '../components/productCard.js';
import { renderAnatomy } from '../components/hotspots.js';
import { soldOut } from '../core/store.js';

const params = new URLSearchParams(location.search);
let product = productById(params.get('id')) || productById('hoodie-01');
let state = {};
let outfit = null;
let galleryIndex = 0;

const isEN = () => getLang() === 'en';
const L = (ar, en) => t({ ar, en });

/* ------------------------------------------------------------ state setup */
function initState() {
  const s = {};
  if (product.type === 'hoodie') {
    const st = byId(STATEMENTS, product.ref);
    Object.assign(s, { statement: st.id, hoodie: state.hoodie || '#151515', fabric: 'souq-woven', colorway: 'souq-pop', size: state.size || null });
  } else if (product.type === 'set') {
    const look = byId(LOOKS, product.ref);
    Object.assign(s, { statement: state.statement || 'S01', hoodie: look.hoodie, fabric: look.fabric, colorway: look.colorway, sizeH: state.sizeH || null, sizeS: state.sizeS || null });
  } else {
    const cw = byId(COLORWAYS, product.ref);
    Object.assign(s, { statement: 'S01', hoodie: '#151515', fabric: state.fabric || 'souq-woven', colorway: cw.id, size: state.size || null });
  }
  state = s;
}

/* ---------------------------------------------------------------- gallery */
function galleryItems() {
  const p = product;
  if (p.type === 'hoodie') {
    const st = byId(STATEMENTS, p.ref);
    const black = state.hoodie === '#151515';
    const items = [
      { kind: 'img', src: st.back, alt: L(`ظهر هودي «${st.quote.ar}»`, `Back of the “${st.quote.en}” hoodie`), label: L('الظهر', 'Back') },
      { kind: 'img', src: st.full, alt: L('الإطلالة كاملة', 'Full look'), label: L('الإطلالة', 'Full look') },
      { kind: 'art', src: st.art, alt: L('الطباعة من قريب', 'Print close-up'), label: L('الطباعة', 'Print') },
      { kind: 'outfit', label: L('معاينة حيّة', 'Live preview') },
    ];
    // Coloured hoodies only exist as a live render — lead with it.
    if (!black) items.unshift(items.pop());
    return items;
  }
  if (p.type === 'set') {
    const look = byId(LOOKS, p.ref);
    return [
      ...look.imgs.map((src, i) => ({ kind: 'img', src, alt: L(`إطلالة ${look.ar}`, `${look.en} look`), label: i ? L('لقطة ثانية', 'Alt shot') : L('الإطلالة', 'The look') })),
      { kind: 'outfit', label: L('معاينة حيّة', 'Live preview') },
      { kind: 'img', src: 'img/details/embroidery-1.webp', alt: L('تطريز «زوووط» من قريب', '«ZOOOT» embroidery close-up'), label: L('من قريب', 'Close-up') },
    ];
  }
  const cw = byId(COLORWAYS, p.ref);
  return [
    { kind: 'img', src: cw.img, alt: L(`ظهر شروال ${cw.ar}`, `${cw.en} sirwal, back`), label: L('الظهر', 'Back'), contain: true },
    { kind: 'outfit', label: L('معاينة حيّة', 'Live preview'), zoom: 'sirwal' },
    { kind: 'img', src: 'img/details/embroidery-2.webp', alt: L('التطريز من قريب', 'Embroidery close-up'), label: L('من قريب', 'Close-up') },
    { kind: 'img', src: 'img/details/fabric-onbody.webp', alt: L('كليم السوق على الجسم', 'Souq kilim on body'), label: L('القماش', 'Fabric') },
  ];
}

function renderGallery() {
  const host = $('[data-gallery]');
  const items = galleryItems();
  galleryIndex = Math.min(galleryIndex, items.length - 1);
  host.innerHTML = `
    <div class="g-stage" data-g-stage>
      ${items
        .map(
          (it, i) => `
        <div class="g-slide g-slide--${it.kind}${it.contain ? ' g-slide--contain' : ''}${i === galleryIndex ? ' is-active' : ''}" data-g-slide="${i}" ${it.kind !== 'outfit' && finePointer ? 'data-zoom data-cursor="كبّر" data-cursor-en="ZOOM"' : ''}>
          ${it.kind === 'outfit' ? `<div class="g-outfit${it.zoom ? ` g-outfit--${it.zoom}` : ''}" data-g-outfit></div><span class="g-note">${esc(L('معاينة رقمية — الألوان تقريبية', 'Digital preview — colours are approximate'))}</span>` : `<img src="${it.src}" alt="${esc(it.alt)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" draggable="false">`}
        </div>`,
        )
        .join('')}
      <span class="g-code num">${productCode(product)}</span>
      <div class="g-arrows">
        <button class="icon-btn" type="button" data-g-prev aria-label="${esc(L('السابق', 'Previous'))}"><svg><use href="#i-arrow"/></svg></button>
        <button class="icon-btn" type="button" data-g-next aria-label="${esc(L('التالي', 'Next'))}"><svg><use href="#i-arrow"/></svg></button>
      </div>
    </div>
    <div class="g-thumbs" role="tablist" aria-label="${esc(L('صور القطعة', 'Product images'))}">
      ${items
        .map(
          (it, i) => `<button type="button" class="g-thumb${i === galleryIndex ? ' is-active' : ''}" role="tab" aria-selected="${i === galleryIndex}" data-g-thumb="${i}" aria-label="${esc(it.label)}">
            ${it.kind === 'outfit' ? `<span class="g-thumb-live"><svg><use href="#zooot-logo"/></svg><small>${esc(it.label)}</small></span>` : `<img src="${it.src}" alt="" loading="lazy">`}
          </button>`,
        )
        .join('')}
    </div>`;
  const oh = $('[data-g-outfit]', host);
  outfit = oh ? createOutfit(oh, state, { label: L('معاينة القطعة', 'Piece preview') }) : null;
}

function showSlide(i) {
  const slides = $$('[data-g-slide]');
  galleryIndex = (i + slides.length) % slides.length;
  slides.forEach((s, k) => s.classList.toggle('is-active', k === galleryIndex));
  $$('[data-g-thumb]').forEach((b, k) => {
    b.classList.toggle('is-active', k === galleryIndex);
    b.setAttribute('aria-selected', String(k === galleryIndex));
  });
}

function bindGallery() {
  const host = $('[data-gallery]');
  host.addEventListener('click', (e) => {
    const th = e.target.closest('[data-g-thumb]');
    if (th) showSlide(Number(th.dataset.gThumb));
    if (e.target.closest('[data-g-prev]')) showSlide(galleryIndex - 1);
    if (e.target.closest('[data-g-next]')) showSlide(galleryIndex + 1);
  });
  // Hover zoom: the print close-up the e-store concept asks for.
  host.addEventListener('pointermove', (e) => {
    const z = e.target.closest('[data-zoom]');
    if (!z) return;
    const img = z.querySelector('img');
    const r = z.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    z.classList.add('is-zoom');
  });
  host.addEventListener('pointerout', (e) => {
    const z = e.target.closest('[data-zoom]');
    if (z && !z.contains(e.relatedTarget)) z.classList.remove('is-zoom');
  });
  // Swipe on touch.
  let sx = null;
  host.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' && e.target.closest('[data-g-stage]')) sx = e.clientX;
  });
  host.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) < 40) return;
    const forward = document.documentElement.dir === 'rtl' ? dx > 0 : dx < 0;
    showSlide(galleryIndex + (forward ? 1 : -1));
  });
}

/* ------------------------------------------------------------------- info */
const sizeButtons = (key, current) =>
  `<div class="opt-group" role="radiogroup" aria-label="${esc(ui(key === 'size' ? 'size' : key === 'sizeH' ? 'hoodieSize' : 'sirwalSize'))}">${CONFIG.sizes
    .map((s) => {
      const out = key === 'size' && soldOut(product, s);
      return `<button type="button" class="opt opt--size" role="radio" aria-checked="${current === s}" data-set="${key}" data-value="${s}" ${out ? `aria-disabled="true" title="${esc(ui('sizeSoldOut'))}"` : ''}>${s}</button>`;
    })
    .join('')}</div>`;

const statementButtons = (current, navigate) =>
  `<div class="opt-group opt-group--statements" role="radiogroup" aria-label="${esc(ui('statement'))}">${STATEMENTS.map(
    (s) =>
      `<button type="button" class="st-opt" role="radio" aria-checked="${current === s.id}" ${navigate ? `data-nav-product="hoodie-${s.n}"` : `data-set="statement" data-value="${s.id}"`} title="${esc(`«${s.quote.ar}»`)}">
        <img src="${s.cut}" alt="" loading="lazy"><span class="num">S${s.n}</span>
      </button>`,
  ).join('')}</div>`;

function details() {
  const p = product;
  const hoodie = [
    [L('القصّة', 'Cut'), L('أوفرسايز · كتف ساقط · قبعة مزدوجة', 'Oversized · dropped shoulder · double-layer hood')],
    [L('الخامة (مقترح)', 'Fabric (proposed)'), L('فليس قطني أو مخلوط؛ وزن أخف للمناخ الحار ووزن أثقل للشتاء — يُحدَّد بالعيّنات', 'Cotton or blended fleece; lighter weight for hot weather, heavier for winter — set with samples')],
    [L('الطباعة', 'Print'), L('الظهر: شعار مصغّر (≈ 45%) أسفل الرقبة + العبارة الرئيسية · الصدر: شعار صغير', 'Back: mini logo (≈ 45%) below the neck + the main statement · Chest: small logo')],
    [L('الأكمام', 'Sleeves'), L('اختياري: «ZOOOT» عمودي', 'Optional: vertical «ZOOOT»')],
  ];
  const sirwal = [
    [L('القماش', 'Fabric'), L('قماش شروال قطني أو مخلوط من السوق', 'Cotton or blended sirwal fabric from the souq')],
    [L('الحزام', 'Waist'), L('حزام مطاطي بعرض مريح مع رباط · لسان «زوووط» المنسوج', 'Comfortable elastic waistband with drawstring · woven «ZOOOT» tongue')],
    [L('القصّة', 'Cut'), L('منطقة وسطى نازلة (قصّة تقليدية) · ساق واسعة · كف ريب عند الكاحل · جيوب جانبية عميقة', 'Dropped crotch (traditional cut) · wide leg · rib ankle cuff · deep side pockets')],
    [L('التوقيع', 'Signature'), L('«زوووط» الكبيرة أعلى الخلف — طباعة شاشة قبل القص، أو DTF، أو تطريز للإصدارات الخاصة', 'The big «ZOOOT» across the top of the back — screen printed before cutting, DTF, or embroidered for special editions')],
  ];
  const rows = p.type === 'hoodie' ? hoodie : p.type === 'sirwal' ? sirwal : [...hoodie.slice(0, 3), ...sirwal.slice(0, 3)];
  const st = byId(STATEMENTS, state.statement);
  return `
    <details class="acc" open>
      <summary>${esc(L('التفاصيل', 'Details'))}<svg aria-hidden="true"><use href="#i-plus"/></svg></summary>
      <dl class="spec">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    </details>
    ${
      p.type !== 'sirwal'
        ? `<details class="acc">
      <summary>${esc(L('طريقة الطباعة', 'Print method'))}<svg aria-hidden="true"><use href="#i-plus"/></svg></summary>
      <p><span class="tag" style="--tag-bg:${st.methodColor}">${esc(st.method)}</span> ${esc(t(st.spec))}</p>
    </details>`
        : ''
    }
    <details class="acc">
      <summary>${esc(L('التغليف والمفاجأة', 'Packaging & the surprise'))}<svg aria-hidden="true"><use href="#i-plus"/></svg></summary>
      <p>${esc(L('صندوق أسود بشريط أصفر وختم التوقيع، بطاقة شكر، ستيكر الإصدار الأول — وبطاقة «تدري مين وراء الزوووطة؟» فوق القطعة.', 'A black box with a yellow band and the signature seal, a thank-you card, the first-drop sticker — and the “Who’s behind the ZOOOTA?” card on top.'))}</p>
    </details>
    <p class="pdp-fine">${esc(L('الخامات والمقاسات النهائية تُعتمد بعيّنات المورّد.', 'Final materials and sizing are confirmed with supplier samples.'))}</p>`;
}

function renderInfo() {
  const p = product;
  const host = $('[data-info]');
  const name = t(p.name);
  document.title = `${name} — ${isEN() ? 'ZOOOT' : 'زوووط'}`;
  $('[data-crumbs]').innerHTML = `<a href="shop.html">${esc(L('المتجر', 'Shop'))}</a><span aria-hidden="true">/</span><a href="shop.html?type=${p.type}">${esc(t(TYPE_LABEL[p.type]))}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(name)}</span>`;

  let kicker = '';
  let blurb = '';
  let options = '';
  if (p.type === 'hoodie') {
    const st = byId(STATEMENTS, p.ref);
    const look = HOODIE_COLORS.find((h) => h.hex === state.hoodie)?.look;
    kicker = `STATEMENT S${st.n} · ${st.en.toUpperCase()}`;
    blurb = L(`عبارة «${st.quote.ar}» على ظهر هودي أوفرسايز. الظهر هو القطعة — والعبارة تحكي عنك قبل ما تتكلم.`, `“${st.quote.en}” on the back of an oversized hoodie. The back is the piece — the statement speaks before you do.`);
    options = `
      <div class="opt-block">
        <p class="opt-title"><span>01 · ${esc(ui('hoodieColor'))}</span><b>${esc(look ? t({ ar: look.ar, en: look.en }) : '')}</b></p>
        <div class="opt-group" role="radiogroup" aria-label="${esc(ui('hoodieColor'))}">${HOODIE_COLORS.map(
          (h) => `<button type="button" class="swatch-btn" role="radio" aria-checked="${h.hex === state.hoodie}" data-set="hoodie" data-value="${h.hex}" aria-label="${esc(t({ ar: h.look.ar, en: h.look.en }))}" title="${esc(t({ ar: h.look.ar, en: h.look.en }))}"><i class="sw" style="--c:${h.hex}"></i></button>`,
        ).join('')}</div>
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>02 · ${esc(ui('statement'))}</span><b lang="ar">«${esc(st.quote.ar)}»</b></p>
        ${statementButtons(st.id, true)}
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>03 · ${esc(ui('size'))}</span><button type="button" class="link-btn" data-size-guide-open>${esc(L('دليل المقاسات', 'Fit guide'))}</button></p>
        ${sizeButtons('size', state.size)}
      </div>`;
  } else if (p.type === 'set') {
    const look = byId(LOOKS, p.ref);
    const st = byId(STATEMENTS, state.statement);
    kicker = `LOOK ${look.n} · ${look.en.toUpperCase()}`;
    blurb = L(`إطلالة ${look.ar} كاملة: هودي بلونها، شروال من قماش السوق، و«زوووط» الكبيرة على الظهر. اختر العبارة اللي تبيها على الهودي.`, `The full ${look.en} look: a hoodie in its colour, a souq-fabric sirwal and the big «ZOOOT» across the back. Pick the statement for your hoodie.`);
    options = `
      <div class="opt-block">
        <p class="opt-title"><span>${esc(L('وصفة الألوان', 'Colour recipe'))}</span></p>
        <div class="recipe">
          <span>${esc(L('الهودي', 'Hoodie'))}</span><span class="sw-strip"><i style="--c:${look.hoodie}"></i></span>
          <span>${esc(L('الطباعة', 'Print'))}</span><span class="sw-strip">${look.print.map((c) => `<i style="--c:${c}"></i>`).join('')}</span>
          <span>${esc(L('الشروال', 'Sirwal'))}</span><span class="sw-strip">${look.sirwal.map((c) => `<i style="--c:${c}"></i>`).join('')}</span>
        </div>
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>01 · ${esc(ui('statement'))}</span><b lang="ar">«${esc(st.quote.ar)}»</b></p>
        ${statementButtons(st.id, false)}
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>02 · ${esc(ui('hoodieSize'))}</span><button type="button" class="link-btn" data-size-guide-open>${esc(L('دليل المقاسات', 'Fit guide'))}</button></p>
        ${sizeButtons('sizeH', state.sizeH)}
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>03 · ${esc(ui('sirwalSize'))}</span></p>
        ${sizeButtons('sizeS', state.sizeS)}
      </div>`;
  } else {
    const cw = byId(COLORWAYS, p.ref);
    const fab = byId(FABRICS, state.fabric);
    kicker = `THE ICONIC BACK · ${cw.en.toUpperCase()}`;
    blurb = L(`شروال من أقمشة السوق بقصّة تقليدية، و«زوووط» الكبيرة أعلى الخلف بألوان ${cw.ar}: ${cw.note.ar}.`, `A traditional-cut sirwal in souq fabric, with the big «ZOOOT» across the back in the ${cw.en} colourway: ${cw.note.en.toLowerCase()}.`);
    options = `
      <div class="opt-block">
        <p class="opt-title"><span>01 · ${esc(ui('backLogo'))}</span><b>${esc(t({ ar: cw.ar, en: cw.en }))}</b></p>
        <div class="opt-group" role="radiogroup" aria-label="${esc(ui('backLogo'))}">${COLORWAYS.map(
          (c) => `<button type="button" class="cw-opt" role="radio" aria-checked="${c.id === cw.id}" data-nav-product="sirwal-${c.id}" aria-label="${esc(t({ ar: c.ar, en: c.en }))}" style="--zl-fill:${c.fill};--zl-edge:${c.edge};--zl-shadow:${c.shadow}"><svg aria-hidden="true"><use href="#zooot-logo"/></svg></button>`,
        ).join('')}</div>
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>02 · ${esc(ui('fabric'))}</span><b>${esc(t({ ar: fab.ar, en: fab.en }))}</b></p>
        <div class="opt-group" role="radiogroup" aria-label="${esc(ui('fabric'))}">${FABRICS.map(
          (f) => `<button type="button" class="fab-opt" role="radio" aria-checked="${f.id === state.fabric}" data-set="fabric" data-value="${f.id}" aria-label="${esc(t({ ar: f.ar, en: f.en }))}" title="${esc(t({ ar: f.ar, en: f.en }))}" style="background-image:url(${f.img})"></button>`,
        ).join('')}</div>
      </div>
      <div class="opt-block">
        <p class="opt-title"><span>03 · ${esc(ui('size'))}</span><button type="button" class="link-btn" data-size-guide-open>${esc(L('دليل المقاسات', 'Fit guide'))}</button></p>
        ${sizeButtons('size', state.size)}
      </div>`;
  }

  host.innerHTML = `
    <p class="kicker">${esc(kicker)}</p>
    <h1 class="pdp-title">${esc(name)}</h1>
    <p class="pdp-price num">${p.compareAt && p.compareAt > p.price ? `<s class="p-was">${formatPrice(p.compareAt)}</s> ` : ''}${formatPrice(p.price)}${soldOut(p) ? ` <span class="tag" style="--tag-bg:var(--magenta);vertical-align:middle">${esc(ui('soldOut'))}</span>` : ''}</p>
    <p class="pdp-blurb">${esc(blurb)}</p>
    <div class="pdp-options">${options}</div>
    <div class="pdp-actions">
      ${
        soldOut(p)
          ? `<button class="btn btn--block" type="button" disabled aria-disabled="true" style="opacity:.55;cursor:not-allowed"><span>${esc(ui('soldOutLong'))}</span></button>`
          : `<button class="btn btn--block" type="button" data-add data-magnetic="0.15"><svg aria-hidden="true"><use href="#i-bag"/></svg><span>${esc(ui('addToBag'))} — ${formatPrice(p.price)}</span></button>`
      }
      <a class="btn btn--ghost btn--block" href="studio.html?${encodeOutfit(state)}"><span>${esc(L('عدّلها في الاستوديو', 'Remix it in the studio'))}</span></a>
    </div>
    <p class="pdp-perk"><svg aria-hidden="true"><use href="#i-crown"/></svg><span>${esc(L('تجيك في صندوق التوقيع — مع مفاجأة داخل العلبة.', 'Ships in the signature box — with a surprise inside.'))}</span></p>
    <div class="pdp-acc">${details()}</div>`;

  $('[data-buy-name]').textContent = name;
  $('[data-buy-price]').textContent = formatPrice(p.price);
}

/* -------------------------------------------------------------- sections */
function renderWear() {
  const p = product;
  const steps =
    p.type === 'sirwal'
      ? [
          [L('شدّ الرباط', 'Tie the drawstring'), L('الحزام مطاطي — والرباط يضبطه على مزاجك.', 'The waist is elastic — the drawstring sets it to your mood.')],
          [L('خلّ الكف عند الكاحل', 'Cuffs at the ankle'), L('الساق واسعة والكف يجمعها فوق السنيكرز.', 'Wide legs, gathered by the cuff right above your sneakers.')],
          [L('فوقه هودي', 'Hoodie on top'), L('لون الهودي من أفتح لون في النقشة — أو أسود دايم.', 'Pick the hoodie from the lightest colour in the pattern — or black, always.')],
        ]
      : [
          [L('أوفرسايز دايم', 'Oversized, always'), L('الهودي واسع وكتفه ساقط — خله يرتاح.', 'Wide body, dropped shoulder — let it hang.')],
          [L('الحافة فوق الحزام', 'Hem above the waist'), L('خلّ لسان «زوووط» يبان من تحت الهودي.', 'Let the «ZOOOT» tongue peek out under the hem.')],
          [L('الظهر للشارع', 'The back is for the street'), L('لا تغطي العبارة بشنطة ظهر — الشارع يقرأ الظهر.', 'Don’t cover the statement with a backpack — the street reads the back.')],
        ];
  $('[data-wear]').innerHTML = `
    <div class="container wear-grid">
      <div class="wear-head">
        <p class="kicker">HOW TO WEAR IT</p>
        <h2 class="h1">${esc(L('كيف تلبسه؟', 'How to wear it'))}</h2>
      </div>
      <ol class="wear-steps">${steps.map(([h, d], i) => `<li><span class="num">0${i + 1}</span><h3 class="h3">${esc(h)}</h3><p>${esc(d)}</p></li>`).join('')}</ol>
    </div>`;
}

function renderAnatomySection() {
  const sec = $('[data-anatomy]');
  if (product.type === 'hoodie') {
    sec.hidden = true;
    return;
  }
  sec.hidden = false;
  sec.innerHTML = `
    <div class="container anatomy-grid">
      <div class="anatomy-copy">
        <p class="kicker">COLORS &amp; FABRICS · TECH</p>
        <h2 class="h1">${esc(L('تشريح الشروال', 'Sirwal anatomy'))}</h2>
        <p class="lead">${esc(L('قصّة تقليدية بروح الشارع: كل تفصيلة لها سبب — من لسان «زوووط» في الحزام إلى الكف عند الكاحل.', 'A traditional cut with a street soul: every detail has a reason — from the «ZOOOT» tongue on the waist to the cuff at the ankle.'))}</p>
      </div>
      <div data-anatomy-figure></div>
    </div>`;
  renderAnatomy($('[data-anatomy-figure]', sec), { colorway: byId(COLORWAYS, state.colorway) });
}

function renderRelated() {
  const p = product;
  let pool;
  if (p.type === 'hoodie') pool = ['sirwal-souq-pop', 'set-01', 'hoodie-' + String(((Number(p.id.slice(-2)) % 6) + 1)).padStart(2, '0'), 'sirwal-late-night'];
  else if (p.type === 'sirwal') pool = ['hoodie-01', 'hoodie-03', 'set-01', 'hoodie-05'];
  else pool = ['hoodie-01', 'hoodie-04', 'sirwal-' + byId(LOOKS, p.ref).colorway, 'set-' + String((Number(p.id.slice(-2)) % 8) + 1).padStart(2, '0')];
  const items = [...new Set(pool)].filter((id) => id !== p.id).map(productById).filter(Boolean).slice(0, 4);
  const host = $('[data-related]');
  host.innerHTML = items.map((x) => productCard(x)).join('');
}

function renderAll() {
  initState();
  renderGallery();
  renderInfo();
  renderWear();
  renderAnatomySection();
  renderRelated();
}

/* ---------------------------------------------------------------- actions */
function bindInfo() {
  const info = $('[data-info]');
  info.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav-product]');
    if (nav) {
      const next = productById(nav.dataset.navProduct);
      if (!next || next.id === product.id) return;
      product = next;
      const url = new URL(location.href);
      url.searchParams.set('id', next.id);
      history.replaceState(null, '', url);
      galleryIndex = 0;
      renderAll();
      if (!reduceMotion) gsap.from('.g-slide.is-active', { opacity: 0, scale: 1.04, duration: 0.6, ease: 'power2.out' });
      return;
    }
    const set = e.target.closest('[data-set]');
    if (set?.getAttribute('aria-disabled') === 'true') {
      toast(ui('sizeSoldOut'));
      return;
    }
    if (set) {
      const key = set.dataset.set;
      state[key] = set.dataset.value;
      if (key === 'hoodie') {
        // jump to the live render when the colour can't be photographed
        renderGallery();
        if (state.hoodie !== '#151515') showSlide(0);
      } else if (outfit && ['statement', 'fabric'].includes(key)) {
        outfit.update(state);
        const liveIdx = $$('[data-g-slide]').findIndex((s) => s.classList.contains('g-slide--outfit'));
        if (liveIdx > -1) showSlide(liveIdx);
      }
      const keep = window.scrollY;
      renderInfo();
      window.scrollTo(0, keep);
      return;
    }
    if (e.target.closest('[data-size-guide-open]')) {
      $('[data-size-guide]').showModal();
      lockScroll(true);
      return;
    }
    if (e.target.closest('[data-add]')) add();
  });
}

function add() {
  const p = product;
  if (soldOut(p) || (p.type !== 'set' && state.size && soldOut(p, state.size))) {
    toast(soldOut(p) ? ui('soldOutLong') : ui('sizeSoldOut'));
    return;
  }
  const missing = p.type === 'set' ? !state.sizeH || !state.sizeS : !state.size;
  if (missing) {
    toast(p.type === 'set' ? ui('pickSizes') : ui('pickSize'));
    const group = $('[data-info] [data-set^="size"]')?.closest('.opt-block');
    if (group && !reduceMotion) gsap.fromTo(group, { x: -10 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
    group?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    return;
  }
  const st = byId(STATEMENTS, state.statement);
  const options = [];
  if (p.type === 'hoodie') {
    const look = HOODIE_COLORS.find((h) => h.hex === state.hoodie)?.look;
    options.push({ label: UI.hoodieColor, value: { ar: look.ar, en: look.en }, swatch: state.hoodie }, { label: UI.size, value: state.size });
  } else if (p.type === 'set') {
    options.push({ label: UI.statement, value: `S${st.n}` }, { label: UI.hoodieSize, value: state.sizeH }, { label: UI.sirwalSize, value: state.sizeS });
  } else {
    const fab = byId(FABRICS, state.fabric);
    options.push({ label: UI.fabric, value: { ar: fab.ar, en: fab.en } }, { label: UI.size, value: state.size });
  }
  addToCart({ pid: p.id, name: p.name, img: p.imgs[0], price: p.price, options });
}

function bindBuyBar() {
  const bar = $('[data-buy-bar]');
  const io = new IntersectionObserver(([en]) => (bar.hidden = en.isIntersecting || en.boundingClientRect.top > 0), { threshold: 0 });
  const watch = () => {
    const btn = $('[data-add]');
    if (btn) io.observe(btn);
  };
  watch();
  $('[data-buy-scroll]').addEventListener('click', () => add());
  return watch;
}

boot({
  setup() {
    renderAll();
    bindGallery();
    bindInfo();
    const rewatch = bindBuyBar();
    bindQuickAdd($('[data-related]'), PRODUCTS);
    const sg = $('[data-size-guide]');
    sg.addEventListener('close', () => lockScroll(false));
    sg.addEventListener('click', (e) => {
      if (e.target === sg || e.target.closest('[data-size-guide-close]')) sg.close();
    });
    window.addEventListener('langchange', () => {
      renderAll();
      rewatch();
      ScrollTrigger.refresh();
    });
    // Price / stock changed in the owner dashboard → refresh the buy box in place.
    window.addEventListener('catalog:change', () => {
      const keep = window.scrollY;
      renderInfo();
      window.scrollTo(0, keep);
    });
    const mo = new MutationObserver(rewatch);
    mo.observe($('[data-info]'), { childList: true });
  },
  intro() {
    if (reduceMotion) return;
    gsap.from('.g-stage', { clipPath: 'inset(0 0 100% 0 round 24px)', duration: 1.2, ease: 'expo.out' });
    gsap.from('.pdp-info > *', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06, delay: 0.15 });
  },
});
