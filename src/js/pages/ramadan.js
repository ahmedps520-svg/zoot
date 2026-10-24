/**
 * Ramadan envelope page (ramadan.html?k=<key>): the QR in the envelope carries the coupon's
 * secret key. Before 1 Ramadan it shows a live countdown ("Excited? We are too!"); at zero the
 * server hands out the code. The clock is the database's, so changing the phone's time won't help.
 */
import '@fontsource/aref-ruqaa/700.css';
import { boot } from '../main.js';
import '../../styles/ramadan.css';
import { gsap, reduceMotion } from '../core/motion.js';
import { $, esc, toast } from '../core/ui.js';
import { formatPrice, getLang } from '../core/i18n.js';
import { publicApi } from '../backend/public.js';
import { couponLabel, saveCoupon } from '../core/coupon.js';

const L = (ar, en) => (getLang() === 'en' ? en : ar);
const KEY_STORE = 'zooot-ramadan-key';
const C = { ink: '#0D0D0D', yellow: '#FFD21F', red: '#F2542D', teal: '#0B3B3B', white: '#FFFFFF' };

let key = '';
let info = null; // last coupon_reveal answer
let offset = 0; // server clock − this device's clock (ms)
let tickTimer = null;
let celebrated = false;

function readKey() {
  const fromUrl = new URLSearchParams(location.search).get('k') || '';
  try {
    if (fromUrl) localStorage.setItem(KEY_STORE, fromUrl);
    return fromUrl || localStorage.getItem(KEY_STORE) || '';
  } catch {
    return fromUrl;
  }
}

async function fetchInfo() {
  const api = await publicApi();
  const t0 = Date.now();
  const r = await api.revealCoupon(key);
  const t1 = Date.now();
  if (r?.now) offset = Date.parse(r.now) - (t0 + t1) / 2;
  return r;
}
const serverNow = () => Date.now() + offset;

/* ------------------------------------------------------------------ poster pieces */
/** Hand-painted sign: Ruqaa word in a yellow oval, black shadow + white keyline (as on the card). */
function ovalSVG(word) {
  const layer = (dx, dy, fill, stroke, sw, order = '') =>
    `<text x="${450 + dx}" y="${226 + dy}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${order}>${esc(word)}</text>`;
  return `<svg class="rmd-oval" viewBox="0 0 900 360" role="img" aria-label="${esc(word)}">
    <g transform="rotate(-4 450 180)">
      <ellipse cx="462" cy="194" rx="428" ry="160" fill="${C.ink}"/>
      <ellipse cx="450" cy="180" rx="428" ry="160" fill="${C.yellow}" stroke="${C.teal}" stroke-width="12"/>
      <g class="rmd-word" font-family="'Aref Ruqaa', serif" font-weight="700" font-size="210" text-anchor="middle" direction="${getLang() === 'en' ? 'ltr' : 'rtl'}">
        ${layer(10, 12, C.ink, C.ink, 20)}${layer(0, 0, C.white, C.white, 20)}${layer(0, 0, C.red, C.ink, 7, 'paint-order="stroke"')}
      </g>
    </g>
  </svg>`;
}

/** Shrink the word until it sits inside the oval (lengths differ per state and language). */
function fitOval(root) {
  measure(root);
  document.fonts?.ready.then(() => measure(root)); // Ruqaa may still be loading on first paint
}
function measure(root) {
  root.querySelectorAll('.rmd-word').forEach((g) => {
    const t = g.querySelector('text');
    if (!t?.getComputedTextLength) return;
    const w = t.getComputedTextLength();
    const size = Math.min(210, (210 * 700) / Math.max(w, 1));
    g.setAttribute('font-size', size.toFixed(0));
    g.querySelectorAll('text').forEach((x) => x.setAttribute('y', (226 - (210 - size) * 0.3).toFixed(0)));
  });
}

function burstSVG() {
  let seed = 1448;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pts = [];
  const n = 18;
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2;
    const r = i % 2 ? 300 * (0.92 + rand() * 0.16) : 480 * (0.8 + rand() * 0.28);
    pts.push(`${(500 + r * Math.cos(a)).toFixed(1)},${(500 + r * Math.sin(a)).toFixed(1)}`);
  }
  return `<svg viewBox="0 0 1000 1000"><polygon points="${pts.join(' ')}" fill="#2350E0"/></svg>`;
}

function ticker(text) {
  const run = Array.from({ length: 6 }, () => `<span>${esc(text)} <i>·</i> ZOOOT <i>·</i></span>`).join('');
  $('[data-ticker]').innerHTML = run + run;
}

