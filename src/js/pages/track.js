import { boot } from '../main.js';
import '../../styles/track.css';
import { gsap, reduceMotion } from '../core/motion.js';
import { $, esc, toast } from '../core/ui.js';
import { formatPrice, getLang, t } from '../core/i18n.js';
import { CONFIG } from '../data.js';
import { publicApi } from '../backend/public.js';
import { FLOW, ORDER_STATUSES } from '../backend/model.js';
import { forgetAll, forgetOrder, phoneFor, rememberOrder, savedOrders } from '../core/orders.js';

const params = new URLSearchParams(location.search);
const L = (ar, en) => (getLang() === 'en' ? en : ar);
const statusOf = (id) => ORDER_STATUSES.find((s) => s.id === id) || ORDER_STATUSES[0];
const when = (iso) =>
  iso ? new Intl.DateTimeFormat(getLang() === 'en' ? 'en-GB' : 'ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : '';

const COPY = {
  new: ['استلمنا طلبك ✦ بنأكده معك قريب.', 'We’ve got your order ✦ we’ll confirm it shortly.'],
  confirmed: ['طلبك مؤكد — وصار في الدور.', 'Confirmed — your order is in the queue.'],
  preparing: ['نجهّز قطعك ونرتّب صندوق التوقيع.', 'We’re preparing your pieces and the signature box.'],
  shipped: ['طلبك طلع — في الطريق لك.', 'It’s out — on its way to you.'],
  delivered: ['وصل! البسه بصوت عالي.', 'Delivered! Wear it loud.'],
  cancelled: ['هذا الطلب انلغى. لو عندك سؤال كلمنا.', 'This order was cancelled. Questions? Talk to us.'],
};

let current = null; // { no, phone, data }
let timer = null;
let stopLive = null;
let stopListLive = [];
let map = null; // { el, map, marker, ring } — survives re-renders so the map doesn't flicker
const cache = new Map(); // order_no → last track_order result, so opening from the list is instant

const clock = (iso) => new Intl.DateTimeFormat(getLang() === 'en' ? 'en-GB' : 'ar-SA-u-nu-latn-ca-gregory', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const ago = (iso) => {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return L(`قبل ${s} ثانية`, `${s}s ago`);
  return L(`قبل ${Math.round(s / 60)} دقيقة`, `${Math.round(s / 60)} min ago`);
};

/** Courier card: live map when the phone shared a fresh position, otherwise the ETA. */
function driverHTML(d) {
  if (!d) return '';
  const mins = d.eta ? Math.round((Date.parse(d.eta) - Date.now()) / 60000) : null;
  const eta = d.eta
    ? `<p class="td-eta">${esc(L('الوصول المتوقع', 'Expected around'))} <b>${esc(clock(d.eta))}</b>${
        mins > 1 ? ` <span>(${esc(L(`بعد ~${mins} دقيقة`, `in ~${mins} min`))})</span>` : mins !== null && mins <= 1 ? ` <span>(${esc(L('أي لحظة', 'any minute'))})</span>` : ''
      }</p>`
    : `<p class="td-eta">${esc(L('في الطريق إليك اليوم', 'On its way to you today'))}</p>`;
  return `<div class="track-driver">
    <div class="td-head">
      <span class="td-avatar" aria-hidden="true">${esc((d.name || 'Z').trim().charAt(0))}</span>
      <div><b>${esc(d.name || L('مندوب زوووط', 'ZOOOT courier'))}</b><small>${esc(L('مندوبك من زوووط', 'Your ZOOOT courier'))}</small></div>
      ${d.phone ? `<a class="btn btn--sm btn--ghost" href="tel:${esc(d.phone)}">${esc(L('اتصال', 'Call'))}</a>` : ''}
    </div>
    ${d.location ? `<div class="td-map" data-map dir="ltr"></div><p class="td-live"><i></i>${esc(L('موقع المندوب مباشر', 'Live courier location'))} · ${esc(ago(d.location.at))}</p>` : ''}
    ${eta}
  </div>`;
}

const PIN = `<span class="courier-pin"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3.5v2.5h-7z"/><circle cx="6.5" cy="17" r="1.8" fill="#FFD21F" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="17" r="1.8" fill="#FFD21F" stroke="currentColor" stroke-width="2"/></svg></span>`;

async function paintMap(host, d) {
  const slot = host.querySelector('[data-map]');
  if (!slot || !d?.location) {
    map = null;
    return;
  }
  const { lat, lng, accuracy } = d.location;
  if (map) {
    slot.replaceWith(map.el);
    map.map.invalidateSize();
    map.marker.setLatLng([lat, lng]);
    map.ring.setLatLng([lat, lng]).setRadius(Math.min(accuracy || 30, 300));
    if (!map.map.getBounds().pad(-0.2).contains([lat, lng])) map.map.panTo([lat, lng], { animate: !reduceMotion });
    return;
  }
  const [{ default: Lf }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
  const m = Lf.map(slot, { zoomControl: false, attributionControl: true, scrollWheelZoom: false }).setView([lat, lng], 15);
  Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
  const ring = Lf.circle([lat, lng], { radius: Math.min(accuracy || 30, 300), color: '#1F4BFF', weight: 1, fillOpacity: 0.12 }).addTo(m);
  const marker = Lf.marker([lat, lng], { icon: Lf.divIcon({ className: '', html: PIN, iconSize: [44, 44], iconAnchor: [22, 22] }), keyboard: false }).addTo(m);
  map = { el: slot, map: m, marker, ring };
}

function render(o) {
  const host = $('[data-track-result]');
  const s = statusOf(o.status);
  const cancelled = o.status === 'cancelled';
  const idx = FLOW.indexOf(o.status);
  const at = (id) => (o.events || []).filter((e) => (id === 'new' ? e.type === 'created' : e.to === id)).pop()?.at;
  host.innerHTML = `
    <div class="track-card">
      <div class="track-head">
        <div>
          <p class="kicker">${esc(L('رقم الطلب', 'Order N°'))}</p>
          <p class="track-no">${esc(o.order_no)}</p>
        </div>
        <span class="track-live" title="${esc(L('تتحدّث تلقائيًا', 'Updates automatically'))}"><i></i>${esc(L('مباشر', 'LIVE'))}</span>
      </div>
      <p class="track-status" style="--c:${s.color}"><span>${esc(t(s))}</span></p>
      <p class="lead">${esc(L(...COPY[o.status]))}</p>
      ${driverHTML(o.driver)}
      ${
        cancelled
          ? ''
          : `<ol class="track-steps">${FLOW.map(
              (id, i) => `<li class="${i < idx ? 'done' : ''} ${i === idx ? 'now' : ''}" ${i === idx ? 'aria-current="step"' : ''}>
                <i aria-hidden="true">${i <= idx ? '<svg><use href="#i-check"/></svg>' : i + 1}</i>
                <span>${esc(t(statusOf(id)))}</span>
                <small>${esc(i <= idx ? when(at(id)) : '')}</small>
              </li>`,
            ).join('')}</ol>`
      }
      ${
        o.courier || o.tracking_no
          ? `<div class="track-ship"><span>${esc(L('شركة الشحن', 'Courier'))}: <b>${esc(o.courier || '—')}</b></span>${o.tracking_no ? `<button type="button" class="track-copy" data-copy="${esc(o.tracking_no)}"><span>${esc(L('رقم الشحنة', 'Tracking'))}:</span> <b dir="ltr">${esc(o.tracking_no)}</b> <small>${esc(L('نسخ', 'Copy'))}</small></button>` : ''}</div>`
          : ''
      }
      <ul class="track-items">${(o.items || [])
        .map(
          (it) => `<li>
            ${it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy">` : '<span class="track-ph"></span>'}
            <div><b>${esc(t(it.name))}</b>${it.qty > 1 ? ` <span class="num">×${it.qty}</span>` : ''}<small>${esc((it.options || []).map((op) => `${t(op.label)}: ${typeof op.value === 'object' ? t(op.value) : op.value}`).join(' · '))}</small></div>
          </li>`,
        )
        .join('')}</ul>
      <div class="track-foot">
        <span>${esc(L('الإجمالي', 'Total'))} <b class="num">${formatPrice(o.total)}</b></span>
        <span class="track-pay ${o.payment_status}">${esc(
          { unpaid: L('بانتظار الدفع', 'Awaiting payment'), partial: L('مدفوع جزئيًا', 'Partly paid'), paid: L('مدفوع', 'Paid'), refunded: L('مسترجع', 'Refunded') }[o.payment_status] || '',
        )}</span>
      </div>
      <div class="track-actions">
        ${CONFIG.whatsapp ? `<a class="btn btn--whatsapp" href="https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(L(`مرحبا زوووط، عندي سؤال عن طلبي ${o.order_no}`, `Hi ZOOOT, a question about my order ${o.order_no}`))}" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-whatsapp"/></svg><span>${esc(L('اسألنا', 'Ask us'))}</span></a>` : ''}
        <button class="btn btn--ghost" type="button" data-another>${esc(savedOrders().length > 1 ? L('كل طلباتي', 'All my orders') : L('تتبّع طلب ثاني', 'Track another order'))}</button>
      </div>
      <p class="track-updated">${esc(L('الصفحة تتحدّث لحالها — ما يحتاج تعيد تحميلها.', 'This page updates by itself — no need to refresh.'))} ${esc(L('آخر تغيير', 'Last change'))}: ${esc(when(o.updated_at))}</p>
    </div>`;
  show('result');
  paintMap(host, o.driver);
}

/* ------------------------------------------------------------------ views */
function show(view) {
  $('[data-track-form]').hidden = view !== 'form';
  $('[data-track-result]').hidden = view !== 'result';
  $('[data-track-mine]').hidden = view !== 'mine';
  if (view !== 'result') {
    clearTimeout(timer);
    stopLive?.();
    stopLive = null;
    current = null;
    map = null;
  }
  if (view !== 'mine') {
    stopListLive.forEach((stop) => stop());
    stopListLive = [];
  }
  if (view === 'form') $('[data-show-mine]').hidden = !savedOrders().length;
}

const day = (iso) => new Intl.DateTimeFormat(getLang() === 'en' ? 'en-GB' : 'ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'short' }).format(new Date(iso));
const pieces = (n) => (getLang() === 'en' ? `${n} ${n === 1 ? 'piece' : 'pieces'}` : n === 1 ? 'قطعة وحدة' : n === 2 ? 'قطعتين' : n <= 10 ? `${n} قطع` : `${n} قطعة`);

function cardHTML(s, o) {
  const st = o && statusOf(o.status);
  const img = o?.items?.find((i) => i.image)?.image;
  const n = (o?.items || []).reduce((a, i) => a + (Number(i.qty) || 1), 0);
  return `<button type="button" class="tm-card" data-open="${esc(s.order_no)}">
    <span class="tm-thumb">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}</span>
    <span class="tm-info"><b dir="ltr">${esc(s.order_no)}</b><small>${esc(o ? `${day(o.created_at)} · ${pieces(n)}` : L('نحمّل…', 'Loading…'))}</small></span>
    ${o ? `<span class="tm-status" style="--c:${st.color}">${esc(t(st))}</span><span class="tm-total num">${formatPrice(o.total)}</span>` : '<span class="tm-status is-loading"></span>'}
    <svg class="tm-go" aria-hidden="true"><use href="#i-arrow"/></svg>
  </button>`;
}

/** Orders saved on this device, each kept live. */
async function showList() {
  const list = savedOrders();
  if (!list.length) return showForm();
  show('mine');
  if (location.search) history.replaceState(null, '', location.pathname);
  const ul = $('[data-mine-list]');
  ul.innerHTML = list.map((s) => `<li data-no="${esc(s.order_no)}">${cardHTML(s, cache.get(s.order_no))}</li>`).join('');
  const api = await publicApi();
  const refresh = async (s) => {
    let o;
    try {
      o = await api.trackOrder(s.order_no, s.phone);
    } catch {
      return null; // offline: keep what's shown
    }
    const li = ul.querySelector(`li[data-no="${CSS.escape(s.order_no)}"]`);
    if (!o) {
      forgetOrder(s.order_no); // cancelled & removed by the shop, or a typo saved earlier
      li?.remove();
      if (!ul.children.length) showForm();
      return null;
    }
    const before = cache.get(s.order_no);
    cache.set(s.order_no, o);
    if (li && $('[data-track-mine]').hidden === false) li.innerHTML = cardHTML(s, o);
    if (before && before.status !== o.status) toast(L(`${s.order_no}: ${t(statusOf(o.status))}`, `${s.order_no}: ${t(statusOf(o.status))}`));
    return o;
  };
  const found = await Promise.all(list.map(refresh));
  if ($('[data-track-mine]').hidden) return;
  stopListLive.forEach((stop) => stop());
  stopListLive = list
    .map((s, i) => found[i]?.id && api.watchTopic?.(`order:${found[i].id}`, () => refresh(s)))
    .filter(Boolean);
  if (!api.watchTopic) stopListLive.push(api.onChange?.(() => list.forEach(refresh)) || (() => {}));
}

function showForm({ order = '', focus = true } = {}) {
  const form = $('[data-track-form]');
  show('form');
  form.reset();
  $('[data-form-msg]', form).textContent = '';
  form.order.value = order;
  if (location.search && !order) history.replaceState(null, '', location.pathname);
  if (focus) (order ? form.phone : form.order).focus({ preventScroll: true });
}

/** Open one order: instant from the list's copy, then live. */
function open(no, phone, { push = false } = {}) {
  const cached = cache.get(no);
  if (push) history.pushState(null, '', `?order=${encodeURIComponent(no)}`);
  if (!cached) {
    showForm({ order: no, focus: false });
    $('[data-track-form]').phone.value = phone;
    return lookup(no, phone);
  }
  current = { no, phone, data: cached };
  render(cached);
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  startLive();
  lookup(no, phone, { quiet: true });
}

async function lookup(no, phone, { quiet = false } = {}) {
  const form = $('[data-track-form]');
  const msg = $('[data-form-msg]', form);
  const btn = $('button[type="submit"]', form);
  if (!quiet) {
    btn.classList.add('is-busy');
    msg.classList.remove('is-error');
    msg.textContent = L('نبحث…', 'Looking…');
  }
  try {
    const api = await publicApi();
    const o = await api.trackOrder(no, phone);
    if (!o) {
      if (quiet) return;
      if (phoneFor(no) === phone) forgetOrder(no); // saved earlier but the shop removed it
      if (form.hidden) showForm({ order: no });
      msg.textContent = L('ما لقينا طلب بهالرقم والجوال. تأكد منهم وجرّب مرة ثانية.', 'No order matches that number and mobile. Check both and try again.');
      msg.classList.add('is-error');
      return;
    }
    if (quiet && current?.no !== no) return; // the shopper moved on while this was loading
    const changed = current?.data && current.data.status !== o.status;
    const first = Boolean(o.id) && current?.data?.id !== o.id;
    current = { no, phone, data: o };
    cache.set(o.order_no, o);
    msg.textContent = '';
    render(o);
    if (changed) {
      toast(L(`تحديث: ${t(statusOf(o.status))}`, `Update: ${t(statusOf(o.status))}`));
      if (!reduceMotion) gsap.fromTo('.track-status span', { scale: 0.7 }, { scale: 1, ease: 'back.out(3)', duration: 0.6 });
    }
    if (quiet && first) startLive();
    if (!quiet) {
      rememberOrder(o.order_no, phone, o.created_at);
      history.replaceState(null, '', `?order=${encodeURIComponent(o.order_no)}`);
      if (!reduceMotion) gsap.from('.track-card > *', { y: 24, opacity: 0, stagger: 0.05, duration: 0.6, ease: 'power3.out' });
      startLive();
    }
  } catch (e) {
    console.error(e);
    if (!quiet) {
      if (form.hidden) showForm({ order: no });
      msg.textContent = L('صار خطأ بالاتصال — جرّب بعد شوي.', 'Connection problem — try again in a moment.');
      msg.classList.add('is-error');
    }
  } finally {
    btn.classList.remove('is-busy');
  }
}

/**
 * Live status: the database pings the order's Realtime topic on every change (and when the courier
 * moves), so the page refetches at once. Demo mode hears the same browser's changes. A slow poll
 * stays on as a safety net.
 */
let pingTimer = null;
async function startLive() {
  clearTimeout(timer);
  stopLive?.();
  const api = await publicApi();
  if (!current) return;
  const refresh = () => {
    clearTimeout(pingTimer);
    pingTimer = setTimeout(() => current && lookup(current.no, current.phone, { quiet: true }), 250);
  };
  stopLive = api.watchTopic && current.data?.id ? api.watchTopic(`order:${current.data.id}`, refresh) : api.onChange?.((c) => c.table !== 'subscribers' && refresh());
  // Safety net: every 15 s while a courier is on the way (live map), otherwise every 30 s.
  const tick = () => {
    if (!document.hidden && current) lookup(current.no, current.phone, { quiet: true });
    timer = setTimeout(tick, current?.data?.driver ? 15_000 : 30_000);
  };
  timer = setTimeout(tick, current?.data?.driver ? 15_000 : 30_000);
}

async function unsubscribe(token) {
  const box = $('[data-unsub]');
  box.hidden = false;
  $('[data-track-form]').hidden = true;
  $('[data-unsub-go]').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    b.classList.add('is-busy');
    try {
      const api = await publicApi();
      await api.unsubscribe(token);
      $('[data-unsub-title]').textContent = L('تم — ما راح نزعجك.', 'Done — you won’t hear from us.');
      $('[data-unsub-text]').textContent = L('لو غيّرت رأيك، الاشتراك من أسفل أي صفحة.', 'Changed your mind? Join again from the footer of any page.');
      b.remove();
    } catch {
      b.classList.remove('is-busy');
      toast(L('صار خطأ — جرّب مرة ثانية.', 'Something went wrong — try again.'));
    }
  });
}

boot({
  setup() {
    const form = $('[data-track-form]');
    if (params.get('unsubscribe')) {
      unsubscribe(params.get('unsubscribe'));
      return;
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = form.checkValidity();
      [form.order, form.phone].forEach((i) => i.closest('.field').classList.toggle('is-invalid', !i.checkValidity()));
      if (!ok) {
        $('[data-form-msg]', form).textContent = L('اكتب رقم الطلب ورقم الجوال', 'Enter the order number and mobile');
        $('[data-form-msg]', form).classList.add('is-error');
        return;
      }
      lookup(form.order.value.trim(), form.phone.value.trim());
    });
    $('[data-track-result]').addEventListener('click', async (e) => {
      const c = e.target.closest('[data-copy]');
      if (c) {
        try {
          await navigator.clipboard.writeText(c.dataset.copy);
          toast(L('انسخ رقم الشحنة ✓', 'Tracking number copied ✓'));
        } catch {
          /* ignore */
        }
      }
      if (e.target.closest('[data-another]')) savedOrders().length > 1 ? showList() : showForm();
    });
    $('[data-track-mine]').addEventListener('click', (e) => {
      const card = e.target.closest('[data-open]');
      if (card) {
        const no = card.dataset.open;
        open(no, phoneFor(no), { push: true });
      }
      if (e.target.closest('[data-track-other]')) showForm();
      if (e.target.closest('[data-forget-all]') && confirm(L('نمسح طلباتك المحفوظة من هذا الجهاز؟ تقدر تتابعها بعدين برقم الطلب والجوال.', 'Remove your saved orders from this device? You can still track them with the order number and mobile.'))) {
        forgetAll();
        cache.clear();
        showForm();
      }
    });
    $('[data-show-mine]').addEventListener('click', () => showList());

    // The URL decides: ?order=… opens it (no questions if this device knows the mobile), else the saved list.
    const route = () => {
      const no = (new URLSearchParams(location.search).get('order') || new URLSearchParams(location.search).get('o') || '').trim();
      const phone = no && phoneFor(no);
      if (no && phone) return open(no.toUpperCase(), phone);
      if (no) return showForm({ order: no.toUpperCase() });
      if (savedOrders().length) return showList();
      return showForm({ focus: false });
    };
    window.addEventListener('popstate', route);
    route();

    window.addEventListener('langchange', () => {
      if (current?.data) render(current.data);
      else if (!$('[data-track-mine]').hidden) showList();
    });
    // Back on the tab (or back online): catch up at once instead of waiting for the next ping.
    const catchUp = () => {
      if (document.hidden) return;
      if (current) lookup(current.no, current.phone, { quiet: true });
      else if (!$('[data-track-mine]').hidden) showList();
    };
    document.addEventListener('visibilitychange', catchUp);
    window.addEventListener('online', catchUp);
  },
  intro() {
    if (reduceMotion) return;
    gsap.from('.track-title', { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out' });
    gsap.from('.track-form, .track-unsub', { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.2 });
  },
});
