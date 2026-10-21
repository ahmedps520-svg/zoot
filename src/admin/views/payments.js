import { hbars } from '../charts.js';
import { reload, render, store } from '../main.js';
import { L, csv, dateTime, download, esc, icon, methodName, money, moneyHTML, num, payBadge, statusBadge, ago } from '../ui.js';
import { actor, balanceOf, busy, empty, getRange, inRange, live, mount, rangeBounds, rangePicker, setRange, statTile, waHref, waText } from './common.js';

let tab = 'due';

export default {
  render(host) {
    const rid = getRange();
    const r = rangeBounds(rid);
    const ledger = store.orders
      .flatMap((o) => (o.payments || []).map((p) => ({ ...p, order: o })))
      .filter((p) => inRange(p.paid_at, r))
      .sort((a, b) => b.paid_at.localeCompare(a.paid_at));
    const inflow = ledger.filter((p) => p.amount > 0).reduce((s, p) => s + Number(p.amount), 0);
    const refunds = ledger.filter((p) => p.amount < 0).reduce((s, p) => s - Number(p.amount), 0);
    const due = store.orders.filter((o) => live(o) && balanceOf(o) > 0).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const dueTotal = due.reduce((s, o) => s + balanceOf(o), 0);
    const codOnTheRoad = due.filter((o) => o.payment_method === 'cod' && ['shipped'].includes(o.status)).reduce((s, o) => s + balanceOf(o), 0);
    const overdue = due.filter((o) => o.status === 'delivered');

    const byMethod = new Map();
    ledger.filter((p) => p.amount > 0).forEach((p) => byMethod.set(p.method, (byMethod.get(p.method) || 0) + Number(p.amount)));
    const methods = [...byMethod.entries()].sort((a, b) => b[1] - a[1]).map(([id, value], i) => ({ label: methodName(id), value, accent: i === 0 }));

    const el = mount(
      host,
      `<div class="spread"><p class="muted">${esc(L('كل ريال داخل وطالع — مع المبالغ اللي باقي تتحصّل.', 'Every riyal in and out — plus what’s still owed.'))}</p>${rangePicker(rid)}</div>
      <div class="kpis">
        ${statTile({ label: L('المحصّل', 'Collected'), value: moneyHTML(inflow), hint: L(`${ledger.filter((p) => p.amount > 0).length} دفعة`, `${ledger.filter((p) => p.amount > 0).length} payments`) })}
        ${statTile({ label: L('المسترجع', 'Refunded'), value: moneyHTML(refunds) })}
        ${statTile({ label: L('صافي', 'Net'), value: moneyHTML(inflow - refunds) })}
        <div class="card stat"><span class="stat-label">${esc(L('باقي للتحصيل', 'Still to collect'))}</span><span class="stat-value" style="color:${dueTotal ? 'var(--bad)' : 'inherit'}">${moneyHTML(dueTotal)}</span><span class="delta">${esc(L(`${due.length} طلب · منها ${money(codOnTheRoad)} دفع عند الاستلام بالطريق`, `${due.length} orders · ${money(codOnTheRoad)} COD on the road`))}</span></div>
      </div>
      <div class="cols">
        <section class="card">
          <div class="card-h">
            <div class="seg" role="tablist">
              <button type="button" role="tab" data-tab="due" aria-pressed="${tab === 'due'}">${icon('bell')}${esc(L('مبالغ باقية', 'Balances due'))} <b class="num">${num(due.length)}</b></button>
              <button type="button" role="tab" data-tab="ledger" aria-pressed="${tab === 'ledger'}">${icon('list')}${esc(L('سجل الدفعات', 'Payment ledger'))}</button>
            </div>
            <button class="b b-sm" type="button" data-csv>${icon('download')}CSV</button>
          </div>
          ${
            tab === 'due'
              ? due.length
                ? `${overdue.length ? `<div class="mode-note" style="margin-bottom:12px">${icon('bell')}<span>${esc(L(`${overdue.length} طلب تسلّم وما انقبض مبلغه كامل.`, `${overdue.length} delivered order(s) haven’t been fully paid.`))}</span></div>` : ''}
                <div class="t-wrap"><table class="t"><thead><tr><th>${esc(L('الطلب', 'Order'))}</th><th>${esc(L('العميل', 'Customer'))}</th><th class="hide-s">${esc(L('الحالة', 'Status'))}</th><th class="end">${esc(L('الباقي', 'Due'))}</th><th></th></tr></thead><tbody>
                ${due
                  .map(
                    (o) => `<tr>
                    <td><a class="num" href="#/orders/${esc(o.order_no)}" dir="ltr">${esc(o.order_no)}</a><br><small class="muted">${esc(methodName(o.payment_method))} · ${esc(ago(o.created_at))}</small></td>
                    <td><div class="cust"><span>${esc(o.customer_name)}</span><small dir="ltr" style="text-align:start">${esc(o.customer_phone)}</small></div></td>
                    <td class="hide-s">${statusBadge(o.status)}<br>${payBadge(o.payment_status)}</td>
                    <td class="end"><strong class="num" style="color:var(--bad)">${esc(money(balanceOf(o)))}</strong><br><small class="muted">${esc(L('من', 'of'))} ${esc(money(o.total))}</small></td>
                    <td class="end"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">
                      <a class="b b-sm b-wa b-icon" href="${esc(waHref(o.customer_phone, waText(o, 'reminder')))}" target="_blank" rel="noopener" title="${esc(L('ذكّره بواتساب', 'WhatsApp reminder'))}" aria-label="${esc(L('ذكّره بواتساب', 'WhatsApp reminder'))}">${icon('wa')}</a>
                      <button class="b b-sm" type="button" data-paid="${esc(o.id)}">${icon('check')}<span class="hide-s">${esc(L('استلمت', 'Received'))}</span></button>
                    </div></td>
                  </tr>`,
                  )
                  .join('')}
                </tbody></table></div>`
                : empty(L('ما فيه مبالغ معلّقة — كل الطلبات مدفوعة.', 'Nothing owed — every order is paid up.'))
              : ledger.length
                ? `<div class="t-wrap"><table class="t"><thead><tr><th>${esc(L('التاريخ', 'Date'))}</th><th>${esc(L('الطلب', 'Order'))}</th><th class="hide-s">${esc(L('الطريقة', 'Method'))}</th><th class="end">${esc(L('المبلغ', 'Amount'))}</th></tr></thead><tbody>
                ${ledger
                  .slice(0, 300)
                  .map(
                    (p) => `<tr data-href="#/orders/${esc(p.order.order_no)}">
                    <td>${esc(dateTime(p.paid_at))}${p.reference ? `<br><small class="muted" dir="ltr">#${esc(p.reference)}</small>` : ''}</td>
                    <td><a class="num" href="#/orders/${esc(p.order.order_no)}" dir="ltr">${esc(p.order.order_no)}</a><br><small class="muted">${esc(p.order.customer_name)}</small></td>
                    <td class="hide-s">${esc(p.amount < 0 ? L('استرجاع', 'Refund') : methodName(p.method))}</td>
                    <td class="end num" style="color:${p.amount < 0 ? 'var(--bad)' : 'inherit'}">${esc(money(p.amount))}</td>
                  </tr>`,
                  )
                  .join('')}
                </tbody></table></div>`
                : empty(L('ما فيه دفعات بهذي الفترة', 'No payments in this period'))
          }
        </section>
        <div style="display:grid;gap:18px">
          <section class="card">
            <div class="card-h"><h2>${esc(L('حسب طريقة الدفع', 'By method'))}</h2><small>${esc(L('المحصّل بالفترة', 'collected in period'))}</small></div>
            ${methods.length ? hbars(methods, { format: money }) : `<p class="muted">—</p>`}
          </section>
          <section class="card">
            <div class="card-h"><h2>${esc(L('بيانات التحويل', 'Transfer details'))}</h2><a class="b b-sm" href="#/settings">${icon('edit')}</a></div>
            ${store.settings.public?.bank_details ? `<p style="white-space:pre-wrap" dir="auto">${esc(store.settings.public.bank_details)}</p>` : `<p class="muted">${esc(L('أضف بيانات حسابك البنكي من الإعدادات عشان تنضاف تلقائيًا لرسائل التذكير والفواتير.', 'Add your bank details in Settings — they’re added to reminders and invoices automatically.'))}</p>`}
          </section>
        </div>
      </div>`,
    );

    el.addEventListener('click', async (e) => {
      const rb = e.target.closest('[data-range]');
      if (rb) {
        setRange(rb.dataset.range);
        return render();
      }
      const t = e.target.closest('[data-tab]');
      if (t) {
        tab = t.dataset.tab;
        return render({ soft: true, force: true });
      }
      const paid = e.target.closest('[data-paid]');
      if (paid) {
        const o = store.orders.find((x) => x.id === paid.dataset.paid);
        await busy(
          paid,
          async () => {
            await store.api.payments.add(o.id, { amount: balanceOf(o), method: o.payment_method === 'cod' ? 'cash' : o.payment_method }, actor());
            await reload(['orders']);
          },
          L(`تم تسجيل ${money(balanceOf(o))} على ${o.order_no}`, `Recorded ${money(balanceOf(o))} on ${o.order_no}`),
        );
        return render({ soft: true, force: true });
      }
      if (e.target.closest('[data-csv]')) {
        const rows =
          tab === 'due'
            ? [['order_no', 'customer', 'phone', 'status', 'method', 'total', 'paid', 'balance'], ...due.map((o) => [o.order_no, o.customer_name, o.customer_phone, o.status, o.payment_method, o.total, o.paid_amount, balanceOf(o)])]
            : [['paid_at', 'order_no', 'customer', 'method', 'reference', 'amount', 'note'], ...ledger.map((p) => [p.paid_at, p.order.order_no, p.order.customer_name, p.method, p.reference, p.amount, p.note])];
        return download(`zooot-${tab === 'due' ? 'balances' : 'payments'}-${new Date().toISOString().slice(0, 10)}.csv`, csv(rows), 'text/csv;charset=utf-8');
      }
      const row = e.target.closest('tr[data-href]');
      if (row && !e.target.closest('a,button')) location.hash = row.dataset.href;
    });
    return null;
  },
};

