/** Helpers shared by the dashboard views. */
import { balanceOf, phoneKey, waNumber } from '../../js/backend/model.js';
import { reload, render, store } from '../main.js';
import { esc, icon, img, L, ok, bad, tr, optText } from '../ui.js';

export const actor = () => store.me?.email || null;

/** Every render gets a fresh container so old listeners die with the old DOM. */
export function mount(host, html, cls = '') {
  const el = document.createElement('div');
  el.className = `view ${cls}`.trim();
  el.innerHTML = html;
  host.replaceChildren(el);
  return el;
}

/** Disable a button while its promise runs; surface errors as toasts. */
export async function busy(btn, fn, okMsg) {
  btn?.classList.add('is-busy');
  try {
    const out = await fn();
    if (okMsg) ok(okMsg);
    return out;
  } catch (e) {
    console.error(e);
    bad(e);
    return undefined;
  } finally {
    btn?.classList.remove('is-busy');
  }
}

/* ------------------------------------------------------------------ dates */
const DAY = 86_400_000;
export const startOfDay = (t = Date.now()) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const RANGES = [
  { id: 'today', ar: 'اليوم', en: 'Today' },
  { id: '7d', ar: '٧ أيام', en: '7 days' },
  { id: '30d', ar: '٣٠ يوم', en: '30 days' },
  { id: '90d', ar: '٩٠ يوم', en: '90 days' },
  { id: 'all', ar: 'الكل', en: 'All time' },
];
const RANGE_KEY = 'zooot-hq-range';
export function getRange() {
  try {
    return RANGES.some((r) => r.id === localStorage.getItem(RANGE_KEY)) ? localStorage.getItem(RANGE_KEY) : '30d';
  } catch {
    return '30d';
  }
}
export function setRange(id) {
  try {
    localStorage.setItem(RANGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** Bounds + chart buckets for a range id. `prev` is the equal-length period before. */
export function rangeBounds(id) {
  const to = Date.now();
  const today = startOfDay();
  if (id === 'today') {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ from: today + h * 3_600_000, to: today + (h + 1) * 3_600_000, label: String(h) }));
    return { id, from: today, to, prev: { from: today - DAY, to: to - DAY }, buckets, unit: 'hour' };
  }
  if (id === 'all') {
    const first = Math.min(to, ...store.orders.map((o) => Date.parse(o.created_at)));
    const days = Math.max(1, Math.ceil((to - startOfDay(first)) / DAY));
    const step = days > 120 ? 30 : days > 45 ? 7 : 1;
    return { id, from: 0, to, prev: null, buckets: dayBuckets(Math.ceil(days / step), step), unit: step === 1 ? 'day' : step === 7 ? 'week' : 'month' };
  }
  const n = { '7d': 7, '30d': 30, '90d': 90 }[id] || 30;
  const from = today - (n - 1) * DAY;
  const step = n > 45 ? 7 : 1;
  return { id, from, to, prev: { from: from - n * DAY, to: from }, buckets: dayBuckets(Math.ceil(n / step), step), unit: step === 1 ? 'day' : 'week' };
}
function dayBuckets(count, step) {
  const today = startOfDay();
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const from = today - (i * step + step - 1) * DAY;
    out.push({ from, to: from + step * DAY, label: '' });
  }
  return out;
}
export const inRange = (iso, r) => {
  const t = Date.parse(iso);
  return t >= r.from && t <= r.to;
};

export function rangePicker(current) {
  return `<div class="seg" role="group" aria-label="${esc(L('الفترة', 'Period'))}">${RANGES.map(
    (r) => `<button type="button" data-range="${r.id}" aria-pressed="${r.id === current}">${esc(L(r.ar, r.en))}</button>`,
  ).join('')}</div>`;
}

