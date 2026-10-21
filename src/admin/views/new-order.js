import { FLOW, PAYMENT_METHODS, SIZES, SOURCES, phoneKey, round2 } from '../../js/backend/model.js';
import { go, reload, store } from '../main.js';
import { L, bad, esc, icon, img, money, moneyHTML, num, ok, statusName, tr } from '../ui.js';
import { actor, customerOrders, empty, mount, readSize, statusOptions } from './common.js';

const TYPES = [
  { id: '', ar: 'الكل', en: 'All' },
  { id: 'set', ar: 'أطقم', en: 'Sets' },
  { id: 'hoodie', ar: 'هوديز', en: 'Hoodies' },
  { id: 'sirwal', ar: 'شراويل', en: 'Sirwals' },
  { id: 'other', ar: 'أخرى', en: 'Other' },
];
const CUSTOMER = ['customer_phone', 'customer_name', 'customer_email', 'city', 'district', 'address', 'customer_note'];
const blankMeta = () => ({ source: 'instagram', status: 'confirmed', payment_method: 'cod', paid_full: false, paid_amount: '', discount: '', shipping: '', internal_note: '', lang: 'ar' });
const draft = { lines: [], customer: {}, meta: blankMeta(), filter: { q: '', type: '' } };
let seq = 0;

const prodOf = (line) => store.products.find((p) => p.id === line.pid);

function autoShipping(subtotal) {
  const s = store.settings.public || {};
  const fee = Number(s.shipping_fee) || 0;
  return Number(s.free_shipping_over) > 0 && subtotal >= Number(s.free_shipping_over) ? 0 : fee;
}
function totals() {
  const subtotal = round2(draft.lines.reduce((s, l) => s + Number(l.unit_price || 0) * Number(l.qty || 1), 0));
  const discount = Math.max(0, Number(draft.meta.discount) || 0);
  const shipping = draft.meta.shipping === '' ? autoShipping(subtotal) : Math.max(0, Number(draft.meta.shipping) || 0);
  const total = round2(Math.max(0, subtotal - discount + shipping));
  return { subtotal, discount, shipping, total };
}

function pickerHTML() {
  const q = draft.filter.q.toLowerCase();
  const list = store.products.filter(
    (p) =>
      p.active &&
      (!draft.filter.type || (draft.filter.type === 'other' ? !['set', 'hoodie', 'sirwal'].includes(p.type) : p.type === draft.filter.type)) &&
      (!q || JSON.stringify(p.name).toLowerCase().includes(q) || p.id.includes(q)),
  );
  if (!list.length) return empty(L('ما فيه منتجات', 'No products'));
  return `<div class="picker">${list
    .map((p) => {
      const units = p.stock ? Object.values(p.stock).reduce((s, v) => s + Number(v), 0) : null;
      return `<button type="button" class="pick ${p.out_of_stock || units === 0 ? 'is-out' : ''}" data-add="${esc(p.id)}">
        ${p.images?.[0] ? `<img src="${esc(img(p.images[0]))}" alt="" loading="lazy">` : `<span style="aspect-ratio:4/4.4;border-radius:10px;background:var(--yellow);display:grid;place-items:center;font-weight:900">ZOOOT</span>`}
        <strong style="line-height:1.35">${esc(tr(p.name))}</strong>
        <span class="spread"><span class="num">${esc(money(p.price))}</span>${p.out_of_stock ? `<span class="badge" style="--c:var(--bad)"><i></i>${esc(L('نفد', 'Out'))}</span>` : units !== null ? `<small class="muted">${num(units)} ${esc(L('متوفر', 'in stock'))}</small>` : ''}</span>
      </button>`;
    })
    .join('')}</div>`;
}

/** Small inline size selects for a cart line (sets get hoodie + sirwal). */
function sizePickers(p, l) {
  const sel = (name, label, list, v) =>
    `<label class="row" style="gap:4px;font-size:12px;font-weight:700"><span class="muted">${esc(label)}</span><select class="in" name="${name}" style="min-height:32px;width:auto;padding-block:2px;font-size:13px">${list
      .map((s) => `<option ${s === v ? 'selected' : ''}>${s}</option>`)
      .join('')}</select></label>`;
  if (p?.type === 'set') return sel('hoodie', L('هودي', 'Hoodie'), SIZES, l.hoodie) + sel('sirwal', L('شروال', 'Sirwal'), SIZES, l.sirwal);
  if (p?.sizes?.length) return sel('size', L('المقاس', 'Size'), p.sizes, l.size);
  return '';
}

