import * as T from '../../../supabase/functions/_shared/email-templates.js';
import { reload, render, store } from '../main.js';
import { L, confirmDialog, dateTime, dialog, esc, icon, img, num, ok } from '../ui.js';
import { actor, busy, empty, mount } from './common.js';

const TEMPLATES = [
  { id: 'welcome', icon: 'heart', ar: 'ترحيب المشترك الجديد', en: 'Subscriber welcome', when: ['لما أحد يشترك في النشرة', 'When someone joins the newsletter'] },
  { id: 'order_confirmation', icon: 'orders', ar: 'تأكيد استلام الطلب', en: 'Order received', when: ['للعميل لحظة ما يطلب', 'To the customer the moment they order'] },
  { id: 'status_confirmed', icon: 'check', ar: 'الطلب مؤكد', en: 'Order confirmed', when: ['لما تأكد الطلب', 'When you confirm the order'] },
  { id: 'status_preparing', icon: 'box', ar: 'قيد التجهيز', en: 'Preparing', when: ['لما تبدأ التجهيز', 'When you start preparing'] },
  { id: 'status_shipped', icon: 'truck', ar: 'تم الشحن', en: 'Shipped', when: ['مع شركة الشحن ورقم التتبّع', 'With courier and tracking number'] },
  { id: 'status_delivered', icon: 'star', ar: 'تم التسليم', en: 'Delivered', when: ['بعد التسليم', 'After delivery'] },
  { id: 'status_cancelled', icon: 'x', ar: 'الطلب ملغي', en: 'Cancelled', when: ['لو انلغى الطلب', 'If the order is cancelled'] },
  { id: 'custom', icon: 'edit', ar: 'رسالة خاصة', en: 'Custom message', when: ['من صفحة الطلب', 'From any order page'] },
  { id: 'owner_new_order', icon: 'bell', ar: 'تنبيه طلب جديد (لك)', en: 'New-order alert (you)', when: ['لبريد المالك مع كل طلب', 'To the owner inbox on every order'] },
  { id: 'campaign', icon: 'send', ar: 'حملة للمشتركين', en: 'Campaign', when: ['ترسلها أنت للمشتركين', 'You send it to subscribers'] },
];

const state = { tab: '', tpl: 'welcome', lang: 'ar', mobile: false };
const draft = { subject: '', heading: '', body: '', cta_label: '', cta_url: 'shop.html', image: '' };

const siteUrl = () => new URL('../', location.href.split('#')[0]).href.replace(/\/$/, '');
const socials = () => ({ instagram: store.settings.public?.instagram, tiktok: store.settings.public?.tiktok });

function sampleOrder(lang) {
  const real = store.orders.find((o) => o.items?.length);
  if (real) return { ...real, lang };
  const p = store.products.find((x) => x.type === 'set') || store.products[0];
  const price = p?.price || 479;
  return {
    id: 'sample',
    order_no: 'ZT-1001',
    status: 'new',
    lang,
    customer_name: lang === 'en' ? 'Reem Alotaibi' : 'ريم العتيبي',
    customer_phone: '0551234567',
    customer_email: 'reem@example.com',
    city: lang === 'en' ? 'Riyadh' : 'الرياض',
    district: lang === 'en' ? 'Al Narjis' : 'النرجس',
    address: lang === 'en' ? 'Street 12, Building 4' : 'شارع 12، مبنى 4',
    payment_method: 'cod',
    items: [{ name: p?.name || { ar: 'طقم', en: 'Set' }, image: p?.images?.[0] || null, options: [{ label: { ar: 'المقاس', en: 'Size' }, value: 'L' }], unit_price: price, qty: 1 }],
    subtotal: price,
    discount: 0,
    shipping: 0,
    total: price,
    courier: 'SMSA',
    tracking_no: '290012345678',
    created_at: new Date().toISOString(),
  };
}

