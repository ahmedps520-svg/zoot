import { FLOW, ORDER_STATUSES, PAYMENT_STATUSES, SOURCES, phoneKey } from '../../js/backend/model.js';
import { reload, render, store } from '../main.js';
import { ago, csv, dateTime, download, esc, icon, L, money, methodName, num, payBadge, sourceName, statusBadge, statusName, tr } from '../ui.js';
import { actor, balanceOf, busy, demoBanner, bindDemoBanner, empty, itemsSummary, mount, statusOptions, thumbs, unitsOf } from './common.js';

const state = { q: '', status: '', pay: '', source: '', view: '', limit: 60 };
const selected = new Set();
const VIEW_KEY = 'zooot-hq-orders-view';

function matches(o, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  const digits = q.replace(/\D/g, '');
  return (
    o.order_no.toLowerCase().includes(needle) ||
    (o.customer_name || '').toLowerCase().includes(needle) ||
    (o.customer_email || '').toLowerCase().includes(needle) ||
    (o.city || '').toLowerCase().includes(needle) ||
    (o.tracking_no || '').toLowerCase().includes(needle) ||
    (digits.length >= 4 && phoneKey(o.customer_phone).includes(digits.slice(-9))) ||
    (o.items || []).some((it) => JSON.stringify(it.name).toLowerCase().includes(needle))
  );
}

function filtered({ ignoreStatus = false } = {}) {
  return store.orders.filter(
    (o) =>
      (ignoreStatus || !state.status || (state.status === 'open' ? !['delivered', 'cancelled'].includes(o.status) : o.status === state.status)) &&
      (!state.pay || o.payment_status === state.pay) &&
      (!state.source || o.source === state.source) &&
      matches(o, state.q),
  );
}

function syncUrl() {
  const qs = new URLSearchParams(Object.entries({ q: state.q, status: state.status, pay: state.pay, source: state.source }).filter(([, v]) => v)).toString();
  history.replaceState(null, '', `#/orders${qs ? `?${qs}` : ''}`);
}

export function exportCSV(list, name = 'zooot-orders') {
  const rows = [
    ['order_no', 'created_at', 'status', 'payment_status', 'payment_method', 'source', 'customer_name', 'customer_phone', 'customer_email', 'city', 'district', 'address', 'items', 'units', 'subtotal', 'discount', 'shipping', 'total', 'paid', 'balance', 'courier', 'tracking_no', 'customer_note', 'internal_note'],
    ...list.map((o) => [
      o.order_no,
      o.created_at,
      o.status,
      o.payment_status,
      o.payment_method,
      o.source,
      o.customer_name,
      o.customer_phone,
      o.customer_email,
      o.city,
      o.district,
      o.address,
      itemsSummary(o),
      unitsOf(o),
      o.subtotal,
      o.discount,
      o.shipping,
      o.total,
      o.paid_amount,
      balanceOf(o),
      o.courier,
      o.tracking_no,
      o.customer_note,
      o.internal_note,
    ]),
  ];
  download(`${name}-${new Date().toISOString().slice(0, 10)}.csv`, csv(rows), 'text/csv;charset=utf-8');
}

function nextOf(status) {
  const i = FLOW.indexOf(status);
  return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null;
}

