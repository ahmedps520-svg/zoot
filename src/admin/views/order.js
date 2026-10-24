import { COURIERS, FLOW, ORDER_STATUSES, PAYMENT_METHODS, SOURCES, byIdIn } from '../../js/backend/model.js';
import { go, reload, store } from '../main.js';
import {
  L,
  bad,
  confirmDialog,
  copy,
  date,
  dateTime,
  dialog,
  esc,
  icon,
  img,
  lang,
  methodName,
  money,
  moneyHTML,
  num,
  ok,
  payBadge,
  sourceName,
  statusBadge,
  statusName,
  toast,
} from '../ui.js';
import {
  actor,
  balanceOf,
  busy,
  customerOrders,
  empty,
  itemName,
  itemOpts,
  mount,
  productOptions,
  readSize,
  sizeFields,
  statusOptions,
  trackUrl,
  waHref,
  waText,
} from './common.js';

let current = null; // { no, order }
let token = 0;
let notify = null;

const EMAIL_STATUSES = ['confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
const api = () => store.api;

function nextOf(status) {
  const i = FLOW.indexOf(status);
  return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null;
}

const NEXT_LABEL = {
  confirmed: ['أكّد الطلب', 'Confirm order'],
  preparing: ['ابدأ التجهيز', 'Start preparing'],
  shipped: ['اشحن الطلب', 'Mark as shipped'],
  delivered: ['تم التسليم', 'Mark delivered'],
};

function timelineHTML(o) {
  const evs = (o.events || []).slice().reverse();
  if (!evs.length) return `<p class="muted">—</p>`;
  return `<div class="timeline">${evs
    .map((e) => {
      const d = e.data || {};
      let ic = 'check';
      let c = 'var(--ink)';
      let text = '';
      switch (e.type) {
        case 'created':
          ic = 'star';
          c = 'var(--magenta)';
          text = L(`انشأ الطلب · ${sourceName(d.source || o.source)}`, `Order placed · ${sourceName(d.source || o.source)}`);
          break;
        case 'status': {
          const s = byIdIn(ORDER_STATUSES, d.to);
          c = s?.color || c;
          ic = d.to === 'shipped' ? 'truck' : d.to === 'cancelled' ? 'x' : 'check';
          text = `${L('الحالة', 'Status')}: ${statusName(d.from)} ← ${statusName(d.to)}`;
          if (lang === 'en') text = `Status: ${statusName(d.from)} → ${statusName(d.to)}`;
          break;
        }
        case 'price':
          ic = 'edit';
          c = 'var(--warn)';
          text = L(`تعدّل الإجمالي من ${money(d.from)} إلى ${money(d.to)}`, `Total changed from ${money(d.from)} to ${money(d.to)}`);
          break;
        case 'payment':
          ic = 'cash';
          c = Number(d.amount) < 0 ? 'var(--muted)' : 'var(--ok)';
          text =
            Number(d.amount) < 0
              ? L(`استرجاع ${money(-d.amount)}`, `Refunded ${money(-d.amount)}`)
              : L(`دفعة ${money(d.amount)} · ${methodName(d.method)}`, `Payment ${money(d.amount)} · ${methodName(d.method)}`);
          if (d.reference) text += ` · #${d.reference}`;
          break;
        case 'note':
          ic = 'note';
          c = '#C9A04A';
          text = d.text || '';
          break;
        case 'email':
          ic = 'mail';
          c = 'var(--blue)';
          text = `${L('إيميل', 'Email')}: ${d.subject || ''}${d.status && d.status !== 'sent' ? ` (${d.status})` : ''}`;
          break;
        default:
          text = e.type;
      }
      return `<div class="tl"><i style="--c:${c}">${icon(ic)}</i><div><span style="white-space:pre-wrap">${esc(text)}</span><small>${esc(dateTime(e.created_at))}${e.actor && e.actor !== 'demo' ? ` · ${esc(e.actor)}` : ''}</small></div></div>`;
    })
    .join('')}</div>`;
}

/** ISO → value for <input type="datetime-local"> in local time. */
const localInput = (iso) => (iso ? new Date(Date.parse(iso) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

/** Where the assigned driver is (last ping) and what the customer shared. */
function driverLine(o) {
  if (!o.courier_id && !o.delivery_location) return '';
  const c = store.couriers.find((x) => x.id === o.courier_id);
  const l = c?.location;
  const fresh = l && Date.now() - Date.parse(l.updated_at) < 10 * 60000;
  return `<div class="mode-note" style="margin-bottom:12px;background:${fresh ? '#dff3e7' : '#f4f0e8'};border-color:${fresh ? '#9fd6b5' : 'var(--line)'}">${icon('truck')}<span>${
    c
      ? `<strong>${esc(c.name || c.email)}</strong>${c.phone ? ` · <a href="tel:${esc(c.phone)}" dir="ltr">${esc(c.phone)}</a>` : ''}<br>${
          l
            ? `${esc(fresh ? L('يشارك موقعه الحين', 'Sharing live location') : L('آخر موقع', 'Last location'))} · ${esc(dateTime(l.updated_at))} · <a href="https://www.google.com/maps?q=${l.lat},${l.lng}" target="_blank" rel="noopener">${esc(L('على الخريطة', 'Map'))}</a>`
            : esc(L('ما شارك موقعه للحين — العميل يشوف الوقت المتوقع', 'No location yet — the customer sees the ETA'))
        }`
      : ''
  }${o.delivery_location ? `<br>${esc(L('موقع العميل', 'Customer location'))}: ${/^https?:/.test(o.delivery_location) ? `<a href="${esc(o.delivery_location)}" target="_blank" rel="noopener">${esc(o.delivery_location)}</a>` : esc(o.delivery_location)}` : ''}</span></div>`;
}

function invoiceHTML(o) {
  const s = store.settings.public || {};
  return `<div class="inv-head"><svg aria-hidden="true"><use href="#zooot-logo"/></svg><div style="text-align:end"><h1 style="font-size:20pt">${esc(L('فاتورة', 'Invoice'))}</h1><div dir="ltr">${esc(o.order_no)}</div><div>${esc(date(o.created_at, { day: 'numeric', month: 'long', year: 'numeric' }))}</div></div></div>
    <p><strong>${esc(o.customer_name)}</strong><br><span dir="ltr">${esc(o.customer_phone)}</span>${o.customer_email ? `<br>${esc(o.customer_email)}` : ''}<br>${esc([o.city, o.district, o.address].filter(Boolean).join('، '))}</p>
    <table><thead><tr><th>${esc(L('القطعة', 'Item'))}</th><th>${esc(L('الكمية', 'Qty'))}</th><th>${esc(L('السعر', 'Price'))}</th><th>${esc(L('المجموع', 'Total'))}</th></tr></thead><tbody>
    ${o.items.map((it) => `<tr><td>${esc(itemName(it))}<br><small>${esc(itemOpts(it))}</small></td><td>${it.qty}</td><td>${esc(money(it.unit_price))}</td><td>${esc(money(it.qty * it.unit_price))}</td></tr>`).join('')}
    </tbody></table>
    <table style="margin-top:12pt;width:50%;margin-inline-start:auto">
      <tr><td>${esc(L('المجموع الفرعي', 'Subtotal'))}</td><td>${esc(money(o.subtotal))}</td></tr>
      ${o.discount ? `<tr><td>${esc(L('الخصم', 'Discount'))}${o.coupon_code ? ` (${esc(o.coupon_code)})` : ''}</td><td>-${esc(money(o.discount))}</td></tr>` : ''}
      <tr><td>${esc(L('الشحن', 'Shipping'))}</td><td>${o.shipping ? esc(money(o.shipping)) : esc(L('مجاني', 'Free'))}</td></tr>
      <tr><td><strong>${esc(L('الإجمالي', 'Total'))}</strong></td><td><strong>${esc(money(o.total))}</strong></td></tr>
      <tr><td>${esc(L('المدفوع', 'Paid'))}</td><td>${esc(money(o.paid_amount))}</td></tr>
      <tr><td>${esc(L('المتبقي', 'Balance'))}</td><td>${esc(money(balanceOf(o)))}</td></tr>
    </table>
    <p style="margin-top:18pt">${esc(L('الدفع', 'Payment'))}: ${esc(methodName(o.payment_method))}${s.bank_details && balanceOf(o) > 0 ? `<br><span style="white-space:pre-wrap">${esc(s.bank_details)}</span>` : ''}</p>
    <p style="margin-top:24pt;text-align:center">${esc(L('شكرًا إنك اخترت زوووط — البس بصوت عالي.', 'Thanks for choosing ZOOOT — wear it loud.'))}</p>`;
}

function paint(host, o) {
  const balance = balanceOf(o);
  const nx = nextOf(o.status);
  const cancelled = o.status === 'cancelled';
  const others = customerOrders(o.customer_phone).filter((x) => x.id !== o.id);
  const sentEmails = (o.events || []).filter((e) => e.type === 'email').length;
  const pct = o.total > 0 ? Math.min(100, (Number(o.paid_amount) / Number(o.total)) * 100) : 0;
  if (notify === null) notify = store.settings.notifications?.status_emails !== false;
  const stepIdx = FLOW.indexOf(o.status);
  // Keep the caret where it was when a save repaints the page (Tab from price → qty, etc.).
  const f = document.activeElement;
  const refocus = f && host.contains(f) ? ['data-price', 'data-qty', 'data-field'].filter((a) => f.hasAttribute(a)).map((a) => `[${a}="${f.getAttribute(a)}"]`)[0] : null;

  const el = mount(
    host,
    `
    <div class="ord-head">
      <div style="display:grid;gap:6px">
        <a class="muted" href="#/orders" style="font-size:13px">${esc(L('→ الطلبات', '← Orders'))}</a>
        <div class="row"><span class="ord-no">${esc(o.order_no)}</span>${statusBadge(o.status)}${payBadge(o.payment_status)}</div>
        <small class="muted">${esc(dateTime(o.created_at))} · ${esc(sourceName(o.source))} · ${o.lang === 'en' ? 'English' : 'عربي'}</small>
      </div>
      <div class="row">
        <a class="b b-wa" href="${esc(waHref(o.customer_phone, waText(o)))}" target="_blank" rel="noopener">${icon('wa')}${esc(L('واتساب', 'WhatsApp'))}</a>
        <button class="b" type="button" data-act="print">${icon('print')}<span class="hide-s">${esc(L('فاتورة', 'Invoice'))}</span></button>
        <button class="b b-icon" type="button" data-act="link" title="${esc(L('انسخ رابط التتبّع', 'Copy tracking link'))}" aria-label="${esc(L('انسخ رابط التتبّع', 'Copy tracking link'))}">${icon('link')}</button>
        <button class="b b-icon b-danger" type="button" data-act="delete" title="${esc(L('حذف الطلب', 'Delete order'))}" aria-label="${esc(L('حذف الطلب', 'Delete order'))}">${icon('trash')}</button>
      </div>
    </div>

    <section class="card">
      ${
        cancelled
          ? `<div class="spread"><strong>${esc(L('هذا الطلب ملغي — القطع رجعت للمخزون.', 'This order is cancelled — its items went back to stock.'))}</strong><button class="b" type="button" data-status="new">${icon('refresh')}${esc(L('استرجاع الطلب', 'Restore order'))}</button></div>`
          : `<div class="stepper">${FLOW.map(
              (s, i) =>
                `<button type="button" class="step ${i < stepIdx ? 'done' : ''} ${i === stepIdx ? 'now' : ''}" data-status="${s}" ${i === stepIdx ? 'aria-current="step"' : ''}><i></i>${esc(statusName(s))}</button>`,
            ).join('')}</div>
        <div class="spread" style="margin-top:16px">
          <div class="row">
            ${nx ? `<button class="b b-primary" type="button" data-status="${nx}">${esc(L(...NEXT_LABEL[nx]))} ${icon('arrow')}</button>` : `<span class="badge" style="--c:var(--ok)"><i></i>${esc(L('مكتمل', 'Complete'))}</span>`}
            <button class="b b-ghost b-danger" type="button" data-status="cancelled">${icon('x')}${esc(L('إلغاء الطلب', 'Cancel order'))}</button>
          </div>
          <label class="check" title="${esc(o.customer_email ? '' : L('العميل ما عنده بريد', 'No customer email'))}"><input type="checkbox" data-notify ${notify && o.customer_email ? 'checked' : ''} ${o.customer_email ? '' : 'disabled'}>${esc(L('أرسل إيميل للعميل عند تغيير الحالة', 'Email the customer on status change'))}</label>
        </div>`
      }
    </section>

    <div class="cols">
      <div style="display:grid;gap:18px;min-width:0">
        <section class="card">
          <div class="card-h"><h2>${esc(L('القطع', 'Items'))} <span class="muted num">(${num(o.items.reduce((s, it) => s + it.qty, 0))})</span></h2><button class="b b-sm" type="button" data-act="add-item">${icon('plus')}${esc(L('أضف قطعة', 'Add item'))}</button></div>
          <div class="line-items">${o.items
            .map(
              (it) => `<div class="li">
              ${it.image ? `<img src="${esc(img(it.image))}" alt="">` : `<span class="thumbs" style="width:56px;height:66px;border-radius:10px;background:var(--cream-2)"></span>`}
              <div><div class="li-name">${esc(itemName(it))}</div><div class="li-opts">${esc(itemOpts(it))}</div></div>
              <div class="li-edit">
                <label><span class="sr">${esc(L('سعر القطعة', 'Unit price'))}</span><input class="in" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(it.unit_price)}" data-price="${esc(it.id)}" title="${esc(L('سعر القطعة', 'Unit price'))}"></label>
                <span class="muted">×</span>
                <label><span class="sr">${esc(L('الكمية', 'Quantity'))}</span><input class="in qty" type="number" min="1" max="99" inputmode="numeric" value="${esc(it.qty)}" data-qty="${esc(it.id)}"></label>
              </div>
              <span class="line-total">${esc(money(it.unit_price * it.qty))}</span>
              <button class="b b-ghost b-sm b-icon" type="button" data-remove-item="${esc(it.id)}" aria-label="${esc(L('احذف القطعة', 'Remove item'))}">${icon('trash')}</button>
            </div>`,
            )
            .join('')}</div>
          <div class="totals">
            <div class="spread"><span>${esc(L('المجموع الفرعي', 'Subtotal'))}</span><span class="num">${esc(money(o.subtotal))}</span></div>
            <div class="spread"><label for="disc">${esc(L('الخصم', 'Discount'))}${o.coupon_code ? ` <a class="cpn-chip" href="#/coupons" dir="ltr" title="${esc(L('كوبون', 'Coupon'))}">${icon('tag')}${esc(o.coupon_code)}</a>` : ''}</label><input id="disc" class="in" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(o.discount || 0)}" data-field="discount"></div>
            <div class="spread"><label for="ship">${esc(L('الشحن', 'Shipping'))}</label><input id="ship" class="in" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(o.shipping || 0)}" data-field="shipping"></div>
            <div class="spread grand"><span>${esc(L('الإجمالي', 'Total'))}</span><span>${moneyHTML(o.total)}</span></div>
          </div>
        </section>

        <section class="card">
          <div class="card-h"><h2>${esc(L('الدفع', 'Payment'))}</h2>${payBadge(o.payment_status)}</div>
          <div class="spread" style="margin-bottom:8px"><span>${esc(L('المدفوع', 'Paid'))} <strong class="num">${esc(money(o.paid_amount))}</strong> / <span class="num">${esc(money(o.total))}</span></span>${balance > 0 ? `<strong style="color:var(--bad)">${esc(L('باقي', 'Due'))} <span class="num">${esc(money(balance))}</span></strong>` : ''}</div>
          <div class="meter ${pct >= 100 ? 'is-full' : ''}" role="img" aria-label="${esc(`${Math.round(pct)}%`)}"><i style="--w:${pct.toFixed(1)}%"></i></div>
          ${Number(o.paid_amount) > Number(o.total) ? `<div class="mode-note" style="margin-top:10px">${icon('cash')}<span>${esc(L(`العميل دافع زيادة ${money(o.paid_amount - o.total)} — سجّل استرجاع لو رجّعتها له.`, `The customer overpaid by ${money(o.paid_amount - o.total)} — record a refund if you give it back.`))}</span></div>` : ''}
          <div style="margin-top:8px">${(o.payments || [])
            .slice()
            .sort((a, b) => b.paid_at.localeCompare(a.paid_at))
            .map(
              (p) => `<div class="pay-row"><div><strong>${esc(Number(p.amount) < 0 ? L('استرجاع', 'Refund') : methodName(p.method))}</strong><br><small class="muted">${esc(dateTime(p.paid_at))}${p.reference ? ` · #${esc(p.reference)}` : ''}${p.note ? ` · ${esc(p.note)}` : ''}</small></div>
              <span class="num" style="color:${Number(p.amount) < 0 ? 'var(--bad)' : 'inherit'}">${esc(money(p.amount))}</span>
              <button class="b b-ghost b-sm b-icon" type="button" data-remove-pay="${esc(p.id)}" aria-label="${esc(L('احذف الدفعة', 'Remove payment'))}">${icon('trash')}</button></div>`,
            )
            .join('')}</div>
          <div class="row" style="margin-top:12px">
            ${balance > 0 ? `<button class="b b-dark" type="button" data-act="paid">${icon('check')}${esc(L(`استلمت ${money(balance)}`, `Received ${money(balance)}`))}</button>` : ''}
            <button class="b" type="button" data-act="pay">${icon('cash')}${esc(L('سجّل دفعة', 'Record payment'))}</button>
            ${Number(o.paid_amount) > 0 ? `<button class="b b-ghost" type="button" data-act="refund">${icon('refresh')}${esc(L('استرجاع', 'Refund'))}</button>` : ''}
          </div>
        </section>

        <section class="card">
          <div class="card-h"><h2>${esc(L('السجل والملاحظات', 'Timeline & notes'))}</h2></div>
          <form class="row" data-note style="margin-bottom:16px;flex-wrap:nowrap">
            <input class="in" name="note" placeholder="${esc(L('اكتب ملاحظة للفريق…', 'Add a note for the team…'))}" maxlength="2000" required>
            <button class="b" type="submit">${icon('send')}</button>
          </form>
          ${timelineHTML(o)}
        </section>
      </div>

      <div style="display:grid;gap:18px;min-width:0">
        <section class="card">
          <div class="card-h"><h2>${esc(L('العميل', 'Customer'))}</h2><button class="b b-sm" type="button" data-act="edit-customer">${icon('edit')}${esc(L('تعديل', 'Edit'))}</button></div>
          <dl class="kv">
            <div><dt>${esc(L('الاسم', 'Name'))}</dt><dd><strong>${esc(o.customer_name)}</strong></dd></div>
            <div><dt>${esc(L('الجوال', 'Phone'))}</dt><dd><a href="tel:${esc(o.customer_phone)}" dir="ltr">${esc(o.customer_phone)}</a></dd></div>
            <div><dt>${esc(L('البريد', 'Email'))}</dt><dd>${o.customer_email ? `<a href="mailto:${esc(o.customer_email)}">${esc(o.customer_email)}</a>` : '<span class="muted">—</span>'}</dd></div>
            <div><dt>${esc(L('المدينة', 'City'))}</dt><dd>${esc([o.city, o.district].filter(Boolean).join('، ') || '—')}</dd></div>
            <div><dt>${esc(L('العنوان', 'Address'))}</dt><dd>${esc(o.address || '—')}</dd></div>
          </dl>
          <div class="row" style="margin-top:14px">
            <a class="b b-sm" href="tel:${esc(o.customer_phone)}">${icon('phone')}${esc(L('اتصال', 'Call'))}</a>
            <a class="b b-sm b-wa" href="${esc(waHref(o.customer_phone, waText(o)))}" target="_blank" rel="noopener">${icon('wa')}WhatsApp</a>
            ${others.length ? `<a class="b b-sm" href="#/orders?q=${encodeURIComponent(o.customer_phone)}">${icon('orders')}${esc(L(`${others.length} طلب سابق`, `${others.length} other order(s)`))}</a>` : `<span class="badge" style="--c:var(--yellow)"><i></i>${esc(L('عميل جديد', 'First order'))}</span>`}
          </div>
          ${o.customer_note ? `<div class="mode-note" style="margin-top:14px">${icon('note')}<span><strong>${esc(L('ملاحظة العميل', 'Customer note'))}:</strong> ${esc(o.customer_note)}</span></div>` : ''}
        </section>

        <section class="card">
          <div class="card-h"><h2>${esc(L('الشحن', 'Shipping'))}</h2>${o.tracking_no ? `<a class="b b-sm b-wa" href="${esc(waHref(o.customer_phone, waText(o, 'shipped')))}" target="_blank" rel="noopener">${icon('wa')}${esc(L('أرسل التتبّع', 'Send tracking'))}</a>` : ''}</div>
          <div class="grid-2" style="margin-bottom:12px">
            <label class="f"><span>${esc(L('المندوب (توصيل زوووط)', 'Driver (ZOOOT delivery)'))}</span><select data-field="courier_id"><option value="">${esc(L('— بدون —', '— none —'))}</option>${store.couriers
              .filter((c) => c.active || c.id === o.courier_id)
              .map((c) => `<option value="${esc(c.id)}" ${c.id === o.courier_id ? 'selected' : ''}>${esc(c.name || c.email)}</option>`)
              .join('')}</select></label>
            <label class="f"><span>${esc(L('الوصول المتوقع', 'Expected arrival'))}</span><input type="datetime-local" data-field="delivery_eta" value="${esc(localInput(o.delivery_eta))}"></label>
          </div>
          ${driverLine(o)}
          <div class="grid-2">
            <label class="f"><span>${esc(L('شركة الشحن', 'Courier'))}</span><select data-field="courier"><option value="">—</option>${COURIERS.map((c) => `<option ${c === o.courier ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
            <label class="f"><span>${esc(L('رقم الشحنة', 'Tracking no.'))}</span><input data-field="tracking_no" value="${esc(o.tracking_no || '')}" dir="ltr" autocomplete="off"></label>
          </div>
          <button class="b b-sm b-ghost" type="button" data-act="link" style="margin-top:10px">${icon('link')}${esc(L('انسخ رابط تتبّع العميل', 'Copy customer tracking link'))}</button>
        </section>

        <section class="card">
          <div class="card-h"><h2>${esc(L('تفاصيل الطلب', 'Order details'))}</h2></div>
          <div style="display:grid;gap:12px">
            <label class="f"><span>${esc(L('طريقة الدفع', 'Payment method'))}</span><select data-field="payment_method">${statusOptions(PAYMENT_METHODS.filter((m) => m.id !== 'refund'), o.payment_method)}</select></label>
            <label class="f"><span>${esc(L('المصدر', 'Source'))}</span><select data-field="source">${statusOptions(SOURCES, o.source)}</select></label>
            <label class="f"><span>${esc(L('ملاحظة داخلية (ما يشوفها العميل)', 'Internal note (customer never sees it)'))}</span><textarea data-field="internal_note" maxlength="2000">${esc(o.internal_note || '')}</textarea></label>
          </div>
        </section>

        <section class="card">
          <div class="card-h"><h2>${esc(L('الإيميلات', 'Emails'))}</h2><small>${esc(L(`${sentEmails} مرسل`, `${sentEmails} sent`))}</small></div>
          ${
            o.customer_email
              ? `<div class="row"><button class="b" type="button" data-act="email-status">${icon('mail')}${esc(L(`أرسل تحديث «${statusName(o.status)}»`, `Send “${statusName(o.status)}” update`))}</button>
                 <button class="b b-ghost" type="button" data-act="email-custom">${icon('edit')}${esc(L('رسالة خاصة', 'Custom message'))}</button></div>`
              : `<p class="muted">${esc(L('العميل ما أضاف بريد. أضفه من «تعديل» في بطاقة العميل.', 'No email on this order — add one via Edit on the customer card.'))}</p>`
          }
        </section>
      </div>
    </div>`,
  );
  bind(el, o);
  if (refocus) el.querySelector(refocus)?.focus();
}

async function apply(fn, msg) {
  const btn = document.activeElement?.closest?.('button') || null;
  const next = await busy(btn, fn, msg);
  if (next && next.id) {
    current = { no: next.order_no, order: next };
    const i = store.orders.findIndex((x) => x.id === next.id);
    const { events, ...flat } = next;
    if (i >= 0) store.orders[i] = flat;
    paint(document.getElementById('view'), next);
  }
  return next;
}

async function emailStatus(o) {
  try {
    const r = await api().emails.send('status', { order_id: o.id }, actor());
    ok(r?.status === 'preview' ? L('الإيميل محفوظ في صندوق المعاينة (وضع تجريبي)', 'Email saved to the preview outbox (demo)') : L('تم إرسال الإيميل للعميل', 'Customer emailed'));
    const fresh = await api().orders.get(o.id);
    if (fresh && current?.order?.id === o.id) paint(document.getElementById('view'), (current.order = fresh));
  } catch (e) {
    bad(e);
  }
}

async function changeStatus(o, to) {
  if (to === o.status) return;
  const patch = { status: to };
  if (to === 'cancelled' && !(await confirmDialog(L('إلغاء الطلب؟ القطع بترجع للمخزون.', 'Cancel this order? Its items go back to stock.'), { okLabel: L('إلغاء الطلب', 'Cancel order'), danger: true })))
    return;
  if (to === 'shipped' && !o.tracking_no) {
    const r = await dialog({
      title: L('بيانات الشحنة', 'Shipment details'),
      body: `<p class="muted">${esc(L('اختياري — يظهر للعميل في صفحة التتبّع والإيميل.', 'Optional — shown to the customer on the tracking page and email.'))}</p>
        <div class="grid-2"><label class="f"><span>${esc(L('شركة الشحن', 'Courier'))}</span><select name="courier"><option value="">—</option>${COURIERS.map((c) => `<option ${c === o.courier ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
        <label class="f"><span>${esc(L('رقم الشحنة', 'Tracking no.'))}</span><input name="tracking_no" dir="ltr" autocomplete="off"></label></div>`,
      actions: [
        { label: L('رجوع', 'Back'), value: '', cls: 'b-ghost' },
        { label: L('تم الشحن', 'Mark shipped'), value: 'ok', cls: 'b-primary' },
      ],
    });
    if (!r) return;
    if (r.data.courier) patch.courier = r.data.courier;
    if (r.data.tracking_no) patch.tracking_no = r.data.tracking_no.trim();
  }
  const from = o.status;
  const next = await apply(() => api().orders.update(o.id, patch, actor()));
  if (!next) return;
  toast(L(`الحالة الآن: ${statusName(to)}`, `Status: ${statusName(to)}`), {
    tone: 'ok',
    action: { label: L('تراجع', 'Undo'), onClick: () => apply(() => api().orders.update(o.id, { status: from }, actor())) },
  });
  if (notify && next.customer_email && EMAIL_STATUSES.includes(to)) emailStatus(next);
}

function bind(el, o) {
  el.addEventListener('click', async (e) => {
    const st = e.target.closest('[data-status]');
    if (st) return changeStatus(o, st.dataset.status);
    const ri = e.target.closest('[data-remove-item]');
    if (ri) {
      if (o.items.length <= 1) return bad(new Error(L('الطلب لازم يبقى فيه قطعة — ألغِ الطلب بدلًا من ذلك', 'An order needs at least one item — cancel it instead')));
      if (await confirmDialog(L('حذف هذي القطعة من الطلب؟', 'Remove this item from the order?'), { danger: true, okLabel: L('حذف', 'Remove') }))
        apply(() => api().items.remove(o.id, ri.dataset.removeItem, actor()), L('انحذفت القطعة', 'Item removed'));
      return;
    }
    const rp = e.target.closest('[data-remove-pay]');
    if (rp) {
      if (await confirmDialog(L('حذف هذي الدفعة؟', 'Delete this payment record?'), { danger: true, okLabel: L('حذف', 'Delete') }))
        apply(() => api().payments.remove(o.id, rp.dataset.removePay, actor()), L('انحذفت الدفعة', 'Payment removed'));
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'print') {
      document.getElementById('invoice').innerHTML = invoiceHTML(o);
      window.print();
    } else if (act === 'link') copy(trackUrl(o));
    else if (act === 'delete') {
      if (!(await confirmDialog(L(`حذف ${o.order_no} نهائيًا؟ ما يمديك تتراجع. (الأفضل تلغيه)`, `Delete ${o.order_no} for good? This can’t be undone. (Cancelling is usually better.)`), { danger: true, okLabel: L('حذف نهائي', 'Delete forever') })))
        return;
      await busy(null, async () => {
        await api().orders.remove(o.id);
        await reload(['orders', 'products']);
      }, L('انحذف الطلب', 'Order deleted'));
      go('#/orders');
    } else if (act === 'paid') {
      apply(() => api().payments.add(o.id, { amount: balanceOf(o), method: o.payment_method === 'cod' ? 'cash' : o.payment_method }, actor()), L('تم تسجيل الدفعة', 'Payment recorded'));
    } else if (act === 'pay' || act === 'refund') {
      const refund = act === 'refund';
      const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      const r = await dialog({
        title: refund ? L('استرجاع مبلغ', 'Refund') : L('تسجيل دفعة', 'Record a payment'),
        body: `<div class="grid-2">
          <label class="f"><span>${esc(L('المبلغ (ر.س)', 'Amount (SAR)'))}</span><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required value="${refund ? o.paid_amount : balanceOf(o) || ''}"></label>
          <label class="f"><span>${esc(L('الطريقة', 'Method'))}</span><select name="method">${statusOptions(PAYMENT_METHODS.filter((m) => (refund ? true : m.id !== 'refund')), refund ? 'refund' : o.payment_method === 'cod' ? 'cash' : o.payment_method)}</select></label>
          <label class="f"><span>${esc(L('رقم المرجع (اختياري)', 'Reference (optional)'))}</span><input name="reference" dir="ltr"></label>
          <label class="f"><span>${esc(L('التاريخ', 'Date'))}</span><input name="paid_at" type="datetime-local" value="${now}"></label>
        </div>
        <label class="f"><span>${esc(refund ? L('السبب', 'Reason') : L('ملاحظة', 'Note'))}</span><input name="note"></label>`,
        actions: [
          { label: L('إلغاء', 'Cancel'), value: '', cls: 'b-ghost' },
          { label: refund ? L('سجّل الاسترجاع', 'Record refund') : L('سجّل الدفعة', 'Record payment'), value: 'ok', cls: 'b-primary', submit: true },
        ],
      });
      if (!r) return;
      const amount = Math.abs(Number(r.data.amount)) * (refund ? -1 : 1);
      apply(
        () =>
          api().payments.add(
            o.id,
            { amount, method: r.data.method, reference: r.data.reference || null, note: r.data.note || null, paid_at: r.data.paid_at ? new Date(r.data.paid_at).toISOString() : undefined },
            actor(),
          ),
        refund ? L('تم تسجيل الاسترجاع', 'Refund recorded') : L('تم تسجيل الدفعة', 'Payment recorded'),
      );
    } else if (act === 'add-item') {
      const first = store.products.find((p) => p.active && !p.out_of_stock) || store.products[0];
      const r = await dialog({
        title: L('أضف قطعة', 'Add an item'),
        body: `<label class="f"><span>${esc(L('المنتج', 'Product'))}</span><select name="pid" data-pid>${productOptions(first?.id)}</select></label>
          <div class="grid-2" data-sizes>${sizeFields(first)}</div>
          <div class="grid-2">
            <label class="f"><span>${esc(L('الكمية', 'Quantity'))}</span><input name="qty" type="number" min="1" max="99" value="1" required></label>
            <label class="f"><span>${esc(L('سعر القطعة', 'Unit price'))}</span><input name="unit_price" type="number" min="0" step="0.01" value="${first?.price ?? ''}" required></label>
          </div>`,
        actions: [
          { label: L('إلغاء', 'Cancel'), value: '', cls: 'b-ghost' },
          { label: L('أضف', 'Add'), value: 'ok', cls: 'b-primary', submit: true },
        ],
        onOpen: (d) => {
          d.querySelector('[data-pid]').onchange = (ev) => {
            const p = store.products.find((x) => x.id === ev.target.value);
            d.querySelector('[data-sizes]').innerHTML = sizeFields(p);
            d.querySelector('[name=unit_price]').value = p?.price ?? '';
          };
        },
      });
      if (!r) return;
      const prod = store.products.find((p) => p.id === r.data.pid);
      apply(() => api().items.add(o.id, { pid: r.data.pid, qty: Number(r.data.qty), unit_price: Number(r.data.unit_price), ...readSize(prod, r.data) }, actor()), L('انضافت القطعة', 'Item added'));
    } else if (act === 'edit-customer') {
      const f = (name, label, attrs = '') => `<label class="f"><span>${esc(label)}</span><input name="${name}" value="${esc(o[name] || '')}" ${attrs}></label>`;
      const r = await dialog({
        title: L('بيانات العميل', 'Customer details'),
        body: `<div class="grid-2">${f('customer_name', L('الاسم', 'Name'), 'required maxlength="120"')}${f('customer_phone', L('الجوال', 'Phone'), 'required dir="ltr" inputmode="tel" pattern="\\+?[0-9 ]{9,18}"')}</div>
          ${f('customer_email', L('البريد', 'Email'), 'type="email" dir="ltr"')}
          <div class="grid-2">${f('city', L('المدينة', 'City'))}${f('district', L('الحي', 'District'))}</div>
          ${f('address', L('العنوان', 'Address'))}
          <label class="f"><span>${esc(L('لغة الإيميلات', 'Email language'))}</span><select name="lang"><option value="ar" ${o.lang !== 'en' ? 'selected' : ''}>عربي</option><option value="en" ${o.lang === 'en' ? 'selected' : ''}>English</option></select></label>`,
        actions: [
          { label: L('إلغاء', 'Cancel'), value: '', cls: 'b-ghost' },
          { label: L('حفظ', 'Save'), value: 'ok', cls: 'b-primary', submit: true },
        ],
      });
      if (!r) return;
      apply(() => api().orders.update(o.id, { ...r.data, customer_email: r.data.customer_email.trim().toLowerCase() }, actor()), L('انحفظت البيانات', 'Saved'));
    } else if (act === 'email-status') {
      e.target.closest('button').classList.add('is-busy');
      await emailStatus(o);
    } else if (act === 'email-custom') {
      const r = await dialog({
        title: L('رسالة للعميل', 'Message the customer'),
        body: `<p class="muted">${esc(L(`تنرسل لـ ${o.customer_email} بقالب زوووط، ومعها ملخص الطلب.`, `Sent to ${o.customer_email} in the ZOOOT template, with the order summary.`))}</p>
          <label class="f"><span>${esc(L('العنوان', 'Subject'))}</span><input name="subject" required maxlength="140" value="${esc(L(`بخصوص طلبك ${o.order_no}`, `About your order ${o.order_no}`))}"></label>
          <label class="f"><span>${esc(L('الرسالة', 'Message'))}</span><textarea name="message" required maxlength="4000" rows="6"></textarea></label>`,
        actions: [
          { label: L('إلغاء', 'Cancel'), value: '', cls: 'b-ghost' },
          { label: L('أرسل', 'Send'), value: 'ok', cls: 'b-primary', submit: true },
        ],
      });
      if (!r) return;
      const res = await busy(null, () => api().emails.send('custom', { order_id: o.id, subject: r.data.subject, message: r.data.message }, actor()));
      if (res) {
        ok(res.status === 'preview' ? L('انحفظت في صندوق المعاينة (تجريبي)', 'Saved to the preview outbox (demo)') : L('تم الإرسال', 'Sent'));
        const fresh = await api().orders.get(o.id);
        if (fresh) paint(document.getElementById('view'), (current.order = fresh));
      }
    }
  });

  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-notify]')) {
      notify = t.checked;
      return;
    }
    if (t.matches('[data-price]')) {
      if (t.value === '' || Number(t.value) < 0) return (t.value = o.items.find((x) => x.id === t.dataset.price)?.unit_price);
      return apply(() => api().items.update(o.id, t.dataset.price, { unit_price: Number(t.value) }, actor()), L('تعدّل السعر', 'Price updated'));
    }
    if (t.matches('[data-qty]')) return apply(() => api().items.update(o.id, t.dataset.qty, { qty: Number(t.value) }, actor()));
    if (t.matches('[data-field]')) {
      const k = t.dataset.field;
      let v = ['discount', 'shipping'].includes(k) ? Math.max(0, Number(t.value) || 0) : t.value.trim();
      if (k === 'delivery_eta' && v) v = new Date(v).toISOString();
      if ((o[k] ?? '') === v || (o[k] == null && v === '')) return;
      return apply(() => api().orders.update(o.id, { [k]: v }, actor()), L('انحفظ', 'Saved'));
    }
  });

  el.querySelector('[data-note]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = e.target.note.value.trim();
    if (text) apply(() => api().orders.addNote(o.id, text, actor()), L('انضافت الملاحظة', 'Note added'));
  });
}

export default {
  title: (p) => p.no,
  render(host, { params, soft }) {
    const my = ++token;
    if (!soft || current?.no !== params.no) {
      notify = null;
      const cached = store.orders.find((o) => o.order_no === params.no);
      if (cached && current?.no !== params.no) paint(host, { events: [], ...cached });
      else if (!cached) host.innerHTML = `<div class="card" style="min-height:240px"></div>`;
    }
    api()
      .orders.get(params.no)
      .then((o) => {
        if (my !== token) return;
        if (!o) {
          current = null;
          mount(host, `<div class="card">${empty(L(`ما لقينا الطلب ${params.no}`, `Order ${params.no} wasn’t found`), `<a class="b" href="#/orders">${esc(L('كل الطلبات', 'All orders'))}</a>`)}</div>`);
          return;
        }
        current = { no: params.no, order: o };
        paint(host, o);
      })
      .catch((e) => my === token && bad(e));
    return () => {
      token++;
    };
  },
};

