/**
 * ZOOOT Delivery — the couriers' app.
 * One screen, big buttons: see what to deliver, message/call the customer with a
 * ready-made message, start the delivery (live location + ETA for the customer),
 * mark it delivered and record the cash collected.
 */
import '@fontsource-variable/kufam/wght.css';
import '@fontsource/lalezar/400.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import '@fontsource/archivo-black/400.css';
import '@fontsource-variable/archivo/wdth.css';
import '../styles/base.css';
import '../styles/admin.css';
import '../styles/courier.css';

import { courierBackend, MODE } from '../js/backend/courier.js';
import { SITE_URL } from '../js/backend/config.js';
import { waNumber } from '../js/backend/model.js';
import { bad, chime, errorText, esc, icon, L, lang, money, ok, setLang, toast, tr } from '../admin/ui.js';

const state = { api: null, me: null, orders: [], tab: null, busy: new Set(), loaded: false };
const root = () => document.getElementById('root');

/* ------------------------------------------------------------------ helpers */
// Customers get the shop's domain (this app's own address in demo mode).
const siteRoot = () => (MODE === 'supabase' ? `${SITE_URL}/` : new URL('../', location.href.split('#')[0]).href);
const trackUrl = (o) => `${siteRoot()}track.html?order=${encodeURIComponent(o.order_no)}`;
const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const time = (iso) => (iso ? new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-SA-u-nu-latn-ca-gregory', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : '');
const minsLeft = (iso) => Math.round((Date.parse(iso) - Date.now()) / 60000);

/** The message the courier sends — in the customer's language. */
function customerMessage(o) {
  const me = state.me?.name || L('مندوب زوووط', 'the ZOOOT courier');
  const hi = firstName(o.customer_name);
  return o.lang === 'en'
    ? `Hello ${hi}, my name is ${me} from zooot.shop 👋\nYour order ${o.order_no} is on its way 🚚 Track it here: ${trackUrl(o)}\n\nPlease send your national address or your location, along with your villa/apartment/building number.\nPlease keep your phone available. Thank you!`
    : `مرحبًا ${hi}، معك ${me} من zooot.shop 👋\nطلبك رقم ${o.order_no} في الطريق إليك 🚚 تقدر تتابعه من هنا: ${trackUrl(o)}\n\nفضلًا أرسل عنوانك الوطني أو موقعك، مع رقم الفيلا/الشقة/المبنى.\nوخلّ جوالك متاح. شكرًا!`;
}
const waLink = (o) => `https://wa.me/${waNumber(o.customer_phone)}?text=${encodeURIComponent(customerMessage(o))}`;
const smsLink = (o) => `sms:${o.customer_phone.replace(/\s/g, '')}?&body=${encodeURIComponent(customerMessage(o))}`;
function mapLink(o) {
  const pinned = String(o.delivery_location || '').match(/https?:\/\/\S+/);
  if (pinned) return pinned[0];
  const q = [o.address, o.district, o.city, L('السعودية', 'Saudi Arabia')].filter(Boolean).join('، ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/* ------------------------------------------------------------------ bottom sheet */
/** A big-button bottom sheet. Resolves with the chosen button's value (or null). */
function sheet({ title, body = '', buttons = [], form = false }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'sheet';
    d.innerHTML = `<form method="dialog" class="sheet-in" ${form ? 'novalidate' : ''}>
      <div class="sheet-grip" aria-hidden="true"></div>
      <h2>${esc(title)}</h2>
      ${body}
      <div class="sheet-btns">${buttons
        .map((b, i) =>
          b.href
            ? `<a class="b ${b.cls || ''}" href="${esc(b.href)}" target="_blank" rel="noopener" data-i="${i}">${b.icon ? icon(b.icon) : ''}${esc(b.label)}</a>`
            : `<button class="b ${b.cls || ''}" type="${b.submit ? 'submit' : 'button'}" data-i="${i}">${b.icon ? icon(b.icon) : ''}${esc(b.label)}</button>`,
        )
        .join('')}</div>
    </form>`;
    document.body.append(d);
    const f = d.querySelector('form');
    let out = null;
    const done = (b) => {
      out = b && b.value !== undefined ? { value: b.value, data: Object.fromEntries(new FormData(f)) } : null;
      d.close();
    };
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!f.checkValidity()) return f.reportValidity();
      done(buttons.find((b) => b.submit));
    });
    f.addEventListener('click', (e) => {
      const el = e.target.closest('[data-i]');
      if (!el || el.type === 'submit') return;
      const b = buttons[Number(el.dataset.i)];
      if (b.href) setTimeout(() => done(b), 50);
      else done(b);
    });
    d.addEventListener('click', (e) => e.target === d && done(null));
    d.addEventListener('close', () => {
      resolve(out);
      d.remove();
    });
    d.showModal();
  });
}