function listHTML(list) {
  if (!list.length) return `<div class="card">${empty(L('ما فيه طلبات تطابق البحث', 'No orders match these filters'))}</div>`;
  const shown = list.slice(0, state.limit);
  const all = shown.every((o) => selected.has(o.id));
  return `<div class="card" style="padding-top:6px">
    <div class="t-wrap"><table class="t">
      <thead><tr>
        <th style="width:28px" class="hide-s"><label class="check"><input type="checkbox" data-all ${all ? 'checked' : ''} aria-label="${esc(L('تحديد الكل', 'Select all'))}"></label></th>
        <th>${esc(L('الطلب', 'Order'))}</th><th>${esc(L('العميل', 'Customer'))}</th><th class="hide-s">${esc(L('القطع', 'Items'))}</th>
        <th class="hide-s">${esc(L('الحالة', 'Status'))}</th><th class="hide-s">${esc(L('الدفع', 'Payment'))}</th><th class="end">${esc(L('الإجمالي', 'Total'))}</th>
      </tr></thead>
      <tbody>${shown
        .map(
          (o) => `<tr data-href="#/orders/${esc(o.order_no)}">
          <td class="hide-s"><label class="check"><input type="checkbox" data-sel="${esc(o.id)}" ${selected.has(o.id) ? 'checked' : ''} aria-label="${esc(o.order_no)}"></label></td>
          <td><a class="num nowrap" href="#/orders/${esc(o.order_no)}" dir="ltr">${esc(o.order_no)}</a><br><small class="muted nowrap" title="${esc(dateTime(o.created_at))}">${esc(ago(o.created_at))}<span class="hide-s"> · ${esc(sourceName(o.source))}</span></small></td>
          <td><div class="cust"><span>${esc(o.customer_name)}</span><small dir="ltr" style="text-align:start">${esc(o.customer_phone)}${o.city ? `<span class="hide-s"> · ${esc(o.city)}</span>` : ''}</small><span class="show-s" style="margin-top:4px;gap:4px;flex-wrap:wrap">${statusBadge(o.status)}${o.payment_status !== 'paid' ? payBadge(o.payment_status) : ''}</span></div></td>
          <td class="hide-s"><div class="row" style="gap:8px;flex-wrap:nowrap">${thumbs(o)}<small class="muted">${num(unitsOf(o))} ${esc(L('قطعة', 'pcs'))}</small></div></td>
          <td class="hide-s">${statusBadge(o.status)}</td>
          <td class="hide-s">${payBadge(o.payment_status)}<br><small class="muted">${esc(methodName(o.payment_method))}</small></td>
          <td class="end"><span class="num nowrap">${esc(money(o.total))}</span>${balanceOf(o) > 0 && o.payment_status !== 'unpaid' ? `<br><small style="color:var(--bad)">${esc(L('باقي', 'due'))} ${esc(money(balanceOf(o)))}</small>` : ''}</td>
        </tr>`,
        )
        .join('')}</tbody>
    </table></div>
    ${list.length > shown.length ? `<div class="row" style="justify-content:center;margin-top:12px"><button class="b" type="button" data-more>${esc(L(`عرض المزيد (${list.length - shown.length})`, `Show more (${list.length - shown.length})`))}</button></div>` : ''}
  </div>`;
}

function boardHTML(list) {
  const cols = [...FLOW, 'cancelled'];
  return `<div class="board" role="list">${cols
    .map((s) => {
      const items = list.filter((o) => o.status === s);
      const sum = items.reduce((a, o) => a + Number(o.total), 0);
      return `<section class="col" data-col="${s}" role="listitem" aria-label="${esc(statusName(s))}">
        <div class="col-h">${statusBadge(s)}<span class="num">${num(items.length)} · ${esc(money(sum))}</span></div>
        ${items
          .slice(0, 40)
          .map((o) => {
            const nx = nextOf(o.status);
            return `<article class="kcard" draggable="true" data-id="${esc(o.id)}">
              <div class="spread"><a class="num" href="#/orders/${esc(o.order_no)}" dir="ltr">${esc(o.order_no)}</a><strong>${esc(money(o.total))}</strong></div>
              <div class="spread"><span>${esc(o.customer_name)}</span><small class="muted">${esc(ago(o.created_at))}</small></div>
              <div class="spread">${thumbs(o)}${payBadge(o.payment_status)}</div>
              ${nx ? `<button class="b b-sm" type="button" data-advance="${esc(o.id)}" data-to="${nx}">${esc(statusName(nx))} ${icon('arrow')}</button>` : ''}
            </article>`;
          })
          .join('')}
        ${items.length > 40 ? `<a class="muted" style="text-align:center;font-size:12px" href="#/orders?status=${s}">+${items.length - 40}</a>` : ''}
        ${items.length ? '' : `<p class="muted" style="text-align:center;font-size:12.5px;padding:18px 0">${esc(L('اسحب طلب هنا', 'Drop an order here'))}</p>`}
      </section>`;
    })
    .join('')}</div>`;
}