function linesHTML() {
  if (!draft.lines.length) return `<p class="muted" style="padding:14px 0">${esc(L('اختر منتجات من فوق عشان تضيفها للطلب.', 'Tap products above to add them to the order.'))}</p>`;
  return `<div class="line-items">${draft.lines
    .map((l) => {
      const p = prodOf(l);
      return `<div class="li" data-line="${l.key}">
        ${p?.images?.[0] ? `<img src="${esc(img(p.images[0]))}" alt="">` : `<span style="width:56px;height:66px;border-radius:10px;background:var(--yellow)"></span>`}
        <div style="display:grid;gap:6px;min-width:0"><div class="li-name">${esc(tr(p?.name) || '—')}</div><div class="row" style="gap:6px">${sizePickers(p, l)}</div></div>
        <div class="li-edit">
          <input class="in" type="number" name="unit_price" min="0" step="0.01" inputmode="decimal" value="${esc(l.unit_price)}" aria-label="${esc(L('سعر القطعة', 'Unit price'))}">
          <span class="muted">×</span>
          <input class="in qty" type="number" name="qty" min="1" max="99" inputmode="numeric" value="${esc(l.qty)}" aria-label="${esc(L('الكمية', 'Quantity'))}">
        </div>
        <span class="line-total">${esc(money(Number(l.unit_price || 0) * Number(l.qty || 1)))}</span>
        <button class="b b-ghost b-sm b-icon" type="button" data-drop="${l.key}" aria-label="${esc(L('احذف', 'Remove'))}">${icon('trash')}</button>
      </div>`;
    })
    .join('')}</div>`;
}

function summaryHTML() {
  const t = totals();
  return `<div class="totals" style="margin-top:0">
    <div class="spread"><span>${esc(L('المجموع الفرعي', 'Subtotal'))}</span><span class="num">${esc(money(t.subtotal))}</span></div>
    ${t.discount ? `<div class="spread"><span>${esc(L('الخصم', 'Discount'))}</span><span class="num">-${esc(money(t.discount))}</span></div>` : ''}
    <div class="spread"><span>${esc(L('الشحن', 'Shipping'))}</span><span class="num">${t.shipping ? esc(money(t.shipping)) : esc(L('مجاني', 'Free'))}</span></div>
    <div class="spread grand"><span>${esc(L('الإجمالي', 'Total'))}</span><span>${moneyHTML(t.total)}</span></div>
  </div>`;
}

function prefillFrom(o) {
  for (const k of CUSTOMER.filter((x) => x !== 'customer_note')) if (o[k]) draft.customer[k] = o[k];
  draft.meta.lang = o.lang || 'ar';
}