/* ------------------------------------------------------------------ live location */
const loc = { watch: null, state: 'off', last: null, sentAt: 0, wake: null, accuracy: null };
const meters = (a, b) => {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !loc.wake) loc.wake = await navigator.wakeLock.request('screen');
    if (!on && loc.wake) {
      await loc.wake.release();
      loc.wake = null;
    }
  } catch {
    loc.wake = null;
  }
}

function startSharing() {
  if (loc.watch !== null) return;
  if (!('geolocation' in navigator)) {
    loc.state = 'unsupported';
    return paintPill();
  }
  loc.state = 'waiting';
  paintPill();
  loc.watch = navigator.geolocation.watchPosition(
    async (p) => {
      const here = { lat: p.coords.latitude, lng: p.coords.longitude };
      loc.accuracy = p.coords.accuracy;
      loc.state = 'on';
      paintPill();
      // Send when it moved ~40 m or every 15 s — enough for a smooth map, light on battery.
      if (!loc.last || meters(loc.last, here) > 40 || Date.now() - loc.sentAt > 15000) {
        loc.last = here;
        loc.sentAt = Date.now();
        try {
          await state.api.ping({ ...here, accuracy: p.coords.accuracy, heading: p.coords.heading, speed: p.coords.speed });
        } catch (e) {
          console.warn('ping', e);
        }
      }
    },
    (e) => {
      loc.state = e.code === 1 ? 'denied' : 'weak';
      paintPill();
      if (e.code === 1) stopSharing('denied');
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
  );
  keepAwake(true);
}

function stopSharing(why = 'off') {
  if (loc.watch !== null) navigator.geolocation.clearWatch(loc.watch);
  loc.watch = null;
  loc.state = why;
  keepAwake(false);
  paintPill();
}

/** Share location exactly while something is out for delivery. */
function syncSharing() {
  const active = state.orders.some((o) => o.mine && o.status === 'shipped');
  if (active && loc.watch === null && loc.state !== 'denied') startSharing();
  if (!active && loc.watch !== null) stopSharing();
  paintPill();
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && loc.watch !== null) keepAwake(true);
});

function pillHTML() {
  const active = state.orders.some((o) => o.mine && o.status === 'shipped');
  if (!active) return `<span class="pill">${icon('pin')}${esc(L('الموقع يتفعّل لما تبدأ توصيل', 'Location turns on when you start a delivery'))}</span>`;
  switch (loc.state) {
    case 'on':
      return `<span class="pill on">${icon('pin')}${esc(L('موقعك ظاهر للعميل الحين', 'Customers can see you live'))}</span>`;
    case 'denied':
      return `<button type="button" class="pill bad" data-loc-help>${icon('pin')}${esc(L('الموقع مقفل — العميل يشوف الوقت المتوقع بس. اضغط للمساعدة', 'Location is off — customers only see the ETA. Tap for help'))}</button>`;
    case 'unsupported':
      return `<span class="pill bad">${icon('pin')}${esc(L('جهازك ما يدعم الموقع — العميل يشوف الوقت المتوقع', 'No location on this device — customers see the ETA'))}</span>`;
    case 'weak':
      return `<span class="pill warn">${icon('pin')}${esc(L('نبحث عن إشارة الموقع…', 'Looking for a GPS signal…'))}</span>`;
    default:
      return `<span class="pill warn">${icon('pin')}${esc(L('نشغّل الموقع…', 'Turning on location…'))}</span>`;
  }
}
const paintPill = () => {
  const el = document.querySelector('[data-pill]');
  if (el) el.innerHTML = pillHTML();
};

