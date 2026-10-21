import { byIdIn, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, SOURCES } from '../js/backend/model.js';

/* ------------------------------------------------------------------ language */
const LANG_KEY = 'zooot-hq-lang';
export let lang = (() => {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
})();
export const L = (ar, en) => (lang === 'en' ? en : ar);
export const tr = (v) => (v && typeof v === 'object' ? v[lang] ?? v.ar ?? v.en ?? '' : v ?? '');
export function setLang(next) {
  lang = next;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = next;
  document.documentElement.dir = next === 'en' ? 'ltr' : 'rtl';
}

/* ------------------------------------------------------------------ format */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = () => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
export const num = (n) => nf().format(Number(n) || 0);
export const money = (n) => (lang === 'en' ? `SAR ${num(n)}` : `${num(n)} ر.س`);
export const moneyHTML = (n) => `<span class="num">${num(n)}</span> <small>${lang === 'en' ? 'SAR' : 'ر.س'}</small>`;
export function compact(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `${+(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${+(v / 1e3).toFixed(1)}K`;
  return String(Math.round(v));
}
const locale = () => (lang === 'en' ? 'en-GB' : 'ar-SA-u-nu-latn-ca-gregory');
export const date = (iso, opts = { day: 'numeric', month: 'short' }) => (iso ? new Intl.DateTimeFormat(locale(), opts).format(new Date(iso)) : '');
export const dateTime = (iso) => date(iso, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export function ago(iso) {
  const diff = (Date.parse(iso) - Date.now()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(lang === 'en' ? 'en' : 'ar', { numeric: 'auto' });
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 604800) return rtf.format(Math.round(diff / 86400), 'day');
  if (abs < 2629800) return rtf.format(Math.round(diff / 604800), 'week');
  return rtf.format(Math.round(diff / 2629800), 'month');
}

/* ------------------------------------------------------------------ bits */
export const icon = (name, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#a-${name}"/></svg>`;
const badgeFor = (list, id) => {
  const s = byIdIn(list, id) || { ar: id, en: id, color: '#8a8a8a' };
  return `<span class="badge" style="--c:${s.color || '#8a8a8a'}"><i></i>${esc(tr(s))}</span>`;
};
export const statusBadge = (id) => badgeFor(ORDER_STATUSES, id);
export const payBadge = (id) => badgeFor(PAYMENT_STATUSES, id);
export const methodName = (id) => tr(byIdIn(PAYMENT_METHODS, id) || { ar: id, en: id });
export const sourceName = (id) => tr(byIdIn(SOURCES, id) || { ar: id, en: id });
export const statusName = (id) => tr(byIdIn(ORDER_STATUSES, id) || { ar: id, en: id });
export const optText = (o) => `${tr(o.label)}: ${typeof o.value === 'object' ? tr(o.value) : o.value}`;
/** Product/line images may be site-relative ("img/…"), absolute, or data: URLs. */
export const img = (src) => (!src ? '' : /^(https?:|data:|blob:)/.test(src) ? src : `../${String(src).replace(/^\.?\//, '')}`);

/* ------------------------------------------------------------------ toasts */
export function toast(message, { tone = '', action, timeout = 4500 } = {}) {
  const host = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${tone}`;
  el.setAttribute('role', 'status');
  const p = document.createElement('span');
  p.textContent = message;
  el.append(p);
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'b b-sm';
    b.textContent = action.label;
    b.onclick = () => {
      action.onClick();
      close();
    };
    el.append(b);
  }
  host.append(el);
  // Keep the stack short: the oldest toasts make way.
  [...host.children].slice(0, -3).forEach((t) => t.remove());
  const close = () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  };
  setTimeout(close, timeout);
  return close;
}
export const ok = (m) => toast(m, { tone: 'ok' });
export const bad = (e) => toast(errorText(e), { tone: 'bad', timeout: 6000 });

const ERRORS = {
  invalid_credentials: ['الإيميل أو كلمة المرور غير صحيحة', 'Wrong email or password'],
  not_owner: ['هذا الحساب ما عنده صلاحية المالك', 'This account isn’t an owner'],
  too_many_attempts: ['محاولات كثيرة — انتظر دقيقة', 'Too many attempts — wait a minute'],
  invalid_name: ['اكتب اسم العميل', 'Enter the customer name'],
  invalid_phone: ['رقم الجوال غير صحيح', 'Check the phone number'],
  invalid_email: ['البريد غير صحيح', 'Check the email'],
  invalid_items: ['أضف قطعة واحدة على الأقل', 'Add at least one item'],
  no_email: ['العميل ما عنده بريد', 'This customer has no email'],
  storage_full: ['مساحة المتصفح ممتلئة — احذف صور أو بيانات', 'Browser storage is full'],
  function_missing: ['دالة الإيميل غير منشورة على Supabase', 'The email function isn’t deployed'],
  builtin_product: ['منتجات الإصدار ما تنحذف — أخفها بدلًا من ذلك', 'Drop products can’t be deleted — hide them instead'],
  duplicate_id: ['المعرّف مستخدم من قبل', 'That ID is already used'],
  demo_mode: ['غير متاح في الوضع التجريبي', 'Not available in demo mode'],
};
export function errorText(e) {
  const msg = e?.message || String(e);
  const key = Object.keys(ERRORS).find((k) => msg.startsWith(k));
  if (key) return L(...ERRORS[key]);
  if (msg.startsWith('out_of_stock')) return L('نفد المخزون لهذا المقاس', 'Out of stock for that size');
  return msg;
}

/* ------------------------------------------------------------------ dialogs */
/**
 * Open a modal; `body` is HTML. Resolves with { value, data, form } for the clicked
 * action (or null when dismissed). Enter submits the primary action only.
 */
export function dialog({ title, body, actions = [], wide = false, onOpen }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'dlg';
    if (wide) d.style.width = 'min(860px, calc(100% - 24px))';
    const isSubmit = (a) => a.submit || /b-primary/.test(a.cls || '');
    d.innerHTML = `
      <form method="dialog" class="dlg-form" novalidate>
        <div class="dlg-body">
          <div class="dlg-h"><h2>${esc(title)}</h2><button class="b b-ghost b-icon" type="button" data-close aria-label="${esc(L('إغلاق', 'Close'))}">${icon('x')}</button></div>
          ${body}
        </div>
        ${actions.length ? `<div class="dlg-foot">${actions.map((a, i) => `<button class="b ${a.cls || ''}" type="${isSubmit(a) ? 'submit' : 'button'}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}
      </form>`;
    document.body.append(d);
    const form = d.querySelector('form');
    let result = null;
    const finish = (a) => {
      result = a?.value ? { value: a.value, data: Object.fromEntries(new FormData(form)), form } : null;
      d.close();
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const a = actions[Number(e.submitter?.dataset.i)] || actions.find(isSubmit);
      if (a?.submit && !form.checkValidity()) {
        form.reportValidity();
        return;
      }
      finish(a);
    });
    form.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) return finish(null);
      const b = e.target.closest('.dlg-foot button[type=button]');
      if (b) finish(actions[Number(b.dataset.i)]);
    });
    d.addEventListener('close', () => {
      resolve(result);
      d.remove();
    });
    d.showModal();
    onOpen?.(d);
  });
}

export async function confirmDialog(message, { okLabel = L('تأكيد', 'Confirm'), danger = false } = {}) {
  const r = await dialog({
    title: L('متأكد؟', 'Are you sure?'),
    body: `<p>${esc(message)}</p>`,
    actions: [
      { label: L('إلغاء', 'Cancel'), value: '', cls: 'b-ghost' },
      { label: okLabel, value: 'ok', cls: danger ? 'b-dark' : 'b-primary' },
    ],
  });
  return r?.value === 'ok';
}

/* ------------------------------------------------------------------ files */
export function download(name, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function csv(rows) {
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\n');
}
export async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    ok(L('تم النسخ', 'Copied'));
  } catch {
    toast(text);
  }
}

/* ------------------------------------------------------------------ chime */
let audio;
export function chime() {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime;
    [659.25, 880, 1174.66].forEach((f, i) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.35);
      o.connect(g).connect(audio.destination);
      o.start(t + i * 0.09);
      o.stop(t + i * 0.09 + 0.4);
    });
  } catch {
    /* audio blocked until the first interaction */
  }
}
