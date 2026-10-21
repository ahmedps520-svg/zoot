import { phoneKey } from '../../js/backend/model.js';
import { hbars } from '../charts.js';
import { render, store } from '../main.js';
import { L, ago, csv, date, download, esc, icon, money, moneyHTML, num, sourceName } from '../ui.js';
import { balanceOf, empty, live, mount, statTile, waHref } from './common.js';

const state = { q: '', sort: 'spent', limit: 80 };

function customers() {
  const map = new Map();
  // Orders arrive newest first, so the first order seen per phone has the latest details.
  for (const o of store.orders) {
    const k = phoneKey(o.customer_phone) || o.customer_phone;
    let c = map.get(k);
    if (!c) {
      c = { key: k, name: o.customer_name, phone: o.customer_phone, email: o.customer_email, city: o.city, orders: 0, spent: 0, due: 0, units: 0, first: o.created_at, last: o.created_at, sources: new Set(), lang: o.lang };
      map.set(k, c);
    }
    c.email ||= o.customer_email;
    c.city ||= o.city;
    c.first = o.created_at < c.first ? o.created_at : c.first;
    c.sources.add(o.source);
    if (live(o)) {
      c.orders += 1;
      c.spent += Number(o.total);
      c.due += balanceOf(o);
      c.units += o.items.reduce((s, it) => s + it.qty, 0);
    }
  }
  return [...map.values()];
}

function filter(all) {
  const q = state.q.toLowerCase();
  const digits = state.q.replace(/\D/g, '');
  return all
    .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.email || '').includes(q) || (c.city || '').toLowerCase().includes(q) || (digits.length >= 4 && c.key.includes(digits.slice(-9))))
    .sort((a, b) => (state.sort === 'recent' ? b.last.localeCompare(a.last) : state.sort === 'orders' ? b.orders - a.orders || b.spent - a.spent : b.spent - a.spent));
}

function tableHTML(list, top) {
  return top.length
              ? `<div class="t-wrap"><table class="t"><thead><tr><th>${esc(L('العميل', 'Customer'))}</th><th class="end">${esc(L('الطلبات', 'Orders'))}</th><th class="end">${esc(L('الصرف', 'Spent'))}</th><th class="hide-s">${esc(L('آخر طلب', 'Last order'))}</th><th></th></tr></thead><tbody>
            ${top
              .map(
                (c) => `<tr>
                <td><div class="cust"><strong>${esc(c.name)}</strong><small dir="ltr" style="text-align:start">${esc(c.phone)}${c.city ? ` · ${esc(c.city)}` : ''}</small>${c.email ? `<small>${esc(c.email)}</small>` : ''}</div></td>
                <td class="end num">${num(c.orders)}</td>
                <td class="end"><span class="num">${esc(money(c.spent))}</span>${c.due > 0 ? `<br><small style="color:var(--bad)">${esc(L('باقي', 'due'))} ${esc(money(c.due))}</small>` : ''}</td>
                <td class="hide-s"><span title="${esc(date(c.last, { day: 'numeric', month: 'long', year: 'numeric' }))}">${esc(ago(c.last))}</span><br><small class="muted">${[...c.sources].map(sourceName).map(esc).join('، ')}</small></td>
                <td class="end"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">
                  <a class="b b-sm b-wa b-icon" href="${esc(waHref(c.phone))}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon('wa')}</a>
                  <a class="b b-sm b-icon" href="#/orders?q=${encodeURIComponent(c.phone)}" title="${esc(L('طلباته', 'Their orders'))}" aria-label="${esc(L('طلباته', 'Their orders'))}">${icon('orders')}</a>
                  <a class="b b-sm b-icon" href="#/new?phone=${encodeURIComponent(c.phone)}" title="${esc(L('طلب جديد له', 'New order for them'))}" aria-label="${esc(L('طلب جديد له', 'New order for them'))}">${icon('plus')}</a>
                </div></td>
              </tr>`,
              )
              .join('')}</tbody></table></div>
            ${list.length > top.length ? `<div class="row" style="justify-content:center;margin-top:12px"><button class="b" type="button" data-more>${esc(L('عرض المزيد', 'Show more'))}</button></div>` : ''}`
              : empty(L('ما فيه عملاء للحين', 'No customers yet'));
}