/* ------------------------------------------------------------------ orders */
export const live = (o) => o.status !== 'cancelled';
export const itemName = (it) => tr(it.name) || L('قطعة', 'Item');
export const itemOpts = (it) => (it.options || []).map(optText).join(' · ') || (it.size ? `${L('المقاس', 'Size')}: ${it.size}` : '');
export const unitsOf = (o) => (o.items || []).reduce((s, it) => s + Number(it.qty || 0), 0);
export function thumbs(o, max = 3) {
  const its = (o.items || []).filter((it) => it.image).slice(0, max);
  return `<span class="thumbs">${its.map((it) => `<img src="${esc(img(it.image))}" alt="" loading="lazy">`).join('')}</span>`;
}
export const itemsSummary = (o) =>
  (o.items || [])
    .map((it) => `${itemName(it)}${it.qty > 1 ? ` ×${it.qty}` : ''}`)
    .join('، ');

export const findOrder = (no) => store.orders.find((o) => o.order_no === no || o.id === no);
export const customerOrders = (phone) => store.orders.filter((o) => phoneKey(o.customer_phone) === phoneKey(phone));
export { balanceOf };

/* ------------------------------------------------------------------ links */
/** The storefront root, e.g. https://…/zoot/ (works on GitHub Pages sub-paths and in dev). */
export const siteRoot = () => new URL('../', location.href.split('#')[0]).href;
export const trackUrl = (o) => `${siteRoot()}track.html?order=${encodeURIComponent(o.order_no)}`;
export const waHref = (phone, text = '') => `https://wa.me/${waNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export function waText(o, kind = 'status') {
  const name = (o.customer_name || '').split(' ')[0];
  const en = o.lang === 'en';
  const link = trackUrl(o);
  if (kind === 'reminder') {
    const bank = store.settings.public?.bank_details;
    return en
      ? `Hi ${name}! A friendly reminder that order ${o.order_no} has a balance of SAR ${balanceOf(o)}.${bank ? `\n\nBank details:\n${bank}` : ''}\n\nTrack: ${link}`
      : `هلا ${name}! تذكير لطيف إن طلبك ${o.order_no} باقي عليه ${balanceOf(o)} ر.س.${bank ? `\n\nبيانات التحويل:\n${bank}` : ''}\n\nتتبّع طلبك: ${link}`;
  }
  if (kind === 'shipped') {
    return en
      ? `Hi ${name}! Your ZOOOT order ${o.order_no} is on its way${o.courier ? ` with ${o.courier}` : ''}${o.tracking_no ? ` (tracking ${o.tracking_no})` : ''}. Track it here: ${link}`
      : `هلا ${name}! طلبك من زوووط ${o.order_no} في الطريق${o.courier ? ` مع ${o.courier}` : ''}${o.tracking_no ? ` (رقم الشحنة ${o.tracking_no})` : ''}. تتبّعه من هنا: ${link}`;
  }
  return en
    ? `Hi ${name}! This is ZOOOT about your order ${o.order_no}. Track it anytime: ${link}`
    : `هلا ${name}! معك زوووط بخصوص طلبك ${o.order_no}. تقدر تتابع حالته من هنا: ${link}`;
}

/* ------------------------------------------------------------------ bits */
export function empty(msg, action = '') {
  return `<div class="empty"><svg class="logo" aria-hidden="true"><use href="#zooot-logo"/></svg><p>${esc(msg)}</p>${action}</div>`;
}

export function statTile({ label, value, delta, spark = '', hint = '' }) {
  return `<div class="card stat">
    <span class="stat-label">${esc(label)}</span>
    <span class="stat-value">${value}</span>
    ${delta ?? ''}${hint ? `<span class="delta">${esc(hint)}</span>` : ''}
    ${spark}
  </div>`;
}

/** % change vs the previous period — a neutral dash when there's nothing to compare. */
export function deltaHTML(now, before, { invert = false } = {}) {
  if (before == null) return '';
  if (!before && !now) return `<span class="delta">— ${esc(L('بدون تغيير', 'no change'))}</span>`;
  if (!before) return `<span class="delta up">${icon('arrow')} ${esc(L('جديد', 'new'))}</span>`;
  const pct = Math.round(((now - before) / before) * 100);
  const good = invert ? pct < 0 : pct > 0;
  const cls = pct === 0 ? '' : good ? 'up' : 'down';
  return `<span class="delta ${cls}" title="${esc(L('مقارنة بالفترة السابقة', 'vs previous period'))}">${pct > 0 ? '▲' : pct < 0 ? '▼' : '•'} <span class="num">${Math.abs(pct)}%</span> ${esc(L('عن الفترة السابقة', 'vs prev.'))}</span>`;
}

/** Demo-mode banner with sample-data controls. */
export function demoBanner() {
  if (store.mode !== 'demo') return '';
  const demo = store.api.demo;
  const btn = demo.hasDemo()
    ? `<button class="b b-sm" type="button" data-demo="clear">${icon('trash')}${esc(L('امسح البيانات التجريبية', 'Clear sample data'))}</button>`
    : `<button class="b b-sm b-dark" type="button" data-demo="seed">${icon('star')}${esc(L('عبّي بيانات تجريبية', 'Load sample data'))}</button>`;
  return `<div class="banner" role="note">${icon('lock')}<span>${esc(
    L(
      'وضع تجريبي: البيانات محفوظة في هذا المتصفح فقط. اربط Supabase عشان تصير الطلبات حقيقية ومشتركة بين أجهزتك.',
      'Demo mode: data lives in this browser only. Connect Supabase to make orders real and shared across devices.',
    ),
  )}</span>${btn}</div>`;
}
export function bindDemoBanner(el, after) {
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-demo]');
    if (!b) return;
    await busy(b, async () => {
      if (b.dataset.demo === 'seed') store.api.demo.seed();
      else store.api.demo.clear();
      await reload();
    });
    after ? after() : render();
  });
}

export const statusOptions = (list, current) => list.map((s) => `<option value="${esc(s.id)}" ${s.id === current ? 'selected' : ''}>${esc(tr(s))}</option>`).join('');

/* ------------------------------------------------------------------ product → line item */
const SIZE_LABEL = { ar: 'المقاس', en: 'Size' };
const HOODIE_LABEL = { ar: 'مقاس الهودي', en: 'Hoodie size' };
const SIRWAL_LABEL = { ar: 'مقاس الشروال', en: 'Sirwal size' };
const SET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

/** Size controls for a product inside a form (names: size | hoodie + sirwal). */
export function sizeFields(prod, current = {}) {
  if (!prod) return '';
  const opts = (list, v) => list.map((s) => `<option ${s === v ? 'selected' : ''}>${s}</option>`).join('');
  if (prod.type === 'set')
    return `<label class="f"><span>${esc(tr(HOODIE_LABEL))}</span><select name="hoodie">${opts(SET_SIZES, current.hoodie || 'L')}</select></label>
      <label class="f"><span>${esc(tr(SIRWAL_LABEL))}</span><select name="sirwal">${opts(SET_SIZES, current.sirwal || 'M')}</select></label>`;
  if (prod.sizes?.length)
    return `<label class="f"><span>${esc(tr(SIZE_LABEL))}</span><select name="size">${prod.sizes
      .map((s) => {
        const left = prod.stock && s in prod.stock ? Number(prod.stock[s]) : null;
        return `<option value="${s}" ${s === (current.size || 'M') ? 'selected' : ''}>${s}${left !== null ? ` — ${left} ${L('متوفر', 'left')}` : ''}</option>`;
      })
      .join('')}</select></label>`;
  return '';
}

/** Turn the size fields back into { size, options } for the order line. */
export function readSize(prod, data) {
  if (prod?.type === 'set')
    return { size: null, options: [{ label: HOODIE_LABEL, value: data.hoodie }, { label: SIRWAL_LABEL, value: data.sirwal }] };
  if (prod?.sizes?.length && data.size) return { size: data.size, options: [{ label: SIZE_LABEL, value: data.size }] };
  return { size: null, options: [] };
}

export const productOptions = (current) =>
  store.products
    .filter((p) => p.active || p.id === current)
    .map((p) => `<option value="${esc(p.id)}" ${p.id === current ? 'selected' : ''}>${esc(tr(p.name))} — ${esc(String(p.price))}${p.out_of_stock ? ` (${L('نفد', 'sold out')})` : ''}</option>`)
    .join('');