/* ------------------------------------------------------------------ data */
let prevReady = null;
async function refresh({ quiet = false } = {}) {
  try {
    const list = await state.api.orders();
    const ready = list.filter((o) => !o.courier_id && ['confirmed', 'preparing'].includes(o.status)).length;
    if (prevReady !== null && ready > prevReady) {
      toast(L('فيه طلب جديد جاهز للتوصيل', 'A new order is ready to deliver'), { tone: 'new' });
      chime();
      navigator.vibrate?.([120, 60, 120]);
    }
    prevReady = ready;
    state.orders = list;
    state.loaded = true;
    syncSharing();
    paint();
  } catch (e) {
    if (!quiet) bad(e);
    if (String(e.message).startsWith('not_courier')) location.reload();
  }
}

async function act(o, action, opts = {}, okMsg) {
  if (state.busy.has(o.id)) return null;
  state.busy.add(o.id);
  paint();
  try {
    const out = await state.api.act(o.id, action, opts);
    if (okMsg) ok(okMsg);
    await refresh({ quiet: true });
    return out;
  } catch (e) {
    bad(e);
    return null;
  } finally {
    state.busy.delete(o.id);
    paint();
  }
}

/* ------------------------------------------------------------------ flows */
async function askEta(o, title) {
  const choices = [15, 30, 45, 60, 90];
  const r = await sheet({
    title,
    body: `<p class="muted">${esc(L('العميل يشوف هذا الوقت في صفحة التتبّع (ويشوف موقعك المباشر لو مفعّل).', 'The customer sees this on their tracking page (and your live location when it’s on).'))}</p>`,
    buttons: [
      ...choices.map((m) => ({ label: m < 60 ? L(`${m} دقيقة`, `${m} min`) : m === 60 ? L('ساعة', '1 hour') : L('ساعة ونص', '1½ hours'), value: m, cls: m === 30 ? 'b-primary' : '' })),
      { label: L('رجوع', 'Back'), value: undefined, cls: 'b-ghost' },
    ],
  });
  return r ? new Date(Date.now() + Number(r.value) * 60000).toISOString() : null;
}

async function start(o) {
  const eta = await askEta(o, L(`متى توصل لـ ${firstName(o.customer_name)} تقريبًا؟`, `When will you reach ${firstName(o.customer_name)}?`));
  if (!eta) return;
  const done = await act(o, 'start', { eta }, L('انطلقت! أرسل للعميل رسالة واتساب', 'You’re off! Send the customer a WhatsApp'));
  if (!done) return;
  state.tab = 'go';
  paint();
  // Straight to the message — the single most useful next step.
  const fresh = state.orders.find((x) => x.id === o.id) || o;
  await sheet({
    title: L('أرسل للعميل الحين؟', 'Message the customer now?'),
    body: `<pre class="msg-preview" dir="auto">${esc(customerMessage(fresh))}</pre>`,
    buttons: [
      { label: L('أرسل واتساب', 'Send on WhatsApp'), href: waLink(fresh), cls: 'b-wa big', icon: 'wa', value: 'wa' },
      { label: L('لاحقًا', 'Later'), value: undefined, cls: 'b-ghost' },
    ],
  });
}

async function deliver(o) {
  const due = Number(o.balance) || 0;
  const r = await sheet({
    title: L(`تسليم ${o.order_no}`, `Deliver ${o.order_no}`),
    body: due
      ? `<p class="due-big">${esc(L('المطلوب تحصيله', 'To collect'))}<b>${esc(money(due))}</b></p>`
      : `<p class="muted">${esc(L('الطلب مدفوع — ما فيه تحصيل.', 'Already paid — nothing to collect.'))}</p>`,
    buttons: due
      ? [
          { label: L(`استلمت ${money(due)} كاش`, `Collected ${money(due)} cash`), value: 'cash', cls: 'b-primary big', icon: 'cash' },
          { label: L('سلّمت بدون تحصيل', 'Delivered, nothing collected'), value: 'none', cls: '' },
          { label: L('رجوع', 'Back'), value: undefined, cls: 'b-ghost' },
        ]
      : [
          { label: L('تأكيد التسليم', 'Confirm delivery'), value: 'none', cls: 'b-primary big', icon: 'check' },
          { label: L('رجوع', 'Back'), value: undefined, cls: 'b-ghost' },
        ],
  });
  if (!r) return;
  await act(o, 'delivered', { collected: r.value === 'cash' ? due : null }, L('تم التسليم ✦ يعطيك العافية', 'Delivered ✦ nice one'));
}