async function setStatus(ids, status, btn) {
  await busy(btn, async () => {
    for (const id of ids) await store.api.orders.update(id, { status }, actor());
    await reload(['orders', 'products']);
  }, L(`تم تحديث ${ids.length} طلب`, `Updated ${ids.length} order(s)`));
  render({ soft: true, force: true });
}

export default {
  render(host, { query, soft }) {
    if (!soft) {
      Object.assign(state, { q: query.q || '', status: query.status || '', pay: query.pay || '', source: query.source || '', limit: 60 });
      let saved = '';
      try {
        saved = localStorage.getItem(VIEW_KEY) || '';
      } catch {
        /* ignore */
      }
      state.view = query.view || saved || 'list';
    }
    const base = filtered({ ignoreStatus: true });
    const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s.id, base.filter((o) => o.status === s.id).length]));
    const open = base.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
    const chip = (id, label, n) => `<button class="chip" type="button" data-status="${id}" aria-pressed="${state.status === id}">${esc(label)} <b>${num(n)}</b></button>`;

    const el = mount(
      host,
      `${store.orders.length ? '' : demoBanner()}
      <div class="toolbar">
        <label class="search grow" style="width:auto"><span class="sr">${esc(L('بحث', 'Search'))}</span>${icon('search')}<input class="in" type="search" data-q value="${esc(state.q)}" placeholder="${esc(L('رقم الطلب، الاسم، الجوال، المدينة، رقم الشحنة…', 'Order no., name, phone, city, tracking…'))}"></label>
        <select class="in" data-pay aria-label="${esc(L('حالة الدفع', 'Payment status'))}"><option value="">${esc(L('كل حالات الدفع', 'Any payment'))}</option>${statusOptions(PAYMENT_STATUSES, state.pay)}</select>
        <select class="in" data-source aria-label="${esc(L('المصدر', 'Source'))}"><option value="">${esc(L('كل المصادر', 'Any source'))}</option>${statusOptions(SOURCES, state.source)}</select>
        <div class="seg" role="group" aria-label="${esc(L('طريقة العرض', 'View'))}">
          <button type="button" data-view="list" aria-pressed="${state.view === 'list'}">${icon('list')}${esc(L('قائمة', 'List'))}</button>
          <button type="button" data-view="board" aria-pressed="${state.view === 'board'}">${icon('board')}${esc(L('لوحة', 'Board'))}</button>
        </div>
        <button class="b" type="button" data-csv title="CSV">${icon('download')}<span class="hide-s">CSV</span></button>
        <a class="b b-primary" href="#/new">${icon('plus')}${esc(L('طلب جديد', 'New order'))}</a>
      </div>
      ${
        state.view === 'list'
          ? `<div class="chips" role="group" aria-label="${esc(L('الحالة', 'Status'))}">
        ${chip('', L('الكل', 'All'), base.length)}${chip('open', L('مفتوحة', 'Open'), open)}
        ${ORDER_STATUSES.map((s) => chip(s.id, tr(s), counts[s.id])).join('')}
      </div>`
          : ''
      }
      <div class="banner" data-bulk hidden style="background:var(--ink);color:var(--cream)">
        <span data-bulk-n></span>
        <select class="in" data-bulk-status style="width:auto;min-height:34px"><option value="">${esc(L('غيّر الحالة إلى…', 'Set status to…'))}</option>${statusOptions(ORDER_STATUSES, '')}</select>
        <button class="b b-sm" type="button" data-bulk-csv>${icon('download')}CSV</button>
        <button class="b b-sm b-ghost" type="button" data-bulk-clear style="color:var(--cream)">${icon('x')}${esc(L('إلغاء التحديد', 'Clear'))}</button>
      </div>
      <div data-results></div>`,
    );
    bindDemoBanner(el);

    const results = el.querySelector('[data-results]');
    const bulk = el.querySelector('[data-bulk]');
    const paint = () => {
      const list = filtered();
      results.innerHTML = state.view === 'board' ? boardHTML(filtered({ ignoreStatus: true })) : listHTML(list);
      for (const id of [...selected]) if (!store.orders.some((o) => o.id === id)) selected.delete(id);
      bulk.hidden = !selected.size || state.view === 'board';
      el.querySelector('[data-bulk-n]').textContent = L(`${selected.size} طلب محدد`, `${selected.size} selected`);
    };
    paint();

    let t;
    el.querySelector('[data-q]').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.q = e.target.value.trim();
        state.limit = 60;
        syncUrl();
        paint();
      }, 140);
    });
    el.querySelector('[data-pay]').onchange = (e) => {
      state.pay = e.target.value;
      syncUrl();
      render({ soft: true, force: true });
    };
    el.querySelector('[data-source]').onchange = (e) => {
      state.source = e.target.value;
      syncUrl();
      render({ soft: true, force: true });
    };
    el.querySelector('[data-bulk-status]').onchange = (e) => {
      if (e.target.value) setStatus([...selected], e.target.value, e.target);
    };

    el.addEventListener('click', (e) => {
      const s = e.target.closest('[data-status]');
      if (s) {
        state.status = s.dataset.status;
        syncUrl();
        render({ soft: true, force: true });
        return;
      }
      const v = e.target.closest('[data-view]');
      if (v) {
        state.view = v.dataset.view;
        try {
          localStorage.setItem(VIEW_KEY, state.view);
        } catch {
          /* ignore */
        }
        render({ soft: true, force: true });
        return;
      }
      if (e.target.closest('[data-csv]')) return exportCSV(filtered());
      if (e.target.closest('[data-bulk-csv]')) return exportCSV(store.orders.filter((o) => selected.has(o.id)), 'zooot-orders-selected');
      if (e.target.closest('[data-bulk-clear]')) {
        selected.clear();
        return paint();
      }
      if (e.target.closest('[data-more]')) {
        state.limit += 100;
        return paint();
      }
      const adv = e.target.closest('[data-advance]');
      if (adv) return setStatus([adv.dataset.advance], adv.dataset.to, adv);
      const row = e.target.closest('tr[data-href]');
      if (row && !e.target.closest('a,button,input,label')) location.hash = row.dataset.href;
    });

    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-sel]')) {
        e.target.checked ? selected.add(e.target.dataset.sel) : selected.delete(e.target.dataset.sel);
        paint();
      } else if (e.target.matches('[data-all]')) {
        filtered()
          .slice(0, state.limit)
          .forEach((o) => (e.target.checked ? selected.add(o.id) : selected.delete(o.id)));
        paint();
      }
    });

    // Kanban drag & drop (mouse/trackpad). Touch users get the "next step" button on every card.
    let dragId = null;
    el.addEventListener('dragstart', (e) => {
      const c = e.target.closest('.kcard');
      if (!c) return;
      dragId = c.dataset.id;
      c.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragId);
    });
    el.addEventListener('dragend', (e) => {
      e.target.closest('.kcard')?.classList.remove('is-dragging');
      el.querySelectorAll('.col.is-over').forEach((c) => c.classList.remove('is-over'));
    });
    el.addEventListener('dragover', (e) => {
      const col = e.target.closest('.col');
      if (!col || !dragId) return;
      e.preventDefault();
      el.querySelectorAll('.col.is-over').forEach((c) => c !== col && c.classList.remove('is-over'));
      col.classList.add('is-over');
    });
    el.addEventListener('drop', (e) => {
      const col = e.target.closest('.col');
      if (!col || !dragId) return;
      e.preventDefault();
      const o = store.orders.find((x) => x.id === dragId);
      const to = col.dataset.col;
      dragId = null;
      if (o && o.status !== to) setStatus([o.id], to, null);
      else col.classList.remove('is-over');
    });
    return () => clearTimeout(t);
  },
};

