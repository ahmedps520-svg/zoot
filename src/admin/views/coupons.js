import '@fontsource/aref-ruqaa/700.css';
import ruqaaFont from '@fontsource/aref-ruqaa/files/aref-ruqaa-arabic-700-normal.woff2?url';
import archivoFont from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url';
import { reload, render, store } from '../main.js';
import { L, confirmDialog, copy, date, dialog, esc, icon, money, num } from '../ui.js';
import { busy, empty, mount, siteRoot, statTile } from './common.js';
import { envelopeCardPage, envelopeCardPNG, envelopeCardSVG } from '../envelope-card.js';

const DAY = 86_400_000;
const revealUrl = (c) => `${siteRoot()}ramadan.html?k=${encodeURIComponent(c.reveal_key)}`;
const valueText = (c) => (c.kind === 'percent' ? `${num(c.value)}%` : money(c.value));
// <input type="datetime-local"> works in the owner's local time
const localInput = (iso) => (iso ? new Date(Date.parse(iso) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
const fromLocal = (v) => (v ? new Date(v).toISOString() : null);
const randomFrom = (alphabet, n) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => alphabet[x % alphabet.length]).join('');
const newCode = () => `ZOOOT-${randomFrom('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5)}`;
const newKey = () => randomFrom('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', 10);

function stateOf(c) {
  const t = Date.now();
  if (!c.active) return { id: 'off', label: L('موقّف', 'Paused'), color: '#8A8A8A' };
  if (c.ends_at && t >= Date.parse(c.ends_at)) return { id: 'ended', label: L('انتهى', 'Ended'), color: '#8A8A8A' };
  if (c.max_uses && c.uses >= c.max_uses) return { id: 'used', label: L('خلص', 'Used up'), color: '#F26B21' };
  if (c.starts_at && t < Date.parse(c.starts_at)) return { id: 'soon', label: L('مجدول', 'Scheduled'), color: '#1F4BFF' };
  return { id: 'on', label: L('شغّال', 'Live'), color: 'var(--ok)' };
}
const badge = (c) => {
  const s = stateOf(c);
  return `<span class="badge" style="--c:${s.color}"><i></i>${esc(s.label)}</span>`;
};
const windowText = (c) => {
  const d = (iso) => date(iso, { day: 'numeric', month: 'short', year: 'numeric' });
  if (!c.starts_at && !c.ends_at) return L('دايمًا', 'Always');
  if (!c.ends_at) return L(`من ${d(c.starts_at)}`, `From ${d(c.starts_at)}`);
  const last = new Date(Date.parse(c.ends_at) - 1000).toISOString();
  return c.starts_at ? `${d(c.starts_at)} → ${d(last)}` : L(`لين ${d(last)}`, `Until ${d(last)}`);
};

/* ------------------------------------------------------------------ envelope card */
function envelopeHTML(c) {
  const left = c.starts_at ? Date.parse(c.starts_at) - Date.now() : 0;
  const when =
    left > 0
      ? L(`يفتح بعد ${num(Math.ceil(left / DAY))} يوم — ${date(c.starts_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`, `Opens in ${num(Math.ceil(left / DAY))} days — ${date(c.starts_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`)
      : L('مفتوح الحين — اللي يمسح الكود ياخذ الخصم', 'Open now — whoever scans gets the code');
  return `<section class="card env">
    <div class="env-card" data-env-preview aria-hidden="true">${envelopeCardSVG({ url: revealUrl(c), base: siteRoot() })}</div>
    <div class="env-info">
      <div class="card-h"><div><h2>${icon('moon')} ${esc(c.label || L('ظرف رمضان', 'Ramadan envelope'))}</h2><small>${esc(L('اللي يمسح QR الظرف قبل الموعد يشوف عدّ تنازلي مباشر، وأول ما يخلص ينكشف له الكود.', 'Scanning the envelope QR early shows a live countdown; at zero the code is revealed.'))}</small></div>${badge(c)}</div>
      <p class="env-when">${icon('clock')} ${esc(when)}</p>
      <p class="env-code"><span>${esc(L('الكود', 'Code'))}</span> <b dir="ltr">${esc(c.code)}</b> · ${esc(valueText(c))} ${esc(L('خصم', 'off'))}</p>
      <div class="env-actions">
        <button class="b b-primary" type="button" data-env-png="${esc(c.id)}">${icon('download')}${esc(L('حمّل البطاقة للطباعة (PNG)', 'Download print card (PNG)'))}</button>
        <button class="b" type="button" data-env-print="${esc(c.id)}">${icon('print')}${esc(L('اطبع / احفظ PDF', 'Print / save PDF'))}</button>
        <button class="b" type="button" data-env-copy="${esc(c.id)}">${icon('link')}${esc(L('انسخ الرابط', 'Copy link'))}</button>
        <a class="b b-ghost" href="${esc(revealUrl(c))}" target="_blank" rel="noopener">${icon('out')}${esc(L('افتح الصفحة', 'Open page'))}</a>
      </div>
      <p class="muted env-fine">${esc(L('البطاقة ١٠×١٥ سم (4×6 إنش) مع ٣ مم زيادة للقص — اطلب من المطبعة "مع bleed". الرابط سرّي: لا تنشره، هو اللي يفتح الكود.', 'The card is 4×6 in (10×15 cm) with 3 mm bleed — ask the printer for “with bleed”. The link is secret: don’t post it, it unlocks the code.'))}</p>
    </div>
  </section>`;
}

function tableHTML(list) {
  if (!list.length) return empty(L('ما فيه كوبونات للحين', 'No coupons yet'), `<button class="b b-primary" type="button" data-add>${icon('plus')}${esc(L('أضف كوبون', 'Add a coupon'))}</button>`);
  return `<div class="t-wrap"><table class="t"><thead><tr>
      <th>${esc(L('الكود', 'Code'))}</th><th>${esc(L('الخصم', 'Discount'))}</th><th class="hide-s">${esc(L('المدة', 'Valid'))}</th>
      <th>${esc(L('الاستخدام', 'Uses'))}</th><th class="hide-s">${esc(L('خصومات', 'Given'))}</th><th>${esc(L('الحالة', 'Status'))}</th><th></th></tr></thead><tbody>
    ${list
      .map(
        (c) => `<tr>
        <td><button class="b b-sm b-ghost cpn-code" type="button" data-copy-code="${esc(c.code)}" title="${esc(L('نسخ', 'Copy'))}" dir="ltr">${esc(c.code)}</button>${c.label ? `<small class="muted cpn-label">${c.reveal_key ? icon('moon') : ''}${esc(c.label)}</small>` : ''}</td>
        <td><b>${esc(valueText(c))}</b>${Number(c.min_subtotal) > 0 ? `<small class="muted cpn-label">${esc(L(`فوق ${money(c.min_subtotal)}`, `over ${money(c.min_subtotal)}`))}</small>` : ''}</td>
        <td class="hide-s">${esc(windowText(c))}</td>
        <td><span class="num">${num(c.uses || 0)}</span>${c.max_uses ? ` / <span class="num">${num(c.max_uses)}</span>` : ''}${c.once_per_customer ? `<small class="muted cpn-label">${esc(L('مرة لكل جوال', 'once per mobile'))}</small>` : ''}</td>
        <td class="hide-s">${esc(money(c.discount_total || 0))}</td>
        <td>${badge(c)}</td>
        <td class="end"><div class="row" style="justify-content:flex-end;gap:4px;flex-wrap:nowrap">
          <button class="b b-sm b-ghost b-icon" type="button" data-toggle="${esc(c.id)}" title="${esc(c.active ? L('أوقف', 'Pause') : L('شغّل', 'Turn on'))}" aria-label="${esc(c.active ? L('أوقف', 'Pause') : L('شغّل', 'Turn on'))}">${icon(c.active ? 'eyeoff' : 'eye')}</button>
          <button class="b b-sm b-ghost b-icon" type="button" data-edit="${esc(c.id)}" aria-label="${esc(L('تعديل', 'Edit'))}">${icon('edit')}</button>
          <button class="b b-sm b-ghost b-icon" type="button" data-remove="${esc(c.id)}" aria-label="${esc(L('حذف', 'Delete'))}">${icon('trash')}</button>
        </div></td></tr>`,
      )
      .join('')}</tbody></table></div>`;
}

/** Create / edit dialog. Rules mirror the coupons table checks (the server has the final word). */
async function editCoupon(c) {
  const isNew = !c;
  c = c || { code: newCode(), kind: 'percent', value: '', once_per_customer: true, active: true };
  const r = await dialog({
    title: isNew ? L('كوبون جديد', 'New coupon') : L(`تعديل ${c.code}`, `Edit ${c.code}`),
    body: `<div class="grid-2">
        <label class="f"><span>${esc(L('الكود (حروف إنجليزية وأرقام)', 'Code (letters, numbers, -)'))}</span><div class="row" style="flex-wrap:nowrap"><input name="code" dir="ltr" required pattern="[A-Za-z0-9\\-]{3,24}" maxlength="24" value="${esc(c.code)}" style="text-transform:uppercase"><button class="b b-sm" type="button" data-gen title="${esc(L('كود عشوائي', 'Random code'))}">${icon('refresh')}</button></div></label>
        <label class="f"><span>${esc(L('اسم داخلي (لك فقط)', 'Internal name (only you see it)'))}</span><input name="label" maxlength="80" value="${esc(c.label || '')}" placeholder="${esc(L('مثال: ظروف رمضان', 'e.g. Ramadan envelopes'))}"></label>
        <label class="f"><span>${esc(L('نوع الخصم', 'Discount type'))}</span><select name="kind"><option value="percent" ${c.kind === 'percent' ? 'selected' : ''}>${esc(L('نسبة ٪', 'Percent %'))}</option><option value="fixed" ${c.kind === 'fixed' ? 'selected' : ''}>${esc(L('مبلغ ثابت (ر.س)', 'Fixed amount (SAR)'))}</option></select></label>
        <label class="f"><span>${esc(L('القيمة', 'Value'))}</span><input name="value" type="number" min="0.01" step="0.01" inputmode="decimal" required value="${esc(c.value)}"></label>
        <label class="f"><span>${esc(L('يبدأ (اختياري)', 'Starts (optional)'))}</span><input name="starts_at" type="datetime-local" value="${esc(localInput(c.starts_at))}"></label>
        <label class="f"><span>${esc(L('ينتهي (اختياري)', 'Ends (optional)'))}</span><input name="ends_at" type="datetime-local" value="${esc(localInput(c.ends_at))}"></label>
        <label class="f"><span>${esc(L('أقل مبلغ للطلب (اختياري)', 'Minimum order (optional)'))}</span><input name="min_subtotal" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(Number(c.min_subtotal) || '')}" placeholder="0"></label>
        <label class="f"><span>${esc(L('أقصى عدد طلبات (اختياري)', 'Max orders (optional)'))}</span><input name="max_uses" type="number" min="1" step="1" inputmode="numeric" value="${esc(c.max_uses || '')}" placeholder="${esc(L('بلا حد', 'No limit'))}"></label>
      </div>
      <div style="display:grid;gap:10px;margin-top:6px">
        <label class="check"><input type="checkbox" name="once_per_customer" ${c.once_per_customer ? 'checked' : ''}>${esc(L('مرة وحدة لكل رقم جوال', 'Once per mobile number'))}</label>
        <label class="check"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}>${esc(L('مفعّل', 'Active'))}</label>
        <label class="check"><input type="checkbox" name="envelope" ${c.reveal_key ? 'checked' : ''}>${esc(L('صفحة ظرف: عدّ تنازلي لين وقت البداية ثم يكشف الكود (يحتاج وقت بداية)', 'Envelope page: countdown to the start time, then reveal the code (needs a start time)'))}</label>
      </div>`,
    actions: [
      { label: L('إلغاء', 'Cancel'), value: '', cls: 'b-ghost' },
      { label: isNew ? L('أضف الكوبون', 'Add coupon') : L('احفظ', 'Save'), value: 'ok', cls: 'b-primary', submit: true },
    ],
    onOpen(d) {
      d.querySelector('[data-gen]').addEventListener('click', () => (d.querySelector('[name=code]').value = newCode()));
    },
  });
  if (!r) return;
  const f = r.data;
  const row = {
    code: f.code.trim().toUpperCase(),
    label: f.label.trim() || null,
    kind: f.kind,
    value: Number(f.value),
    starts_at: fromLocal(f.starts_at),
    ends_at: fromLocal(f.ends_at),
    min_subtotal: Number(f.min_subtotal) || 0,
    max_uses: f.max_uses ? Math.max(1, Math.round(Number(f.max_uses))) : null,
    once_per_customer: 'once_per_customer' in f,
    active: 'active' in f,
    reveal_key: 'envelope' in f ? c.reveal_key || newKey() : null,
  };
  const problem =
    !/^[A-Z0-9-]{3,24}$/.test(row.code)
      ? L('الكود لازم يكون ٣–٢٤ حرف إنجليزي أو رقم أو -', 'The code must be 3–24 letters, numbers or -')
      : !(row.value > 0) || (row.kind === 'percent' && row.value > 100)
        ? L('القيمة لازم تكون أكبر من صفر (والنسبة لين ١٠٠)', 'Value must be above 0 (and at most 100%)')
        : row.starts_at && row.ends_at && Date.parse(row.ends_at) <= Date.parse(row.starts_at)
          ? L('تاريخ النهاية لازم يكون بعد البداية', 'The end must be after the start')
          : row.reveal_key && !row.starts_at
            ? L('صفحة الظرف تحتاج وقت بداية (متى ينكشف الكود)', 'The envelope page needs a start time (when the code is revealed)')
            : '';
  if (problem) {
    await dialog({ title: L('تأكد من البيانات', 'Check the details'), body: `<p>${esc(problem)}</p>`, actions: [{ label: L('تمام', 'OK'), value: 'ok', cls: 'b-primary' }] });
    return editCoupon({ ...c, ...row });
  }
  if (!isNew && c.reveal_key && row.reveal_key && c.code !== row.code)
    if (!(await confirmDialog(L('غيّرت الكود — الظروف المطبوعة تظل شغّالة (الرابط نفسه)، بس بيظهر لهم الكود الجديد.', 'You changed the code — printed envelopes keep working (same link) and will show the new code.')))) return;
  const out = await busy(null, () => (isNew ? store.api.coupons.create(row) : store.api.coupons.save(c.id, row)), isNew ? L('انضاف الكوبون', 'Coupon added') : L('انحفظ', 'Saved'));
  if (out) {
    await reload(['coupons']);
    render({ soft: true, force: true });
  }
}

/* ------------------------------------------------------------------ view */
export default {
  render(host) {
    const list = store.coupons || [];
    const liveNow = list.filter((c) => stateOf(c).id === 'on');
    const used = list.reduce((s, c) => s + (c.uses || 0), 0);
    const given = list.reduce((s, c) => s + (Number(c.discount_total) || 0), 0);
    const revenue = list.reduce((s, c) => s + (Number(c.revenue) || 0), 0);
    const envelopes = list.filter((c) => c.reveal_key);

    const el = mount(
      host,
      `<div class="kpis">
        ${statTile({ label: L('كوبونات شغّالة', 'Live coupons'), value: `<span class="num">${num(liveNow.length)}</span>`, hint: L(`من ${num(list.length)}`, `of ${num(list.length)}`) })}
        ${statTile({ label: L('طلبات بكوبون', 'Orders with a coupon'), value: `<span class="num">${num(used)}</span>` })}
        ${statTile({ label: L('خصومات عطيتها', 'Discounts given'), value: esc(money(given)) })}
        ${statTile({ label: L('مبيعات بكوبونات', 'Coupon sales'), value: esc(money(revenue)) })}
      </div>
      ${envelopes.map(envelopeHTML).join('')}
      <section class="card">
        <div class="card-h"><div><h2>${esc(L('الكوبونات والخصومات', 'Coupons & discounts'))}</h2><small>${esc(L('العميل يكتب الكود في صفحة إتمام الطلب، والخصم يتحسب على المنتجات (مو الشحن).', 'Shoppers type the code at checkout; the discount applies to products (not shipping).'))}</small></div>
          <button class="b b-primary" type="button" data-add>${icon('plus')}${esc(L('كوبون جديد', 'New coupon'))}</button></div>
        ${tableHTML(list)}
      </section>`,
    );

    el.addEventListener('click', async (e) => {
      const byId = (attr) => list.find((x) => x.id === e.target.closest(`[${attr}]`)?.getAttribute(attr));
      if (e.target.closest('[data-add]')) return editCoupon(null);
      const code = e.target.closest('[data-copy-code]');
      if (code) return copy(code.dataset.copyCode);
      if (e.target.closest('[data-edit]')) return editCoupon(byId('data-edit'));
      if (e.target.closest('[data-toggle]')) {
        const c = byId('data-toggle');
        const out = await busy(e.target.closest('[data-toggle]'), () => store.api.coupons.save(c.id, { ...c, active: !c.active }), c.active ? L('توقّف الكوبون', 'Coupon paused') : L('اشتغل الكوبون', 'Coupon on'));
        if (out) {
          await reload(['coupons']);
          render({ soft: true, force: true });
        }
        return;
      }
      if (e.target.closest('[data-remove]')) {
        const c = byId('data-remove');
        const warn = c.reveal_key ? L(' — وصفحة الظرف بتوقف، والظروف المطبوعة ما بتفتح شي.', ' — the envelope page stops too, printed envelopes will open nothing.') : '';
        if (!(await confirmDialog(L(`حذف الكوبون ${c.code}؟ الطلبات القديمة تظل بخصمها.${warn}`, `Delete coupon ${c.code}? Past orders keep their discount.${warn}`), { danger: true, okLabel: L('حذف', 'Delete') }))) return;
        await busy(e.target.closest('[data-remove]'), () => store.api.coupons.remove(c.id), L('انحذف', 'Deleted'));
        await reload(['coupons']);
        return render({ soft: true, force: true });
      }
      if (e.target.closest('[data-env-copy]')) return copy(revealUrl(byId('data-env-copy')));
      if (e.target.closest('[data-env-print]')) {
        const c = byId('data-env-print');
        const page = new Blob([envelopeCardPage({ url: revealUrl(c), base: siteRoot() }).replace('</body>', '<script>document.fonts.ready.then(()=>setTimeout(()=>print(),400))</script></body>')], { type: 'text/html' });
        window.open(URL.createObjectURL(page), '_blank');
        return;
      }
      if (e.target.closest('[data-env-png]')) {
        const btn = e.target.closest('[data-env-png]');
        const c = byId('data-env-png');
        await busy(btn, async () => {
          const png = await envelopeCardPNG({ url: revealUrl(c), base: siteRoot(), fonts: { ruqaa: ruqaaFont, archivo: archivoFont } });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(png);
          a.download = `zooot-ramadan-envelope-${c.code}.png`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        });
      }
    });
  },
};