async function more(o) {
  const r = await sheet({
    title: o.order_no,
    buttons: [
      { label: L('تعديل وقت الوصول', 'Change the ETA'), value: 'eta', icon: 'clock' },
      { label: L('حفظ موقع/عنوان العميل', 'Save the customer’s location'), value: 'location', icon: 'pin' },
      { label: L('ملاحظة للمتجر', 'Note for the shop'), value: 'note', icon: 'note' },
      { label: L('إرجاع الطلب للمتجر', 'Hand the order back'), value: 'release', icon: 'refresh', cls: 'b-danger' },
      { label: L('رجوع', 'Back'), value: undefined, cls: 'b-ghost' },
    ],
  });
  if (!r) return;
  if (r.value === 'eta') {
    const eta = await askEta(o, L('وقت الوصول الجديد', 'New arrival time'));
    if (eta) act(o, 'eta', { eta }, L('تحدّث الوقت المتوقع', 'ETA updated'));
  } else if (r.value === 'location' || r.value === 'note') {
    const isLoc = r.value === 'location';
    const t = await sheet({
      title: isLoc ? L('موقع العميل', 'Customer location') : L('ملاحظة للمتجر', 'Note for the shop'),
      form: true,
      body: `<label class="f"><span>${esc(isLoc ? L('الصق رابط الموقع أو العنوان الوطني اللي أرسله العميل', 'Paste the location link or national address the customer sent') : L('مثال: العميل طلب التوصيل بعد العصر', 'e.g. customer asked for after 4 pm'))}</span>
        <textarea name="text" rows="3" required dir="auto">${esc(isLoc ? o.delivery_location || '' : '')}</textarea></label>`,
      buttons: [
        { label: L('حفظ', 'Save'), value: 'ok', cls: 'b-primary big', submit: true },
        { label: L('رجوع', 'Back'), value: undefined, cls: 'b-ghost' },
      ],
    });
    if (t) act(o, r.value, { text: t.data.text }, L('انحفظ', 'Saved'));
  } else if (r.value === 'release') {
    const c = await sheet({
      title: L('ترجع الطلب للمتجر؟', 'Hand this order back?'),
      body: `<p class="muted">${esc(L('بيرجع جاهز لمندوب ثاني.', 'It goes back to the ready list for another courier.'))}</p>`,
      buttons: [
        { label: L('إي، أرجعه', 'Yes, hand it back'), value: 'ok', cls: 'b-dark big' },
        { label: L('رجوع', 'Back'), value: undefined, cls: 'b-ghost' },
      ],
    });
    if (c) act(o, 'release', {}, L('رجع الطلب للمتجر', 'Order handed back'));
  }
}

async function profile() {
  const r = await sheet({
    title: L('حسابي', 'My account'),
    form: true,
    body: `<label class="f"><span>${esc(L('اسمك (يظهر للعميل في الرسالة وصفحة التتبّع)', 'Your name (customers see it in messages and tracking)'))}</span><input name="name" required value="${esc(state.me.name || '')}"></label>
      <label class="f"><span>${esc(L('جوالك', 'Your mobile'))}</span><input name="phone" dir="ltr" inputmode="tel" value="${esc(state.me.phone || '')}"></label>
      <p class="muted" style="font-size:13px" dir="ltr">${esc(state.me.email)}</p>`,
    buttons: [
      { label: L('حفظ', 'Save'), value: 'save', cls: 'b-primary big', submit: true },
      { label: lang === 'en' ? 'عربي' : 'English', value: 'lang', icon: 'globe' },
      { label: L('تسجيل الخروج', 'Sign out'), value: 'out', icon: 'logout', cls: 'b-danger' },
    ],
  });
  if (!r) return;
  if (r.value === 'save') {
    try {
      state.me = await state.api.me({ name: r.data.name, phone: r.data.phone });
      ok(L('انحفظ', 'Saved'));
      paint();
    } catch (e) {
      bad(e);
    }
  } else if (r.value === 'lang') {
    setLang(lang === 'en' ? 'ar' : 'en');
    location.reload();
  } else if (r.value === 'out') {
    stopSharing();
    await state.api.auth.signOut();
    location.reload();
  }
}