function campaignContent() {
  return {
    subject: draft.subject || L('الإصدار ٠٠١ نزل', 'Drop 001 is live'),
    heading: draft.heading || draft.subject || L('البس بصوت عالي', 'Wear it loud'),
    body: draft.body || L('اكتب رسالتك هنا…\n\nكل سطر فاضي يبدأ فقرة جديدة.', 'Write your message here…\n\nA blank line starts a new paragraph.'),
    ctaLabel: draft.cta_label || L('تسوّق الآن', 'Shop now'),
    ctaUrl: draft.cta_url,
    image: draft.image,
  };
}

/** Render any template locally (exactly what Resend will send). */
export function renderTemplate(id, lang, params = {}) {
  const base = { siteUrl: siteUrl(), socials: socials(), ...params };
  const order = params.order || sampleOrder(lang);
  if (id === 'welcome') return T.welcomeEmail({ lang, unsubscribeUrl: `${siteUrl()}/track.html?unsubscribe=preview`, ...base });
  if (id === 'order_confirmation') return T.orderConfirmationEmail({ order, settings: store.settings.public, ...base });
  if (id.startsWith('status_')) return T.statusUpdateEmail({ order: { ...order, status: id.slice(7) }, status: id.slice(7), ...base });
  if (id === 'custom') return T.customMessageEmail({ order, subject: params.subject || L(`بخصوص طلبك ${order.order_no}`, `About your order ${order.order_no}`), message: params.message || L('هلا! حبينا نطمنك إن طلبك بأيدٍ أمينة.', 'Hi! Just letting you know your order is in good hands.'), ...base });
  if (id === 'owner_new_order') return T.ownerNewOrderEmail({ order, dashboardUrl: location.href.split('#')[0], ...base });
  if (id === 'campaign' || id === 'campaign_test') return T.campaignEmail({ lang, ...campaignContent(), ...params, unsubscribeUrl: `${siteUrl()}/track.html?unsubscribe=preview`, ...base });
  return T.statusUpdateEmail({ order, ...base });
}

function previewHTML(mail) {
  return `<div class="spread" style="margin-bottom:10px">
      <div style="min-width:0"><small class="muted">${esc(L('العنوان', 'Subject'))}</small><div style="font-weight:700;overflow-wrap:anywhere" dir="auto">${esc(mail.subject)}</div></div>
      <div class="row">
        <div class="seg" role="group" aria-label="${esc(L('لغة المعاينة', 'Preview language'))}"><button type="button" data-lang-p="ar" aria-pressed="${state.lang === 'ar'}">عربي</button><button type="button" data-lang-p="en" aria-pressed="${state.lang === 'en'}">EN</button></div>
        <div class="seg device-toggle" role="group" aria-label="${esc(L('الجهاز', 'Device'))}"><button type="button" data-device="desk" aria-pressed="${!state.mobile}">${esc(L('كمبيوتر', 'Desktop'))}</button><button type="button" data-device="mobile" aria-pressed="${state.mobile}">${esc(L('جوال', 'Mobile'))}</button></div>
      </div>
    </div>
    <div class="preview-wrap ${state.mobile ? 'is-mobile' : ''}"><iframe class="preview-frame" title="${esc(L('معاينة الإيميل', 'Email preview'))}" sandbox="allow-popups allow-popups-to-escape-sandbox" data-frame></iframe></div>`;
}

const statusBadgeFor = (s) => {
  const c = { sent: 'var(--ok)', preview: 'var(--blue)', failed: 'var(--bad)', skipped: '#8a8a8a' }[s] || '#8a8a8a';
  const t = { sent: L('أُرسل', 'Sent'), preview: L('معاينة', 'Preview'), failed: L('فشل', 'Failed'), skipped: L('متوقف', 'Skipped') }[s] || s;
  return `<span class="badge" style="--c:${c}"><i></i>${esc(t)}</span>`;
};
const tplName = (id) => {
  const t = TEMPLATES.find((x) => x.id === id) || (id === 'campaign_test' ? { ar: 'تجربة حملة', en: 'Campaign test' } : null);
  return t ? L(t.ar, t.en) : id;
};

