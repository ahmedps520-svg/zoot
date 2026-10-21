import { FLOW, ORDER_STATUSES, SIZES } from '../../js/backend/model.js';
import { columnChart, hbars, sparkline, tableView } from '../charts.js';
import { lowStock, render, store } from '../main.js';
import { ago, date, esc, icon, L, money, moneyHTML, num, statusBadge, sourceName, tr } from '../ui.js';
import {
  balanceOf,
  bindDemoBanner,
  deltaHTML,
  demoBanner,
  empty,
  getRange,
  inRange,
  itemName,
  live,
  mount,
  rangeBounds,
  rangePicker,
  setRange,
  statTile,
  thumbs,
} from './common.js';

let showTable = false;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return L('صباح الخير', 'Good morning');
  if (h < 18) return L('مساء الخير', 'Good afternoon');
  return L('مساء النور', 'Good evening');
}

function metrics(r) {
  const inR = (from, to) => store.orders.filter((o) => live(o) && Date.parse(o.created_at) >= from && Date.parse(o.created_at) <= to);
  const pays = (from, to) =>
    store.orders.flatMap((o) => o.payments || []).filter((p) => Date.parse(p.paid_at) >= from && Date.parse(p.paid_at) <= to);
  const calc = (from, to) => {
    const os = inR(from, to);
    const revenue = os.reduce((s, o) => s + Number(o.total), 0);
    const collected = pays(from, to).reduce((s, p) => s + Number(p.amount), 0);
    return { orders: os.length, revenue, collected, aov: os.length ? revenue / os.length : 0, units: os.reduce((s, o) => s + o.items.reduce((a, it) => a + it.qty, 0), 0) };
  };
  const cur = calc(r.from, r.to);
  const prev = r.prev ? calc(r.prev.from, r.prev.to) : null;
  const series = r.buckets.map((b) => ({ ...calc(b.from, b.to - 1), b }));
  return { cur, prev, series };
}

function bucketLabel(b, unit) {
  if (unit === 'hour') return b.label;
  return date(new Date(b.from).toISOString(), unit === 'month' ? { month: 'short' } : { day: 'numeric', month: 'short' });
}