/* ------------------------------------------------------------------ render */
function groups() {
  const go = state.orders.filter((o) => o.mine && o.status === 'shipped');
  const ready = state.orders.filter((o) => ['confirmed', 'preparing'].includes(o.status));
  const done = state.orders.filter((o) => o.mine && o.status === 'delivered').reverse();
  return { go, ready, done };
}

function itemsLine(o) {
  return o.items.map((it) => `${tr(it.name)}${it.qty > 1 ? ` ×${it.qty}` : ''}`).join('، ');
}

function card(o) {
  const busy = state.busy.has(o.id);
  const due = Number(o.balance) || 0;
  const where = [o.city, o.district].filter(Boolean).join(' · ');
  const etaMin = o.delivery_eta ? minsLeft(o.delivery_eta) : null;
  const head = `<div class="c-head"><span class="c-no">${esc(o.order_no)}</span>${
    o.status === 'shipped' && o.delivery_eta
      ? `<span class="c-eta ${etaMin < 0 ? 'late' : ''}">${icon('clock')}${esc(time(o.delivery_eta))}${etaMin >= 0 ? ` · ${esc(L(`${etaMin} د`, `${etaMin}m`))}` : ` · ${esc(L('متأخر', 'late'))}`}</span>`
      : o.status === 'delivered'
        ? `<span class="c-eta done">${icon('check')}${esc(time(o.delivered_at))}</span>`
        : `<span class="c-eta">${esc(o.status === 'preparing' ? L('قيد التجهيز', 'Preparing') : L('مؤكد', 'Confirmed'))}</span>`
  }</div>`;
  const who = `<div class="c-who"><strong>${esc(o.customer_name)}</strong><a href="tel:${esc(o.customer_phone)}" dir="ltr">${esc(o.customer_phone)}</a></div>
    <div class="c-addr">${icon('pin')}<div>${where ? `<b>${esc(where)}</b>` : ''}${o.address ? `<span>${esc(o.address)}</span>` : ''}${o.delivery_location ? `<span class="c-pinned">${esc(L('موقع العميل:', 'Customer location:'))} ${esc(o.delivery_location)}</span>` : ''}</div></div>
    ${o.customer_note ? `<p class="c-note">${icon('note')}${esc(o.customer_note)}</p>` : ''}
    <p class="c-items">${icon('box')}${esc(itemsLine(o))}</p>`;
  const money_ = due ? `<p class="c-due">${icon('cash')}${esc(L('حصّل', 'Collect'))} <b>${esc(money(due))}</b> <small>${esc(L('كاش', 'cash'))}</small></p>` : `<p class="c-paid">${icon('check')}${esc(L('مدفوع — لا تحصّل شي', 'Paid — collect nothing'))}</p>`;

  if (o.status === 'delivered') {
    return `<article class="c-card is-done">${head}<div class="c-who"><strong>${esc(o.customer_name)}</strong></div><p class="c-items">${esc(where)}</p></article>`;
  }
  const contact = `<div class="c-contact">
      <a class="b b-wa big" href="${esc(waLink(o))}" target="_blank" rel="noopener">${icon('wa')}${esc(L('واتساب العميل', 'WhatsApp customer'))}</a>
      <div class="c-row">
        <a class="b" href="tel:${esc(o.customer_phone)}">${icon('phone')}${esc(L('اتصال', 'Call'))}</a>
        <a class="b" href="${esc(smsLink(o))}">${icon('sms')}${esc(L('رسالة', 'SMS'))}</a>
        <a class="b" href="${esc(mapLink(o))}" target="_blank" rel="noopener">${icon('map')}${esc(L('الخريطة', 'Map'))}</a>
      </div>
    </div>`;
  if (o.status === 'shipped') {
    return `<article class="c-card is-go ${busy ? 'is-busy' : ''}" data-id="${esc(o.id)}">${head}${who}${money_}${contact}
      <button class="b b-primary big" type="button" data-deliver>${icon('check')}${esc(L('تم التسليم', 'Delivered'))}</button>
      <button class="b b-ghost c-more" type="button" data-more>${icon('more')}${esc(L('خيارات أكثر', 'More options'))}</button>
    </article>`;
  }
  return `<article class="c-card ${busy ? 'is-busy' : ''}" data-id="${esc(o.id)}">${head}${who}${money_}
    <button class="b b-dark big" type="button" data-start>${icon('truck')}${esc(o.mine ? L('ابدأ التوصيل', 'Start delivery') : L('أنا بوصّله — ابدأ', 'I’ll take it — start'))}</button>
    <div class="c-row">
      <a class="b" href="tel:${esc(o.customer_phone)}">${icon('phone')}${esc(L('اتصال', 'Call'))}</a>
      <a class="b" href="${esc(mapLink(o))}" target="_blank" rel="noopener">${icon('map')}${esc(L('الخريطة', 'Map'))}</a>
    </div>
  </article>`;
}