let ping = null;

export default {
  render(host, { query, soft }) {
    if (!soft) state.tab = query.tab || state.tab || 'templates';
    const subs = store.subscribers.filter((s) => s.status === 'subscribed').length;
    const demo = store.mode === 'demo';
    const lastCampaign = store.emails.find((e) => e.template === 'campaign');

    let body = '';
    if (state.tab === 'templates') {
      body = `<div class="cols" style="grid-template-columns:minmax(0,320px) minmax(0,1fr)">
        <section class="card"><div class="tpl-list" role="listbox" aria-label="${esc(L('القوالب', 'Templates'))}">${TEMPLATES.map(
          (t) => `<button type="button" role="option" data-tpl="${t.id}" aria-pressed="${state.tpl === t.id}" aria-selected="${state.tpl === t.id}">${icon(t.icon)}<span style="display:grid;line-height:1.35"><span>${esc(L(t.ar, t.en))}</span><small style="opacity:.65;font-weight:500;font-size:12px">${esc(L(...t.when))}</small></span></button>`,
        ).join('')}</div></section>
        <section class="card">${previewHTML(renderTemplate(state.tpl, state.lang))}</section>
      </div>`;
    } else if (state.tab === 'campaign') {
      const images = [...new Set(store.products.flatMap((p) => p.images?.slice(0, 1) || []))].filter((s) => !/^data:/.test(s)).slice(0, 24);
      body = `<div class="cols">
        <section class="card">${previewHTML(renderTemplate('campaign', state.lang))}</section>
        <form class="card" data-campaign style="display:grid;gap:12px;align-content:start" novalidate>
          <div class="card-h" style="margin:0"><h2>${esc(L('اكتب الحملة', 'Write the campaign'))}</h2><small>${esc(L(`${subs} مشترك`, `${subs} subscribers`))}</small></div>
          <label class="f"><span>${esc(L('عنوان الإيميل *', 'Subject *'))}</span><input name="subject" required maxlength="140" value="${esc(draft.subject)}" placeholder="${esc(L('الإصدار ٠٠١ نزل', 'Drop 001 is live'))}"></label>
          <label class="f"><span>${esc(L('العنوان الكبير', 'Headline'))}</span><input name="heading" maxlength="120" value="${esc(draft.heading)}" placeholder="${esc(L('البس بصوت عالي', 'Wear it loud'))}"></label>
          <label class="f"><span>${esc(L('الرسالة *', 'Message *'))}</span><textarea name="body" required rows="7" maxlength="6000">${esc(draft.body)}</textarea></label>
          <div class="grid-2">
            <label class="f"><span>${esc(L('نص الزر', 'Button label'))}</span><input name="cta_label" maxlength="40" value="${esc(draft.cta_label)}" placeholder="${esc(L('تسوّق الآن', 'Shop now'))}"></label>
            <label class="f"><span>${esc(L('رابط الزر', 'Button link'))}</span><input name="cta_url" dir="ltr" value="${esc(draft.cta_url)}" placeholder="shop.html"></label>
          </div>
          <div class="f"><span>${esc(L('صورة (اختياري)', 'Image (optional)'))}</span><div class="img-picker" style="grid-template-columns:repeat(auto-fill,minmax(52px,1fr))">${images
            .map((s) => `<button type="button" data-cimg="${esc(s)}" aria-pressed="${draft.image === s}"><img src="${esc(img(s))}" alt="" loading="lazy"></button>`)
            .join('')}</div></div>
          <div class="row">
            <button class="b" type="button" data-send="test">${icon('mail')}${esc(L('أرسل تجربة لي', 'Send me a test'))}</button>
            <button class="b b-primary" type="button" data-send="all" ${subs ? '' : 'disabled'}>${icon('send')}${esc(L(`أرسل لـ ${subs} مشترك`, `Send to ${subs} subscribers`))}</button>
          </div>
          ${demo ? `<p class="muted" style="font-size:13px">${esc(L('وضع تجريبي: ما يطلع أي إيميل — تنحفظ نسخ في السجل للمعاينة.', 'Demo mode: nothing leaves the browser — copies land in the log for preview.'))}</p>` : ''}
          ${lastCampaign ? `<small class="muted">${esc(L('آخر حملة', 'Last campaign'))}: ${esc(lastCampaign.subject)} · ${esc(dateTime(lastCampaign.created_at))}</small>` : ''}
        </form>
      </div>`;
    } else {
      body = `<section class="card">
        ${
          store.emails.length
            ? `<div class="t-wrap"><table class="t"><thead><tr><th>${esc(L('التاريخ', 'Date'))}</th><th>${esc(L('إلى', 'To'))}</th><th>${esc(L('العنوان', 'Subject'))}</th><th class="hide-s">${esc(L('القالب', 'Template'))}</th><th>${esc(L('الحالة', 'Status'))}</th></tr></thead><tbody>
          ${store.emails
            .map(
              (m) => `<tr ${m.params ? `data-open="${esc(m.id)}" style="cursor:pointer"` : ''}><td>${esc(dateTime(m.created_at))}</td><td dir="ltr" style="text-align:start">${esc(m.to_email)}</td><td dir="auto">${esc(m.subject)}${m.error ? `<br><small style="color:var(--bad)">${esc(m.error)}</small>` : ''}</td><td class="hide-s">${esc(tplName(m.template))}</td><td>${statusBadgeFor(m.status)}${m.params ? ` <span class="muted">${icon('eye')}</span>` : ''}</td></tr>`,
            )
            .join('')}</tbody></table></div>`
            : empty(L('ما انرسل شي للحين', 'Nothing sent yet'))
        }
      </section>`;
    }

    const el = mount(
      host,
      `<div class="spread">
        <div class="seg" role="tablist">
          <button type="button" role="tab" data-tab="templates" aria-pressed="${state.tab === 'templates'}">${icon('eye')}${esc(L('القوالب', 'Templates'))}</button>
          <button type="button" role="tab" data-tab="campaign" aria-pressed="${state.tab === 'campaign'}">${icon('send')}${esc(L('حملة', 'Campaign'))}</button>
          <button type="button" role="tab" data-tab="log" aria-pressed="${state.tab === 'log'}">${icon('list')}${esc(L('السجل', 'Log'))} <b class="num">${num(store.emails.length)}</b></button>
        </div>
        <span class="row" data-ping style="font-size:13px"></span>
      </div>
      ${body}`,
    );

    const frame = el.querySelector('[data-frame]');
    const paintFrame = () => {
      if (!frame) return;
      const mail = renderTemplate(state.tab === 'campaign' ? 'campaign' : state.tpl, state.lang);
      frame.srcdoc = mail.html;
      const subj = el.querySelector('.spread [dir=auto]');
      if (subj) subj.textContent = mail.subject;
    };
    paintFrame();

    // Integration status (Resend) — cached for the session.
    const pingEl = el.querySelector('[data-ping]');
    const showPing = (p) =>
      (pingEl.innerHTML = demo
        ? `<span class="badge" style="--c:var(--blue)"><i></i>${esc(L('تجريبي: الإيميلات معاينة فقط', 'Demo: emails are previews'))}</span>`
        : p?.resend
          ? `<span class="badge" style="--c:var(--ok)"><i></i>Resend · ${esc(p.from || '')}</span>`
          : `<a class="badge" style="--c:var(--bad)" href="#/settings"><i></i>${esc(L('Resend غير مربوط', 'Resend not connected'))}</a>`);
    if (ping) showPing(ping);
    else store.api.emails.ping().then((p) => showPing((ping = p)));

    let t;
    el.addEventListener('input', (e) => {
      const f = e.target.closest('[data-campaign]');
      if (!f || !e.target.name) return;
      draft[e.target.name] = e.target.value;
      clearTimeout(t);
      t = setTimeout(paintFrame, 250);
    });

    el.addEventListener('click', async (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        state.tab = tab.dataset.tab;
        history.replaceState(null, '', `#/emails?tab=${state.tab}`);
        return render({ soft: true, force: true });
      }
      const tpl = e.target.closest('[data-tpl]');
      if (tpl) {
        state.tpl = tpl.dataset.tpl;
        el.querySelectorAll('[data-tpl]').forEach((b) => {
          b.setAttribute('aria-pressed', String(b === tpl));
          b.setAttribute('aria-selected', String(b === tpl));
        });
        return paintFrame();
      }
      const lp = e.target.closest('[data-lang-p]');
      if (lp) {
        state.lang = lp.dataset.langP;
        el.querySelectorAll('[data-lang-p]').forEach((b) => b.setAttribute('aria-pressed', String(b === lp)));
        return paintFrame();
      }
      const dv = e.target.closest('[data-device]');
      if (dv) {
        state.mobile = dv.dataset.device === 'mobile';
        el.querySelectorAll('[data-device]').forEach((b) => b.setAttribute('aria-pressed', String(b === dv)));
        el.querySelector('.preview-wrap')?.classList.toggle('is-mobile', state.mobile);
        return;
      }
      const ci = e.target.closest('[data-cimg]');
      if (ci) {
        draft.image = draft.image === ci.dataset.cimg ? '' : ci.dataset.cimg;
        el.querySelectorAll('[data-cimg]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cimg === draft.image)));
        return paintFrame();
      }
      const send = e.target.closest('[data-send]');
      if (send) {
        const form = el.querySelector('[data-campaign]');
        if (!form.checkValidity()) return form.reportValidity();
        const test = send.dataset.send === 'test';
        if (!test && !(await confirmDialog(L(`إرسال «${draft.subject}» لـ ${subs} مشترك؟ ما يمديك تتراجع بعد الإرسال.`, `Send “${draft.subject}” to ${subs} subscribers? This can’t be undone.`), { okLabel: L('أرسل', 'Send') })))
          return;
        const image = draft.image ? (/^https?:/.test(draft.image) ? draft.image : draft.image.replace(/^\.?\//, '')) : '';
        const res = await busy(send, () => store.api.emails.send('campaign', { ...draft, image, lang: state.lang, test }, actor()));
        if (res) {
          ok(
            test
              ? res.status === 'preview'
                ? L('التجربة محفوظة في السجل', 'Test saved to the log')
                : L(`انرسلت التجربة لـ ${store.me.email}`, `Test sent to ${store.me.email}`)
              : L(`تم: ${res.sent ?? res.total} من ${res.total}`, `Done: ${res.sent ?? res.total} of ${res.total}`),
          );
          await reload(['emails']);
        }
        return;
      }
      const open = e.target.closest('[data-open]');
      if (open) {
        const m = store.emails.find((x) => x.id === open.dataset.open);
        const mail = renderTemplate(m.template, m.params.lang || m.params.order?.lang || 'ar', m.params);
        dialog({
          title: m.subject,
          wide: true,
          body: `<small class="muted" dir="ltr">${esc(m.to_email)} · ${esc(dateTime(m.created_at))}</small><div class="preview-wrap"><iframe class="preview-frame" style="height:70svh" sandbox="allow-popups" title="${esc(m.subject)}"></iframe></div>`,
          onOpen: (d) => (d.querySelector('iframe').srcdoc = mail.html),
        });
      }
    });
    return () => clearTimeout(t);
  },
};