export default {
  live: false,
  render(host, { query }) {
    if (query.phone && phoneKey(query.phone) !== phoneKey(draft.customer.customer_phone)) {
      const prev = customerOrders(query.phone)[0];
      draft.customer = { customer_phone: query.phone };
      if (prev) prefillFrom(prev);
    }
    const c = draft.customer;
    const m = draft.meta;
    const field = (name, label, attrs = '') => `<label class="f"><span>${esc(label)}</span><input name="${name}" value="${esc(c[name] || '')}" ${attrs}></label>`;

    const el = mount(
      host,
      `<form class="cols" data-form novalidate>
        <div style="display:grid;gap:18px;min-width:0">
          <section class="card">
            <div class="card-h"><h2>${esc(L('اختر القطع', 'Pick items'))}</h2><small>${esc(L('اضغط للإضافة', 'Tap to add'))}</small></div>
            <div class="toolbar" style="margin-bottom:12px">
              <label class="search grow" style="width:auto"><span class="sr">${esc(L('بحث', 'Search'))}</span>${icon('search')}<input class="in" type="search" data-pq value="${esc(draft.filter.q)}" placeholder="${esc(L('ابحث عن منتج…', 'Search products…'))}"></label>
              <div class="chips">${TYPES.map((t) => `<button class="chip" type="button" data-type="${t.id}" aria-pressed="${draft.filter.type === t.id}">${esc(L(t.ar, t.en))}</button>`).join('')}</div>
            </div>
            <div data-picker>${pickerHTML()}</div>
          </section>
          <section class="card">
            <div class="card-h"><h2>${esc(L('الطلب', 'Order'))} <span class="muted num" data-count></span></h2>${draft.lines.length ? `<button class="b b-sm b-ghost" type="button" data-clear>${icon('x')}${esc(L('ابدأ من جديد', 'Start over'))}</button>` : ''}</div>
            <div data-lines>${linesHTML()}</div>
          </section>
        </div>

        <aside class="sticky-sum" style="display:grid;gap:18px;min-width:0">
          <section class="card" style="display:grid;gap:12px">
            <div class="card-h" style="margin:0"><h2>${esc(L('العميل', 'Customer'))}</h2></div>
            ${field('customer_phone', L('الجوال *', 'Phone *'), 'required dir="ltr" inputmode="tel" autocomplete="off" placeholder="05XXXXXXXX"')}
            <div data-suggest></div>
            ${field('customer_name', L('الاسم *', 'Name *'), 'required maxlength="120" autocomplete="off"')}
            ${field('customer_email', L('البريد (لإيميلات الطلب)', 'Email (for order emails)'), 'type="email" dir="ltr" autocomplete="off"')}
            <div class="grid-2">${field('city', L('المدينة', 'City'))}${field('district', L('الحي', 'District'))}</div>
            ${field('address', L('العنوان', 'Address'))}
          </section>
          <section class="card" style="display:grid;gap:12px">
            <div class="grid-2">
              <label class="f"><span>${esc(L('المصدر', 'Source'))}</span><select name="source">${statusOptions(SOURCES.filter((s) => s.id !== 'web'), m.source)}</select></label>
              <label class="f"><span>${esc(L('الحالة', 'Status'))}</span><select name="status">${FLOW.map((s) => `<option value="${s}" ${s === m.status ? 'selected' : ''}>${esc(statusName(s))}</option>`).join('')}</select></label>
              <label class="f"><span>${esc(L('طريقة الدفع', 'Payment method'))}</span><select name="payment_method">${statusOptions(PAYMENT_METHODS.filter((x) => x.id !== 'refund'), m.payment_method)}</select></label>
              <label class="f"><span>${esc(L('لغة الإيميلات', 'Email language'))}</span><select name="lang"><option value="ar" ${m.lang !== 'en' ? 'selected' : ''}>عربي</option><option value="en" ${m.lang === 'en' ? 'selected' : ''}>English</option></select></label>
              <label class="f"><span>${esc(L('خصم (ر.س)', 'Discount (SAR)'))}</span><input name="discount" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(m.discount)}" placeholder="0"></label>
              <label class="f"><span>${esc(L('شحن (ر.س)', 'Shipping (SAR)'))}</span><input name="shipping" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(m.shipping)}" placeholder="${esc(L('تلقائي', 'Auto'))}"></label>
            </div>
            <label class="switch"><input type="checkbox" name="paid_full" ${m.paid_full ? 'checked' : ''}>${esc(L('العميل دفع المبلغ كامل', 'Customer paid in full'))}</label>
            <label class="f" data-partial ${m.paid_full ? 'hidden' : ''}><span>${esc(L('أو مبلغ مدفوع مقدمًا', 'Or amount paid upfront'))}</span><input name="paid_amount" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(m.paid_amount)}" placeholder="0"></label>
            <label class="f"><span>${esc(L('ملاحظة العميل', 'Customer note'))}</span><input name="customer_note" value="${esc(c.customer_note || '')}"></label>
            <label class="f"><span>${esc(L('ملاحظة داخلية', 'Internal note'))}</span><input name="internal_note" value="${esc(m.internal_note)}"></label>
            <div data-summary>${summaryHTML()}</div>
            <button class="b b-primary" type="submit" style="min-height:50px">${icon('check')}${esc(L('أنشئ الطلب', 'Create order'))}</button>
          </section>
        </aside>
      </form>`,
    );

    const form = el.querySelector('form');
    const paintLines = () => {
      el.querySelector('[data-lines]').innerHTML = linesHTML();
      el.querySelector('[data-summary]').innerHTML = summaryHTML();
      const n = draft.lines.reduce((s, l) => s + Number(l.qty || 1), 0);
      el.querySelector('[data-count]').textContent = n ? `(${n})` : '';
    };
    paintLines();

    const suggest = () => {
      const box = el.querySelector('[data-suggest]');
      const key = phoneKey(c.customer_phone);
      const prev = key.length >= 9 ? customerOrders(c.customer_phone)[0] : null;
      box.innerHTML =
        prev && prev.customer_name !== c.customer_name
          ? `<button class="b b-sm" type="button" data-fill style="justify-content:flex-start;white-space:normal;text-align:start">${icon('refresh')}${esc(L(`عميل سابق: ${prev.customer_name} · ${prev.city || ''} — عبّي بياناته`, `Returning customer: ${prev.customer_name} · ${prev.city || ''} — fill details`))}</button>`
          : '';
    };
    suggest();

    const addLine = (pid) => {
      const p = store.products.find((x) => x.id === pid);
      if (!p) return;
      const def = p.sizes?.length ? (p.sizes.includes('M') ? 'M' : p.sizes[0]) : null;
      draft.lines.push({ key: ++seq, pid, qty: 1, unit_price: p.price, size: def, hoodie: 'L', sirwal: 'M' });
      paintLines();
      if (draft.lines.length === 1) render();
      ok(L(`انضاف: ${tr(p.name)}`, `Added: ${tr(p.name)}`));
    };
    const render = () => this.render(host, { query: {} });

    el.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) return addLine(add.dataset.add);
      const drop = e.target.closest('[data-drop]');
      if (drop) {
        draft.lines = draft.lines.filter((l) => String(l.key) !== drop.dataset.drop);
        return paintLines();
      }
      const type = e.target.closest('[data-type]');
      if (type) {
        draft.filter.type = type.dataset.type;
        el.querySelectorAll('[data-type]').forEach((b) => b.setAttribute('aria-pressed', String(b === type)));
        el.querySelector('[data-picker]').innerHTML = pickerHTML();
        return;
      }
      if (e.target.closest('[data-fill]')) {
        prefillFrom(customerOrders(c.customer_phone)[0]);
        return render();
      }
      if (e.target.closest('[data-clear]')) {
        Object.assign(draft, { lines: [], customer: {}, meta: blankMeta() });
        return render();
      }
    });

    el.querySelector('[data-pq]').addEventListener('input', (e) => {
      draft.filter.q = e.target.value.trim();
      el.querySelector('[data-picker]').innerHTML = pickerHTML();
    });

    form.addEventListener('input', (e) => {
      const t = e.target;
      const line = t.closest('[data-line]');
      if (line) {
        const l = draft.lines.find((x) => String(x.key) === line.dataset.line);
        l[t.name] = t.value;
        if (t.name === 'qty' || t.name === 'unit_price') {
          line.querySelector('.line-total').textContent = money(Number(l.unit_price || 0) * Number(l.qty || 1));
          el.querySelector('[data-summary]').innerHTML = summaryHTML();
        }
        return;
      }
      if (!t.name || t.matches('[data-pq]')) return;
      if (CUSTOMER.includes(t.name)) c[t.name] = t.value;
      else m[t.name] = t.type === 'checkbox' ? t.checked : t.value;
      if (t.name === 'customer_phone') suggest();
      if (t.name === 'paid_full') el.querySelector('[data-partial]').hidden = t.checked;
      if (['discount', 'shipping'].includes(t.name)) el.querySelector('[data-summary]').innerHTML = summaryHTML();
      t.closest('.f')?.classList.remove('is-invalid');
    });
    form.addEventListener('change', (e) => {
      const line = e.target.closest('[data-line]');
      if (line && e.target.tagName === 'SELECT') draft.lines.find((x) => String(x.key) === line.dataset.line)[e.target.name] = e.target.value;
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const invalid = [];
      if (!draft.lines.length) return bad(new Error('invalid_items'));
      if (!/^\+?[0-9 ]{9,18}$/.test(String(c.customer_phone || '').trim())) invalid.push('customer_phone');
      if (!String(c.customer_name || '').trim()) invalid.push('customer_name');
      if (c.customer_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.customer_email.trim())) invalid.push('customer_email');
      if (invalid.length) {
        invalid.forEach((n) => form.elements[n].closest('.f').classList.add('is-invalid'));
        form.elements[invalid[0]].focus();
        return bad(new Error(invalid[0] === 'customer_phone' ? 'invalid_phone' : invalid[0] === 'customer_email' ? 'invalid_email' : 'invalid_name'));
      }
      const t = totals();
      const payload = {
        ...Object.fromEntries(CUSTOMER.map((k) => [k, String(c[k] || '').trim() || null])),
        customer_phone: String(c.customer_phone).trim(),
        customer_email: c.customer_email ? c.customer_email.trim().toLowerCase() : null,
        source: m.source,
        status: m.status,
        payment_method: m.payment_method,
        lang: m.lang,
        discount: t.discount,
        shipping: m.shipping === '' ? undefined : t.shipping,
        paid_amount: m.paid_full ? t.total : Math.min(t.total, Math.max(0, Number(m.paid_amount) || 0)),
        internal_note: m.internal_note || null,
        items: draft.lines.map((l) => {
          const p = prodOf(l);
          return { pid: l.pid, qty: Math.max(1, Number(l.qty) || 1), unit_price: String(round2(Number(l.unit_price) || 0)), image: p?.images?.[0] || null, ...readSize(p, l) };
        }),
      };
      const btn = form.querySelector('[type=submit]');
      btn.classList.add('is-busy');
      try {
        const o = await store.api.orders.create(payload, actor());
        store.selfCreated.add(o.id);
        Object.assign(draft, { lines: [], customer: {}, meta: blankMeta() });
        await reload(['orders', 'products']);
        ok(L(`تم إنشاء الطلب ${o.order_no}`, `Order ${o.order_no} created`));
        go(`#/orders/${o.order_no}`);
      } catch (ex) {
        console.error(ex);
        bad(ex);
        btn.classList.remove('is-busy');
      }
    });
    return null;
  },
};