function paint() {
  const host = root();
  if (!host || !state.me) return;
  const g = groups();
  // Open on whatever needs attention: deliveries on the way, else the ready list.
  if (!state.tab && state.loaded) state.tab = g.go.length ? 'go' : 'ready';
  const tab = state.tab || 'go';
  const list = g[tab];
  const empty = {
    go: [L('ما عندك توصيلات بالطريق.', 'Nothing out for delivery.'), L('ابدأ وحدة من «جاهزة».', 'Start one from “Ready”.')],
    ready: [L('ما فيه طلبات جاهزة الحين.', 'No orders ready right now.'), L('بنبهك أول ما يجهز طلب.', 'We’ll ping you when one is.')],
    done: [L('ما سلّمت شي اليوم للحين.', 'Nothing delivered yet today.'), ''],
  }[tab];
  const collected = g.done.length;
  const scroll = window.scrollY;
  host.className = 'c-app';
  host.removeAttribute('aria-busy');
  host.innerHTML = `
    <header class="c-top">
      <div class="c-brand"><svg aria-hidden="true"><use href="#zooot-logo"/></svg><span class="hq-pill">GO</span></div>
      <button class="c-me" type="button" data-profile aria-label="${esc(L('حسابي', 'My account'))}">${icon('user')}<span>${esc(firstName(state.me.name) || L('حسابي', 'Account'))}</span></button>
    </header>
    <div class="c-pill" data-pill>${pillHTML()}</div>
    ${MODE === 'demo' ? `<p class="c-demo">${esc(L('وضع تجريبي — الطلبات من هذا المتصفح فقط', 'Demo mode — orders from this browser only'))}</p>` : ''}
    <nav class="c-tabs" role="tablist">
      ${[
        ['go', L('بالطريق', 'On the way'), g.go.length],
        ['ready', L('جاهزة', 'Ready'), g.ready.length],
        ['done', L('تمت اليوم', 'Done today'), collected],
      ]
        .map(([id, label, n]) => `<button type="button" role="tab" aria-selected="${tab === id}" data-tab="${id}">${esc(label)}<b>${n}</b></button>`)
        .join('')}
    </nav>
    <main class="c-list">
      ${
        !state.loaded
          ? `<div class="c-empty">${esc(L('نحمّل الطلبات…', 'Loading orders…'))}</div>`
          : list.length
            ? list.map(card).join('')
            : `<div class="c-empty"><svg class="logo" aria-hidden="true"><use href="#zooot-logo"/></svg><p><b>${esc(empty[0])}</b><br>${esc(empty[1])}</p></div>`
      }
    </main>`;
  window.scrollTo(0, scroll);
}

function bind() {
  root().addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) {
      state.tab = t.dataset.tab;
      window.scrollTo(0, 0);
      return paint();
    }
    if (e.target.closest('[data-profile]')) return profile();
    if (e.target.closest('[data-loc-help]')) {
      return sheet({
        title: L('فعّل الموقع', 'Turn on location'),
        body: `<p>${esc(L('افتح إعدادات الجوال ← المتصفح (أو التطبيق) ← الموقع ← اسمح. بعدها ارجع هنا واضغط «جرّب مرة ثانية».', 'Open your phone settings → browser (or this app) → Location → Allow. Then come back and tap “Try again”.'))}</p>`,
        buttons: [
          { label: L('جرّب مرة ثانية', 'Try again'), value: 'retry', cls: 'b-primary big' },
          { label: L('رجوع', 'Back'), value: undefined, cls: 'b-ghost' },
        ],
      }).then((r) => {
        if (r?.value === 'retry') {
          loc.state = 'off';
          syncSharing();
        }
      });
    }
    const cardEl = e.target.closest('.c-card[data-id]');
    if (!cardEl) return;
    const o = state.orders.find((x) => x.id === cardEl.dataset.id);
    if (!o) return;
    if (e.target.closest('[data-start]')) start(o);
    else if (e.target.closest('[data-deliver]')) deliver(o);
    else if (e.target.closest('[data-more]')) more(o);
  });
}

