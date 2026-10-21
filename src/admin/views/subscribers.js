import { columnChart } from '../charts.js';
import { reload, render, store } from '../main.js';
import { L, ago, confirmDialog, csv, date, dialog, download, esc, icon, num } from '../ui.js';
import { bindDemoBanner, busy, demoBanner, empty, mount, startOfDay, statTile } from './common.js';

const state = { q: '', status: 'subscribed', limit: 100 };
const DAY = 86_400_000;

const badge = (s) =>
  s === 'subscribed'
    ? `<span class="badge" style="--c:var(--ok)"><i></i>${esc(L('مشترك', 'Subscribed'))}</span>`
    : `<span class="badge"><i></i>${esc(L('ألغى الاشتراك', 'Unsubscribed'))}</span>`;

function visible() {
  const q = state.q.toLowerCase();
  return store.subscribers.filter((s) => (!state.status || s.status === state.status) && (!q || s.email.includes(q)));
}

function tableHTML(list) {
  if (!list.length) return empty(L('ما فيه مشتركين هنا', 'No subscribers here'));
  const shown = list.slice(0, state.limit);
  return `<div class="t-wrap"><table class="t"><thead><tr><th>${esc(L('البريد', 'Email'))}</th><th class="hide-s">${esc(L('اللغة', 'Lang'))}</th><th class="hide-s">${esc(L('المصدر', 'Source'))}</th><th>${esc(L('الحالة', 'Status'))}</th><th>${esc(L('التاريخ', 'Date'))}</th><th></th></tr></thead><tbody>
    ${shown
      .map(
        (s) => `<tr><td dir="ltr" style="text-align:start">${esc(s.email)}</td><td class="hide-s">${s.lang === 'en' ? 'EN' : 'ع'}</td><td class="hide-s">${esc(s.source || '')}</td><td>${badge(s.status)}</td>
        <td title="${esc(date(s.created_at, { day: 'numeric', month: 'long', year: 'numeric' }))}">${esc(ago(s.created_at))}</td>
        <td class="end"><button class="b b-sm b-ghost b-icon" type="button" data-remove="${esc(s.id)}" aria-label="${esc(L('حذف', 'Remove'))}">${icon('trash')}</button></td></tr>`,
      )
      .join('')}</tbody></table></div>
    ${list.length > shown.length ? `<div class="row" style="justify-content:center;margin-top:12px"><button class="b" type="button" data-more>${esc(L('عرض المزيد', 'Show more'))}</button></div>` : ''}`;
}