export default {
  render(host) {
    const all = customers();
    const list = filter(all);
    const buyers = all.filter((c) => c.orders > 0);
    const repeat = buyers.filter((c) => c.orders > 1).length;
    const ltv = buyers.length ? buyers.reduce((s, c) => s + c.spent, 0) / buyers.length : 0;
    const top = list.slice(0, state.limit);
    const best = buyers
      .slice()
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5)
      .map((c, i) => ({ label: c.name, value: c.spent, accent: i === 0, href: `#/orders?q=${encodeURIComponent(c.phone)}` }));

    const el = mount(
      host,
      `<div class="kpis">
        ${statTile({ label: L('العملاء', 'Customers'), value: `<span class="num">${num(all.length)}</span>` })}
        ${statTile({ label: L('رجعوا يطلبون', 'Came back'), value: `<span class="num">${buyers.length ? Math.round((repeat / buyers.length) * 100) : 0}%</span>`, hint: L(`${repeat} عميل طلب أكثر من مرة`, `${repeat} ordered more than once`) })}
        ${statTile({ label: L('متوسط صرف العميل', 'Avg. spend per customer'), value: moneyHTML(Math.round(ltv)) })}
      </div>
      <div class="cols">
        <section class="card">
          <div class="toolbar" style="margin-bottom:12px">
            <label class="search grow" style="width:auto"><span class="sr">${esc(L('بحث', 'Search'))}</span>${icon('search')}<input class="in" type="search" data-q value="${esc(state.q)}" placeholder="${esc(L('اسم، جوال، مدينة…', 'Name, phone, city…'))}"></label>
            <select class="in" data-sort aria-label="${esc(L('ترتيب', 'Sort'))}">
              <option value="spent" ${state.sort === 'spent' ? 'selected' : ''}>${esc(L('الأعلى صرفًا', 'Top spenders'))}</option>
              <option value="orders" ${state.sort === 'orders' ? 'selected' : ''}>${esc(L('الأكثر طلبات', 'Most orders'))}</option>
              <option value="recent" ${state.sort === 'recent' ? 'selected' : ''}>${esc(L('آخر طلب', 'Most recent'))}</option>
            </select>
            <button class="b" type="button" data-csv>${icon('download')}CSV</button>
          </div>
          <div data-table>${tableHTML(list, top)}</div>
        </section>
        <section class="card">
          <div class="card-h"><h2>${esc(L('أفضل العملاء', 'Top customers'))}</h2><small>${esc(L('بإجمالي الصرف', 'by total spend'))}</small></div>
          ${best.length ? hbars(best, { format: money }) : `<p class="muted">—</p>`}
        </section>
      </div>`,
    );

    let t;
    el.querySelector('[data-q]').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.q = e.target.value.trim();
        const l = filter(customers());
        el.querySelector('[data-table]').innerHTML = tableHTML(l, l.slice(0, state.limit));
      }, 160);
    });
    el.querySelector('[data-sort]').onchange = (e) => {
      state.sort = e.target.value;
      render({ soft: true, force: true });
    };
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-more]')) {
        state.limit += 200;
        render({ soft: true, force: true });
      }
      if (e.target.closest('[data-csv]'))
        download(
          `zooot-customers-${new Date().toISOString().slice(0, 10)}.csv`,
          csv([['name', 'phone', 'email', 'city', 'orders', 'units', 'spent', 'due', 'first_order', 'last_order', 'sources'], ...list.map((c) => [c.name, c.phone, c.email, c.city, c.orders, c.units, c.spent, c.due, c.first, c.last, [...c.sources].join(' ')])]),
          'text/csv;charset=utf-8',
        );
    });
    return () => clearTimeout(t);
  },
};