/* ------------------------------------------------------------------ login */
function renderLogin() {
  const host = root();
  host.className = 'c-login';
  host.removeAttribute('aria-busy');
  host.innerHTML = `
    <form class="c-login-card" novalidate>
      <div class="c-brand big"><svg aria-hidden="true"><use href="#zooot-logo"/></svg><span class="hq-pill">GO</span></div>
      <h1>${esc(L('تطبيق مندوب زوووط', 'ZOOOT Delivery'))}</h1>
      <p class="muted">${esc(L('سجّل دخولك عشان تشوف طلباتك.', 'Sign in to see your deliveries.'))}</p>
      <label class="f"><span>${esc(L('البريد', 'Email'))}</span><input name="email" type="email" inputmode="email" autocomplete="username" dir="ltr" required></label>
      <label class="f"><span>${esc(L('كلمة المرور', 'Password'))}</span><input name="password" type="password" autocomplete="current-password" dir="ltr" required></label>
      <p class="login-err" role="alert"></p>
      <button class="b b-primary big" type="submit">${icon('truck')}${esc(L('دخول', 'Sign in'))}</button>
      <button class="b b-ghost" type="button" data-lang>${icon('globe')}${lang === 'en' ? 'عربي' : 'English'}</button>
      ${MODE === 'demo' ? `<p class="mode-note">${icon('lock')}<span>${esc(L('وضع تجريبي: الطلبات من هذا المتصفح فقط. بعد ربط Supabase يدخل كل مندوب بحسابه.', 'Demo mode: orders come from this browser only. Once Supabase is connected each courier signs in with their own account.'))}</span></p>` : ''}
    </form>`;
  const f = host.querySelector('form');
  const err = f.querySelector('.login-err');
  f.querySelector('[data-lang]').onclick = () => {
    setLang(lang === 'en' ? 'ar' : 'en');
    renderLogin();
  };
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    if (!f.checkValidity()) {
      err.textContent = L('اكتب البريد وكلمة المرور', 'Enter your email and password');
      return;
    }
    const btn = f.querySelector('[type=submit]');
    btn.classList.add('is-busy');
    try {
      state.me = await state.api.auth.signIn(f.email.value, f.password.value, { remember: true });
      enter();
    } catch (ex) {
      btn.classList.remove('is-busy');
      err.textContent = ex.message === 'not_courier' ? L('هذا الحساب مو مسجّل كمندوب — كلّم المتجر', 'This account isn’t a courier — ask the shop') : errorText(ex);
    }
  });
  f.email.focus();
}

/* ------------------------------------------------------------------ boot */
let pollTimer = null;
let stopLive = null;
function enter() {
  paint();
  refresh();
  stopLive?.();
  stopLive = state.api.live?.((c) => ['orders', 'payments', '*'].includes(c.table) && refresh({ quiet: true }));
  clearInterval(pollTimer);
  pollTimer = setInterval(() => !document.hidden && refresh({ quiet: true }), 20000);
  document.addEventListener('visibilitychange', () => !document.hidden && refresh({ quiet: true }));
  // Keep ETAs ("12 min") fresh.
  setInterval(() => !document.hidden && paint(), 60000);
}

async function main() {
  setLang(lang);
  document.title = L('تطبيق المندوب — زوووط', 'ZOOOT Delivery');
  state.api = await courierBackend();
  bind();
  state.me = await state.api.auth.session().catch(() => null);
  if (state.me) enter();
  else renderLogin();
}

if ('serviceWorker' in navigator && !import.meta.env.DEV) navigator.serviceWorker.register('./sw.js').catch(() => {});

main().catch((e) => {
  console.error(e);
  bad(e);
});