export default {
  render(host) {
    const rid = getRange();
    const r = rangeBounds(rid);
    const has = store.orders.length > 0;
    const { cur, prev, series } = metrics(r);
    const outstanding = store.orders.filter(live).reduce((s, o) => s + balanceOf(o), 0);
    const owing = store.orders.filter((o) => live(o) && balanceOf(o) > 0).length;
    const newOnes = store.orders.filter((o) => o.status === 'new');
    const sp = (k) => sparkline(series.map((x) => x[k]));
    const ranged = store.orders.filter((o) => live(o) && inRange(o.created_at, r));

    // Breakdowns for the selected period.
    const byProduct = new Map();
    const bySize = new Map();
    const byCity = new Map();
    const bySource = new Map();
    for (const o of ranged) {
      byCity.set(o.city || L('غير محدد', 'Unknown'), (byCity.get(o.city || L('غير محدد', 'Unknown')) || 0) + 1);
      bySource.set(o.source, (bySource.get(o.source) || 0) + 1);
      for (const it of o.items) {
        const k = it.product_id || itemName(it);
        const row = byProduct.get(k) || { label: itemName(it), value: 0, revenue: 0 };
        row.value += it.qty;
        row.revenue += it.qty * it.unit_price;
        byProduct.set(k, row);
        const sizes = it.size ? [it.size] : (it.options || []).map((op) => op.value).filter((v) => SIZES.includes(v));
        sizes.forEach((s) => bySize.set(s, (bySize.get(s) || 0) + it.qty));
      }
    }
    const topProducts = [...byProduct.values()].sort((a, b) => b.value - a.value).slice(0, 6);
    topProducts.forEach((p, i) => (p.accent = i === 0));
    const sizes = SIZES.filter((s) => bySize.has(s)).map((s) => ({ label: s, value: bySize.get(s) }));
    const topSize = sizes.reduce((m, s) => (s.value > (m?.value || 0) ? s : m), null);
    sizes.forEach((s) => (s.accent = s === topSize));
    const cities = [...byCity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));
    const sources = [...bySource.entries()].sort((a, b) => b[1] - a[1]).map(([id, value]) => ({ label: sourceName(id), value }));
    const pcs = (n) => `${num(n)} ${L('قطعة', 'pcs')}`;
    const ords = (n) => `${num(n)} ${L('طلب', n === 1 ? 'order' : 'orders')}`;

    const pipeline = FLOW.slice(0, 4).map((id) => {
      const s = ORDER_STATUSES.find((x) => x.id === id);
      return { label: tr(s), value: store.orders.filter((o) => o.status === id).length, href: `#/orders?status=${id}`, swatch: s.color };
    });
    const noTracking = store.orders.filter((o) => o.status === 'shipped' && !o.tracking_no);
    const deliveredUnpaid = store.orders.filter((o) => o.status === 'delivered' && balanceOf(o) > 0);
    const low = lowStock();
    const attention = [
      newOnes.length && { href: '#/orders?status=new', icon: 'bell', text: L(`${newOnes.length} طلب جديد بانتظار التأكيد`, `${newOnes.length} new order(s) to confirm`), hot: true },
      noTracking.length && { href: '#/orders?status=shipped', icon: 'truck', text: L(`${noTracking.length} طلب مشحون بدون رقم تتبّع`, `${noTracking.length} shipped without a tracking number`) },
      deliveredUnpaid.length && { href: '#/payments', icon: 'cash', text: L(`${deliveredUnpaid.length} طلب مستلم وما انقبض مبلغه`, `${deliveredUnpaid.length} delivered but not paid`) },
      low.length && { href: '#/products?filter=low', icon: 'box', text: L(`${low.length} منتج نفد أو قارب يخلص`, `${low.length} product(s) out or running low`) },
    ].filter(Boolean);

    const chartData = series.map((x, i) => ({
      label: bucketLabel(x.b, r.unit),
      value: Math.round(x.revenue),
      tip: `${bucketLabel(x.b, r.unit)}${r.unit === 'hour' ? ':00' : ''} · ${ords(x.orders)}`,
      accent: i === series.length - 1,
    }));

    const el = mount(
      host,
      `${demoBanner()}
      <div class="spread">
        <div>
          <h2 style="font-size:20px;font-weight:800">${esc(greeting())} ${esc(store.me.email.split('@')[0])}</h2>
          <span class="muted">${esc(date(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' }))}${newOnes.length ? ` · <a href="#/orders?status=new" style="color:var(--magenta);font-weight:700">${esc(L(`${newOnes.length} طلب جديد`, `${newOnes.length} new`))}</a>` : ''}</span>
        </div>
        ${rangePicker(rid)}
      </div>
      ${
        !has
          ? `<div class="card">${empty(
              L('ما فيه طلبات للحين. أول طلب من المتجر بيظهر هنا مباشرة.', 'No orders yet. The first store order will pop up here live.'),
              `<div class="row"><a class="b b-primary" href="#/new">${icon('plus')}${esc(L('أضف طلب يدوي', 'Add a manual order'))}</a><a class="b" href="../shop.html" target="_blank" rel="noopener">${icon('out')}${esc(L('افتح المتجر', 'Open the store'))}</a></div>`,
            )}</div>`
          : `
      <div class="kpis kpis-6">
        ${statTile({ label: L('المبيعات', 'Sales'), value: moneyHTML(cur.revenue), delta: deltaHTML(cur.revenue, prev?.revenue), spark: sp('revenue') })}
        ${statTile({ label: L('المحصّل', 'Collected'), value: moneyHTML(cur.collected), delta: deltaHTML(cur.collected, prev?.collected), spark: sp('collected') })}
        ${statTile({ label: L('الطلبات', 'Orders'), value: `<span class="num">${num(cur.orders)}</span>`, delta: deltaHTML(cur.orders, prev?.orders), spark: sp('orders') })}
        ${statTile({ label: L('متوسط الطلب', 'Avg. order'), value: moneyHTML(Math.round(cur.aov)), delta: deltaHTML(cur.aov, prev?.aov), spark: sp('aov') })}
        ${statTile({ label: L('القطع المباعة', 'Units sold'), value: `<span class="num">${num(cur.units)}</span>`, delta: deltaHTML(cur.units, prev?.units), spark: sp('units') })}
        <a class="card stat" href="#/payments" style="display:grid">
          <span class="stat-label">${esc(L('مبالغ باقية للتحصيل', 'Still to collect'))}</span>
          <span class="stat-value" style="color:${outstanding ? 'var(--bad)' : 'inherit'}">${moneyHTML(outstanding)}</span>
          <span class="delta">${esc(L(`على ${owing} طلب — كل الفترات`, `across ${owing} order(s) — all time`))}</span>
        </a>
      </div>

      <div class="cols">
        <section class="card">
          <div class="card-h">
            <div><h2>${esc(L('المبيعات حسب الوقت', 'Sales over time'))}</h2><small>${esc(L('ر.س · الطلبات غير الملغية · المميّز = الفترة الحالية', 'SAR · non-cancelled orders · highlighted = current period'))}</small></div>
            <button class="b b-sm b-ghost table-toggle" type="button" data-table aria-pressed="${showTable}">${icon(showTable ? 'board' : 'list')}${esc(showTable ? L('رسم', 'Chart') : L('جدول', 'Table'))}</button>
          </div>
          <div data-chart>${showTable ? tableView(chartData.slice().reverse(), { head: [L('الفترة', 'Period'), L('المبيعات', 'Sales')], format: money }) : ''}</div>
        </section>
        <section class="card">
          <div class="card-h"><h2>${esc(L('يحتاج انتباهك', 'Needs your attention'))}</h2></div>
          ${
            attention.length
              ? `<div class="tpl-list">${attention.map((a) => `<a class="b b-ghost" style="justify-content:flex-start;${a.hot ? 'background:#fff0f6' : ''}" href="${a.href}">${icon(a.icon)}<span style="white-space:normal;text-align:start">${esc(a.text)}</span></a>`).join('')}</div>`
              : `<p class="muted" style="padding:6px 0 12px">${icon('check')} ${esc(L('كل شي تمام — ما فيه شي معلّق.', 'All clear — nothing waiting on you.'))}</p>`
          }
          <div class="card-h" style="margin-top:18px"><h3>${esc(L('الطلبات المفتوحة', 'Open orders'))}</h3><small>${esc(L('كل الفترات', 'all time'))}</small></div>
          ${hbars(pipeline, { format: ords })}
        </section>
      </div>

      <div class="cols-3">
        <section class="card">
          <div class="card-h"><h2>${esc(L('الأكثر مبيعًا', 'Best sellers'))}</h2><small>${esc(L('بالقطع', 'by units'))}</small></div>
          ${topProducts.length ? hbars(topProducts, { format: pcs }) : `<p class="muted">${esc(L('ما فيه مبيعات بهذي الفترة', 'No sales in this period'))}</p>`}
        </section>
        <section class="card">
          <div class="card-h"><h2>${esc(L('طلب المقاسات', 'Size demand'))}</h2><small>${esc(L('بالقطع', 'by units'))}</small></div>
          ${sizes.length ? hbars(sizes, { format: pcs }) : `<p class="muted">—</p>`}
        </section>
        <section class="card">
          <div class="card-h"><h2>${esc(L('المدن', 'Cities'))}</h2><small>${esc(L('بعدد الطلبات', 'by orders'))}</small></div>
          ${cities.length ? hbars(cities, { format: ords }) : `<p class="muted">—</p>`}
          <div class="card-h" style="margin-top:18px"><h3>${esc(L('مصدر الطلب', 'Order source'))}</h3></div>
          ${sources.length ? hbars(sources, { format: ords }) : `<p class="muted">—</p>`}
        </section>
      </div>

      <div class="cols">
        <section class="card">
          <div class="card-h"><div><h2>${esc(L('آخر الطلبات', 'Latest orders'))}</h2><small><span class="live is-on" style="letter-spacing:.06em"><i></i>LIVE</span></small></div><a class="b b-sm" href="#/orders">${esc(L('كل الطلبات', 'All orders'))}</a></div>
          <div class="t-wrap"><table class="t"><tbody>
            ${store.orders
              .slice(0, 8)
              .map(
                (o) => `<tr data-href="#/orders/${esc(o.order_no)}">
                <td><a class="num" href="#/orders/${esc(o.order_no)}" dir="ltr">${esc(o.order_no)}</a><br><small class="muted">${esc(ago(o.created_at))}</small></td>
                <td><div class="cust"><span>${esc(o.customer_name)}</span><small>${esc(o.city || '')}</small></div></td>
                <td class="hide-s">${thumbs(o)}</td>
                <td>${statusBadge(o.status)}</td>
                <td class="end num">${esc(money(o.total))}</td>
              </tr>`,
              )
              .join('')}
          </tbody></table></div>
        </section>
        <section class="card">
          <div class="card-h"><h2>${esc(L('المخزون', 'Stock watch'))}</h2><a class="b b-sm" href="#/products">${esc(L('إدارة', 'Manage'))}</a></div>
          ${
            low.length
              ? `<div class="tpl-list">${low
                  .slice(0, 8)
                  .map((p) => {
                    const lows = p.stock ? Object.entries(p.stock).filter(([, v]) => Number(v) <= 2) : [];
                    return `<a class="b b-ghost" style="justify-content:space-between" href="#/products?q=${encodeURIComponent(p.id)}"><span style="white-space:normal;text-align:start">${esc(tr(p.name))}</span>${
                      p.out_of_stock
                        ? `<span class="badge" style="--c:var(--bad)"><i></i>${esc(L('نفد', 'Sold out'))}</span>`
                        : `<span class="muted num" style="font-size:12px" dir="ltr">${lows.map(([k, v]) => `${k === 'ONE' ? '' : `${k}:`}${v}`).join(' · ')}</span>`
                    }</a>`;
                  })
                  .join('')}</div>`
              : `<p class="muted">${icon('check')} ${esc(store.products.some((p) => p.stock) ? L('المخزون بخير', 'Stock looks healthy') : L('ما فعّلت تتبّع المخزون للحين — فعّله من صفحة المنتجات.', 'Stock tracking is off — turn it on per product in Products.'))}</p>`
          }
        </section>
      </div>`
      }`,
    );

    bindDemoBanner(el);
    el.addEventListener('click', (e) => {
      const rb = e.target.closest('[data-range]');
      if (rb) {
        setRange(rb.dataset.range);
        render();
        return;
      }
      if (e.target.closest('[data-table]')) {
        showTable = !showTable;
        render({ soft: true, force: true });
        return;
      }
      const tr_ = e.target.closest('tr[data-href]');
      if (tr_ && !e.target.closest('a,button')) location.hash = tr_.dataset.href;
    });

    const chartHost = el.querySelector('[data-chart]');
    if (chartHost && !showTable) {
      return columnChart(chartHost, chartData, { height: 240, format: money, ariaLabel: L('المبيعات حسب الوقت', 'Sales over time') });
    }
    return null;
  },
};

