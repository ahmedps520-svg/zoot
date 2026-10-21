import { boot } from '../main.js';
import '../../styles/story.css';
import { gsap, reduceMotion } from '../core/motion.js';
import { $, esc, toast } from '../core/ui.js';
import { t, ui } from '../core/i18n.js';
import { COLORWAYS, FABRICS, LOOKS, PALETTE, STATEMENTS } from '../data.js';
import { renderAnatomy } from '../components/hotspots.js';

const L = (ar, en) => t({ ar, en });

const SIGNATURE = [
  { img: 'neck-label', ar: 'ملصق داخلي للهودي', en: 'Hoodie neck label', note: L('منسوج أسود · داخل الرقبة', 'Black woven · inside the neck') },
  { img: 'hang-tag', ar: 'بطاقة Hang Tag', en: 'Hang tag', note: L('سوداء بحلقة معدنية · بأسماء المؤسِّستين', 'Black with a metal eyelet · the founders’ names') },
  { img: 'belt-label', ar: 'ملصق حزام الشروال', en: 'Sirwal waistband label', note: L('منسوج داخل الحزام', 'Woven inside the waistband') },
  { img: 'drop-card', ar: 'بطاقة DROP 001 المرقّمة', en: 'Numbered DROP 001 card', note: 'N° 000 / [—]' },
  { img: 'box', ar: 'صندوق التغليف', en: 'The box', note: L('أسود بشريط أصفر وختم التوقيع', 'Black with a yellow band and the signature seal') },
  { img: 'thank-you', ar: 'بطاقة الشكر', en: 'Thank-you card', note: L('داخل التغليف', 'Inside the packaging') },
  { img: 'sticker', ar: 'ستيكر الإصدار الأول', en: 'First-drop sticker', note: L('مقصوص بحافة بيضاء', 'Die-cut with a white edge') },
];

function render() {
  $('[data-cw-grid]').innerHTML = COLORWAYS.map(
    (c) => `
    <a class="cw-card" href="product.html?id=sirwal-${c.id}" data-cursor="شوفه" data-cursor-en="VIEW">
      <span class="cw-media"><img src="${c.img}" alt="${esc(L(`شروال ${c.ar} من الخلف`, `${c.en} sirwal from behind`))}" loading="lazy"></span>
      <span class="cw-info"><strong>${esc(L(c.ar, c.en))}</strong><small>${esc(t(c.note))}</small></span>
      <span class="sw-row" aria-hidden="true"><i class="sw" style="--c:${c.fill}"></i><i class="sw" style="--c:${c.edge}"></i><i class="sw" style="--c:${c.shadow}"></i></span>
    </a>`,
  ).join('');

  $('[data-palette]').innerHTML = PALETTE.map(
    (p) => `
    <button type="button" class="pal" style="--c:${p.hex}" data-hex="${p.hex}" aria-label="${esc(`${L(p.ar, p.en)} ${p.hex}`)}">
      <span class="pal-chip"></span>
      <strong>${esc(L(p.ar, p.en))}</strong>
      <span class="num">${p.hex}</span>
      <small>${esc(t(p.use))}</small>
    </button>`,
  ).join('');

  $('[data-look-palettes]').innerHTML = LOOKS.map(
    (l) => `
    <div class="lp-row">
      <span class="lp-name"><b class="num">${l.n}</b> ${esc(L(l.ar, l.en))}</span>
      <span class="sw-strip lp-h" title="${esc(L('الهودي', 'Hoodie'))}"><i style="--c:${l.hoodie}"></i></span>
      <span class="sw-strip" title="${esc(L('الطباعة', 'Print'))}">${l.print.map((c) => `<i style="--c:${c}"></i>`).join('')}</span>
      <span class="sw-strip" title="${esc(L('الشروال', 'Sirwal'))}">${l.sirwal.map((c) => `<i style="--c:${c}"></i>`).join('')}</span>
    </div>`,
  ).join('');

  $('[data-fab-grid]').innerHTML = FABRICS.slice(2)
    .map((f) => `<figure class="fab-card"><span class="fab-media" style="background-image:url(${f.img})"></span><figcaption>${esc(L(f.ar, f.en))}</figcaption></figure>`)
    .join('');

  renderAnatomy($('[data-anatomy]'));

  $('[data-methods]').innerHTML = STATEMENTS.map(
    (s) => `
    <a class="method" href="product.html?id=hoodie-${s.n}">
      <span class="method-art"><img src="img/statements/art-${s.id.toLowerCase()}-800.webp" alt="${esc(`«${s.quote.ar}»`)}" loading="lazy"></span>
      <span class="method-info">
        <span class="method-top"><span class="tag" style="--tag-bg:${s.methodColor}">${esc(s.method)}</span><strong><span class="num">${s.n}</span> · ${esc(L(s.ar, s.en))}</strong></span>
        <small>${esc(t(s.spec))}</small>
      </span>
    </a>`,
  ).join('');

  $('[data-sig-grid]').innerHTML = SIGNATURE.map(
    (s, i) => `
    <figure class="sig-item${i === 4 ? ' sig-item--wide' : ''}">
      <span class="sig-media"><img src="img/signature/${s.img}${i === 4 ? '' : '-800'}.webp" alt="${esc(L(s.ar, s.en))}" loading="lazy"></span>
      <figcaption><b class="num">0${i + 1}</b> <strong>${esc(L(s.ar, s.en))}</strong> <small>${esc(s.note)}</small></figcaption>
    </figure>`,
  ).join('');
}

boot({
  setup() {
    render();
    window.addEventListener('langchange', render);
    document.addEventListener('click', async (e) => {
      const pal = e.target.closest('[data-hex]');
      if (!pal) return;
      try {
        await navigator.clipboard.writeText(pal.dataset.hex);
      } catch {
        /* clipboard blocked — still show the code */
      }
      toast(`${ui('copiedHex')} ${pal.dataset.hex}`);
      if (!reduceMotion) gsap.fromTo(pal.querySelector('.pal-chip'), { scaleY: 0.9 }, { scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)' });
    });
    if (!reduceMotion) {
      gsap.fromTo('[data-banner-logo]', { scale: 0.7, rotate: -6 }, { scale: 1, rotate: 0, ease: 'none', scrollTrigger: { trigger: '.logo-banner', start: 'top bottom', end: 'center center', scrub: true } });
    }
  },
});
