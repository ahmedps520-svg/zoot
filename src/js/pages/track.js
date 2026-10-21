import { boot } from '../main.js';
import '../../styles/track.css';
import { gsap, reduceMotion } from '../core/motion.js';
import { $, esc, toast } from '../core/ui.js';
import { formatPrice, getLang, t } from '../core/i18n.js';
import { CONFIG } from '../data.js';
import { publicApi } from '../backend/public.js';
import { FLOW, ORDER_STATUSES } from '../backend/model.js';

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
        <span class="track-live" title="${esc(L('تتحدّث تلقائيًا', 'Updates automatically'))}"><i></i>LIVE</span>
      </div>
      <p class="track-status" style="--c:${s.color}"><span>${esc(t(s))}</span></p>
      <p class="lead">${esc(L(...COPY[o.status]))}</p>
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
        <button class="btn btn--ghost" type="button" data-another>${esc(L('تتبّع طلب ثاني', 'Track another order'))}</button>
      </div>
      <p class="track-updated">${esc(L('آخر تحديث', 'Last update'))}: ${esc(when(o.updated_at))}</p>
    </div>`;
  host.hidden = false;
  $('[data-track-form]').hidden = true;
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
      msg.textContent = L('ما لقينا طلب بهالرقم والجوال. تأكد منهم وجرّب مرة ثانية.', 'No order matches that number and mobile. Check both and try again.');
      msg.classList.add('is-error');
      return;
    }
    const changed = current?.data && current.data.status !== o.status;
    current = { no, phone, data: o };
    msg.textContent = '';
    render(o);
    if (changed) toast(L(`تحديث: ${t(statusOf(o.status))}`, `Update: ${t(statusOf(o.status))}`));
    if (!quiet) {
      history.replaceState(null, '', `?order=${encodeURIComponent(o.order_no)}`);
      if (!reduceMotion) gsap.from('.track-card > *', { y: 24, opacity: 0, stagger: 0.05, duration: 0.6, ease: 'power3.out' });
      startLive();
    }
  } catch (e) {
    console.error(e);
    if (!quiet) {
      msg.textContent = L('صار خطأ بالاتصال — جرّب بعد شوي.', 'Connection problem — try again in a moment.');
      msg.classList.add('is-error');
    }
  } finally {
    btn.classList.remove('is-busy');
  }
}

/** Live status: instant in demo mode (same browser), polling against Supabase. */
async function startLive() {
  clearInterval(timer);
  stopLive?.();
  const api = await publicApi();
  stopLive = api.onChange?.((c) => c.table !== 'subscribers' && current && lookup(current.no, current.phone, { quiet: true }));
  timer = setInterval(() => {
    if (!document.hidden && current) lookup(current.no, current.phone, { quiet: true });
  }, 30_000);
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
    const no = params.get('order') || params.get('o') || '';
    let last = null;
    try {
      last = JSON.parse(localStorage.getItem('zooot-last-order') || 'null');
    } catch {
      /* ignore */
    }
    form.order.value = no || last?.order_no || '';
    if (last?.phone && (!no || last.order_no === no)) form.phone.value = last.phone;
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
      if (e.target.closest('[data-another]')) {
        current = null;
        clearInterval(timer);
        $('[data-track-result]').hidden = true;
        form.hidden = false;
        form.reset();
        form.order.focus();
      }
    });
    window.addEventListener('langchange', () => current?.data && render(current.data));
    if (form.order.value && form.phone.value) lookup(form.order.value, form.phone.value);
  },
  intro() {
    if (reduceMotion) return;
    gsap.from('.track-title', { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out' });
    gsap.from('.track-form, .track-unsub', { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.2 });
  },
});