export default {
  render(host) {
    const subs = store.subscribers;
    const active = subs.filter((s) => s.status === 'subscribed');
    const week = active.filter((s) => Date.parse(s.created_at) >= Date.now() - 7 * DAY).length;
    const en = active.filter((s) => s.lang === 'en').length;
    const today = startOfDay();
    const days = Array.from({ length: 30 }, (_, i) => {
      const from = today - (29 - i) * DAY;
      const n = subs.filter((s) => Date.parse(s.created_at) >= from && Date.parse(s.created_at) < from + DAY).length;
      const lbl = date(new Date(from).toISOString());
      return { label: lbl, value: n, tip: lbl, accent: i === 29 };
    });
    const chip = (id, label, n) => `<button class="chip" type="button" data-status="${id}" aria-pressed="${state.status === id}">${esc(label)} <b>${num(n)}</b></button>`;

    const el = mount(
      host,
      `${subs.length ? '' : demoBanner()}
      <div class="kpis">
        ${statTile({ label: L('مشتركين', 'Subscribed'), value: `<span class="num">${num(active.length)}</span>` })}
        ${statTile({ label: L('جدد هالأسبوع', 'New this week'), value: `<span class="num">${num(week)}</span>` })}
        ${statTile({ label: L('لغة الإيميلات', 'Email language'), value: `<span class="num">${active.length ? Math.round(((active.length - en) / active.length) * 100) : 0}%</span> <small>${esc(L('عربي', 'Arabic'))}</small>`, hint: L(`${en} إنجليزي`, `${en} English`) })}
      </div>
      <section class="card">
        <div class="card-h"><div><h2>${esc(L('اشتراكات آخر ٣٠ يوم', 'Sign-ups, last 30 days'))}</h2><small>${esc(L('المميّز = اليوم', 'highlighted = today'))}</small></div></div>
        <div data-chart></div>
      </section>
      <section class="card">
        <div class="toolbar" style="margin-bottom:12px">
          <label class="search grow" style="width:auto"><span class="sr">${esc(L('بحث', 'Search'))}</span>${icon('search')}<input class="in" type="search" data-q value="${esc(state.q)}" placeholder="${esc(L('ابحث بالبريد…', 'Search email…'))}"></label>
          <div class="chips">${chip('subscribed', L('مشتركين', 'Subscribed'), active.length)}${chip('unsubscribed', L('ألغوا', 'Unsubscribed'), subs.length - active.length)}${chip('', L('الكل', 'All'), subs.length)}</div>
          <button class="b" type="button" data-add>${icon('plus')}${esc(L('أضف', 'Add'))}</button>
          <button class="b" type="button" data-csv>${icon('download')}CSV</button>
          <a class="b b-primary" href="#/emails?tab=campaign">${icon('send')}${esc(L('أرسل حملة', 'Send a campaign'))}</a>
        </div>
        <div data-table>${tableHTML(visible())}</div>
      </section>`,
    );
    bindDemoBanner(el);

    let t;
    el.querySelector('[data-q]').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.q = e.target.value.trim().toLowerCase();
        el.querySelector('[data-table]').innerHTML = tableHTML(visible());
      }, 140);
    });
    el.addEventListener('click', async (e) => {
      const st = e.target.closest('[data-status]');
      if (st) {
        state.status = st.dataset.status;
        return render({ soft: true, force: true });
      }
      if (e.target.closest('[data-more]')) {
        state.limit += 200;
        el.querySelector('[data-table]').innerHTML = tableHTML(visible());
        return;
      }
      if (e.target.closest('[data-csv]'))
        return download(`zooot-subscribers-${new Date().toISOString().slice(0, 10)}.csv`, csv([['email', 'lang', 'source', 'status', 'created_at'], ...visible().map((s) => [s.email, s.lang, s.source, s.status, s.created_at])]), 'text/csv;charset=utf-8');
      const rm = e.target.closest('[data-remove]');
      if (rm) {
        const s = subs.find((x) => x.id === rm.dataset.remove);
        if (!(await confirmDialog(L(`حذف ${s.email} من القائمة؟`, `Remove ${s.email} from the list?`), { danger: true, okLabel: L('حذف', 'Remove') }))) return;
        await busy(rm, async () => {
          await store.api.subscribers.remove(s.id);
          await reload(['subscribers']);
        });
        return render({ soft: true, force: true });
      }
      if (e.target.closest('[data-add]')) {
        const r = await dialog({
          title: L('أضف مشترك', 'Add a subscriber'),
          body: `<p class="muted">${esc(L('بيوصله إيميل ترحيب بقالب زوووط.', 'They’ll get the ZOOOT welcome email.'))}</p>
            <label class="f"><span>${esc(L('البريد', 'Email'))}</span><input name="email" type="email" dir="ltr" required></label>
            <label class="f"><span>${esc(L('اللغة', 'Language'))}</span><select name="lang"><option value="ar">عربي</option><option value="en">English</option></select></label>`,
          actions: [
            { label: L('إلغاء', 'Cancel'), value: '', cls: 'b-ghost' },
            { label: L('أضف', 'Add'), value: 'ok', cls: 'b-primary', submit: true },
          ],
        });
        if (!r) return;
        const out = await busy(null, () => store.api.subscribers.add(r.data.email, r.data.lang), L('انضاف المشترك', 'Subscriber added'));
        if (out) {
          await reload(['subscribers', 'emails']);
          render({ soft: true, force: true });
        }
      }
    });
    const stop = columnChart(el.querySelector('[data-chart]'), days, { height: 160, format: (n) => L(`${n} مشترك`, `${n} sign-ups`), ariaLabel: L('الاشتراكات اليومية', 'Daily sign-ups') });
    return () => {
      clearTimeout(t);
      stop();
    };
  },
};