const pad = (n) => String(n).padStart(2, '0');
// Dates are the shop's (Riyadh), whatever time zone the phone is set to.
const DAY = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Riyadh' };
const longDate = (iso) => new Intl.DateTimeFormat(getLang() === 'en' ? 'en-GB' : 'ar-SA-u-nu-latn-ca-gregory', DAY).format(new Date(iso));
const hijri = (iso) => new Intl.DateTimeFormat(getLang() === 'en' ? 'en-u-ca-islamic-umalqura-nu-latn' : 'ar-SA-u-ca-islamic-umalqura-nu-latn', DAY).format(new Date(iso));
/** ends_at is exclusive (Eid 00:00): show the last day the code works. */
const lastDay = (iso) => longDate(new Date(Date.parse(iso) - 1000).toISOString());

/* ------------------------------------------------------------------ states */
function paint() {
  const body = $('[data-body]');
  clearInterval(tickTimer);
  const state = !key || !info ? 'nokey' : info.state;

  if (state === 'waiting') {
    ticker('SCAN ON RAMADAN 1ST');
    body.innerHTML = `
      <p class="rmd-line">${esc(L('متحمّس؟', 'Excited?'))}</p>
      ${ovalSVG(L('واحنا بعد!', 'We are too!'))}
      <div class="rmd-live"><i></i>LIVE · ${esc(L('العدّ لأول يوم رمضان', 'Counting down to Ramadan 1st'))}</div>
      <div class="rmd-count" role="timer" aria-label="${esc(L('الوقت المتبقي', 'Time left'))}">
        ${['d', 'h', 'm', 's']
          .map((k, i) => `<div class="rmd-cell" style="--r:${[-3, 2, -2, 3][i]}deg"><b class="num" data-${k}>--</b><small>${esc([L('يوم', 'days'), L('ساعة', 'hours'), L('دقيقة', 'min'), L('ثانية', 'sec')][i])}</small></div>`)
          .join('')}
      </div>
      <p class="rmd-note">${esc(L('خلّ الصفحة مفتوحة — أول ما يخلص العدّ تنكشف مفاجأتك هنا.', 'Keep this page open — your surprise appears here the moment it hits zero.'))}</p>
      <p class="rmd-date">${esc(hijri(info.starts_at))} · ${esc(longDate(info.starts_at))}</p>
      <a class="btn btn--ghost rmd-shop" href="shop.html"><span>${esc(L('تفرّج على المتجر', 'Browse the store'))}</span><svg aria-hidden="true"><use href="#i-arrow"/></svg></a>`;
    fitOval(body);
    tick();
    tickTimer = setInterval(tick, 250);
    return;
  }

  if (state === 'open') {
    saveCoupon(info); // checkout applies it by itself
    ticker('RAMADAN KAREEM');
    const label = couponLabel(info);
    const rules = [
      info.ends_at && L(`صالح لين ${lastDay(info.ends_at)}`, `Valid until ${lastDay(info.ends_at)}`),
      info.once_per_customer && L('مرة وحدة لكل رقم جوال', 'Once per mobile number'),
      Number(info.min_subtotal) > 0 && L(`على الطلبات من ${formatPrice(info.min_subtotal)}`, `On orders from ${formatPrice(info.min_subtotal)}`),
    ].filter(Boolean);
    body.innerHTML = `
      <p class="rmd-line">${esc(L('رمضان كريم', 'Ramadan Kareem'))}</p>
      ${ovalSVG(info.kind === 'percent' ? L(`خصم ${Number(info.value)}٪`, `${Number(info.value)}% OFF`) : label)}
      <div class="rmd-ticket">
        <span>${esc(L('كود الخصم حقّك', 'Your discount code'))}</span>
        <b class="rmd-code" dir="ltr">${esc(info.code)}</b>
        <button class="btn btn--sm" type="button" data-copy><svg aria-hidden="true"><use href="#i-check"/></svg><span>${esc(L('انسخ الكود', 'Copy code'))}</span></button>
      </div>
      <p class="rmd-note">${esc(rules.join(' · '))}</p>
      <a class="btn rmd-cta" href="shop.html"><span>${esc(L(`تسوّق بـ${label}`, `Shop with ${label}`))}</span><svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
      <p class="rmd-small">${esc(L('حفظنا الكود — يتطبق لحاله عند إتمام الطلب.', 'We saved the code — it applies by itself at checkout.'))}</p>`;
    fitOval(body);
    if (!celebrated) {
      celebrated = true;
      confetti();
    }
    return;
  }

  const msg = {
    ended: [L('انتهى العرض', 'That’s a wrap'), L('رمضان كريم', 'Ramadan Kareem'), L('شكرًا إنك معنا — تابعنا للمفاجأة الجاية.', 'Thanks for being with us — stay tuned for the next surprise.')],
    used_up: [L('سبقوك!', 'Too late!'), L('خلصت الأكواد', 'All gone'), L('خلصت أكواد هالعرض — بس المتجر ينتظرك.', 'Every code has been claimed — but the store’s still open.')],
    off: [L('العرض متوقف', 'Paused'), L('ارجع بعدين', 'Check back'), L('هالعرض متوقف حاليًا — ارجع لنا قريب.', 'This offer is paused right now — check back soon.')],
    nokey: [L('افتح الظرف', 'Open the envelope'), L('امسح الكود', 'Scan the code'), L('هذي الصفحة تنفتح بالكود اللي داخل ظرف زوووط.', 'This page opens with the QR inside your ZOOOT envelope.')],
  }[state] || [L('افتح الظرف', 'Open the envelope'), L('امسح الكود', 'Scan the code'), ''];
  ticker('RAMADAN 1448');
  body.innerHTML = `
    <p class="rmd-line">${esc(msg[0])}</p>
    ${ovalSVG(msg[1])}
    <p class="rmd-note">${esc(msg[2])}</p>
    <a class="btn rmd-cta" href="shop.html"><span>${esc(L('تسوّق الحين', 'Shop now'))}</span><svg aria-hidden="true"><use href="#i-arrow"/></svg></a>`;
  fitOval(body);
}

