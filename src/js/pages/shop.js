import { boot } from '../main.js';
import '../../styles/shop.css';
import { Flip } from 'gsap/Flip';
import { gsap, reduceMotion, ScrollTrigger } from '../core/motion.js';
import { $, $$, esc } from '../core/ui.js';
import { t } from '../core/i18n.js';
import { PRODUCTS } from '../data.js';
import { bindQuickAdd, productCard } from '../components/productCard.js';

gsap.registerPlugin(Flip);

const params = new URLSearchParams(location.search);
let filter = ['set', 'hoodie', 'sirwal'].includes(params.get('type')) ? params.get('type') : 'all';
let sort = 'featured';

const promo = () => `
  <a class="promo-tile" href="studio.html" data-type="promo" data-cursor="صمّم" data-cursor-en="BUILD">
    <span class="kicker kicker--light">ZOOOT STUDIO</span>
    <strong>${esc(t({ ar: 'ما لقيت طقمك؟ صمّمه.', en: "Can't find your fit? Build it." }))}</strong>
    <span class="promo-logo"><svg aria-hidden="true"><use href="#zooot-logo"/></svg></span>
    <span class="btn btn--sm">${esc(t({ ar: 'ادخل الاستوديو', en: 'Enter the studio' }))}<svg aria-hidden="true"><use href="#i-arrow"/></svg></span>
  </a>`;

function render(grid) {
  grid.innerHTML = PRODUCTS.map((p) => productCard(p)).join('');
  const cards = $$('.p-card', grid);
  cards[5]?.insertAdjacentHTML('afterend', promo());
}

function apply(grid, animate = true) {
  const items = $$('.p-card, .promo-tile', grid);
  const state = animate && !reduceMotion ? Flip.getState(items) : null;
  // sort
  const cards = $$('.p-card', grid);
  const order = [...cards].sort((a, b) => {
    if (sort === 'price-asc') return a.dataset.price - b.dataset.price;
    if (sort === 'price-desc') return b.dataset.price - a.dataset.price;
    return PRODUCTS.findIndex((p) => p.id === a.dataset.id) - PRODUCTS.findIndex((p) => p.id === b.dataset.id);
  });
  const promoEl = $('.promo-tile', grid);
  order.forEach((c) => grid.append(c));
  if (promoEl) order[5]?.after(promoEl);
  // filter
  let shown = 0;
  items.forEach((el) => {
    const visible = el.dataset.type === 'promo' ? filter === 'all' && sort === 'featured' : filter === 'all' || el.dataset.type === filter;
    el.hidden = !visible;
    if (visible && el.dataset.type !== 'promo') shown++;
  });
  $('[data-result-count]').textContent = shown;
  $$('[data-filter]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.filter === filter)));
  const url = new URL(location.href);
  filter === 'all' ? url.searchParams.delete('type') : url.searchParams.set('type', filter);
  history.replaceState(null, '', url);
  if (state)
    Flip.from(state, {
      duration: 0.7,
      ease: 'expo.inOut',
      scale: true,
      absolute: true,
      stagger: 0.02,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.4 }),
      onComplete: () => ScrollTrigger.refresh(),
    });
  else ScrollTrigger.refresh();
}

boot({
  setup() {
    const grid = $('[data-grid]');
    render(grid);
    const counts = () => {
      const live = PRODUCTS.filter((p) => !p.hidden);
      ['all', 'set', 'hoodie', 'sirwal'].forEach((k) => {
        $(`[data-count-for="${k}"]`).textContent = k === 'all' ? live.length : live.filter((p) => p.type === k).length;
      });
    };
    counts();
    apply(grid, false);
    window.addEventListener('catalog:change', () => {
      render(grid);
      counts();
      apply(grid, false);
    });
    $('[data-filters]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b || b.dataset.filter === filter) return;
      filter = b.dataset.filter;
      apply(grid);
    });
    $('[data-sort]').addEventListener('change', (e) => {
      sort = e.target.value;
      apply(grid);
    });
    bindQuickAdd(grid, PRODUCTS);
    window.addEventListener('langchange', () => {
      render(grid);
      apply(grid, false);
    });
  },
  intro() {
    if (reduceMotion) return;
    gsap.from($$('.p-card:not([hidden]), .promo-tile:not([hidden])').slice(0, 8), { y: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.06, delay: 0.2 });
    gsap.from('.shop-big', { xPercent: -20, opacity: 0, duration: 1.4, ease: 'expo.out' });
  },
});