let opening = false;
function tick() {
  const left = Date.parse(info.starts_at) - serverNow();
  if (left <= 0) {
    clearInterval(tickTimer);
    return open();
  }
  const s = Math.floor(left / 1000);
  const set = (k, v) => {
    const el = $(`[data-${k}]`);
    if (el && el.textContent !== v) {
      el.textContent = v;
      if (k === 's' && !reduceMotion) gsap.fromTo(el, { y: -6, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.25 });
    }
  };
  set('d', pad(Math.floor(s / 86400)));
  set('h', pad(Math.floor((s % 86400) / 3600)));
  set('m', pad(Math.floor((s % 3600) / 60)));
  set('s', pad(s % 60));
}

/** Zero: ask the server for the code (it decides, by its own clock). */
async function open() {
  if (opening) return;
  opening = true;
  for (let i = 0; i < 20; i++) {
    try {
      info = await fetchInfo();
      if (info?.state !== 'waiting') break;
    } catch {
      /* offline for a moment — try again */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  opening = false;
  paint();
}

function confetti() {
  if (reduceMotion) return;
  const host = $('[data-poster]');
  const colors = ['#FFD21F', '#E5197F', '#2350E0', '#F2542D', '#FFFFFF', '#1E9E5A'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('i');
    p.className = 'rmd-confetti';
    p.style.background = colors[i % colors.length];
    host.append(p);
    gsap.fromTo(
      p,
      { x: host.clientWidth / 2, y: host.clientHeight * 0.35, rotate: 0, opacity: 1 },
      {
        x: `+=${(Math.random() - 0.5) * host.clientWidth * 1.1}`,
        y: `+=${(Math.random() - 0.2) * host.clientHeight * 0.9}`,
        rotate: (Math.random() - 0.5) * 720,
        opacity: 0,
        duration: 1.6 + Math.random() * 1.4,
        ease: 'power3.out',
        onComplete: () => p.remove(),
      },
    );
  }
}

/* ------------------------------------------------------------------ boot */
boot({
  async setup() {
    $('.rmd-burst').innerHTML = burstSVG();
    key = readKey();
    if (key) {
      try {
        info = await fetchInfo();
      } catch (e) {
        console.error(e);
        info = null;
      }
    }
    paint();

    $('[data-body]').addEventListener('click', async (e) => {
      if (e.target.closest('[data-copy]') && info?.code) {
        try {
          await navigator.clipboard.writeText(info.code);
          toast(L('انسخ الكود ✓', 'Code copied ✓'));
        } catch {
          toast(info.code);
        }
      }
    });
    window.addEventListener('langchange', paint);
    // The owner may move the date (moon sighting): pick it up when the shopper comes back.
    const refresh = async () => {
      if (document.hidden || !key || opening) return;
      try {
        const next = await fetchInfo();
        const changed = next?.state !== info?.state || next?.starts_at !== info?.starts_at || next?.code !== info?.code;
        info = next;
        if (changed) paint();
      } catch {
        /* keep what's on screen */
      }
    };
    document.addEventListener('visibilitychange', refresh);
    setInterval(refresh, 5 * 60_000);
  },
  intro() {
    if (reduceMotion) return;
    gsap.from('.rmd-line', { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out' });
    gsap.from('.rmd-oval', { scale: 0.6, rotate: -8, opacity: 0, duration: 0.9, ease: 'back.out(2)', delay: 0.1 });
    gsap.from('.rmd-cell, .rmd-ticket', { y: 40, opacity: 0, stagger: 0.08, duration: 0.7, ease: 'back.out(2)', delay: 0.3 });
    gsap.from('.rmd-burst', { scale: 0.4, rotate: -30, opacity: 0, duration: 1.2, ease: 'expo.out' });
  },
});
