import { VAPID_PUBLIC_KEY } from '../../js/backend/config.js';
import { PAYMENT_METHODS } from '../../js/backend/model.js';
import { installApp, reload, render, store } from '../main.js';
import { L, bad, chime, confirmDialog, dialog, download, esc, icon, lang, ok, setLang, tr } from '../ui.js';
import { busy, mount } from './common.js';

const SOUND = 'zooot-hq-sound';
const soundOn = () => {
  try {
    return localStorage.getItem(SOUND) !== 'off';
  } catch {
    return true;
  }
};

function b64ToBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function enablePush() {
  if (!('Notification' in window)) throw new Error(L('المتصفح ما يدعم التنبيهات', 'This browser doesn’t support notifications'));
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(L('ما سمحت بالتنبيهات — فعّلها من إعدادات المتصفح', 'Notifications were blocked — allow them in browser settings'));
  if (store.mode === 'supabase' && VAPID_PUBLIC_KEY && 'serviceWorker' in navigator && store.api.push) {
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC_KEY) }));
    await store.api.push.save(sub);
    return 'push';
  }
  return 'local';
}

let ping = null;

export default {
  render(host) {
    const pub = store.settings.public || {};
    const nt = store.settings.notifications || {};
    const methods = pub.payment_methods || ['cod', 'transfer'];
    const demo = store.mode === 'demo';
    const notif = 'Notification' in window ? Notification.permission : 'unsupported';
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

    const el = mount(
      host,
      `<div class="cols">
        <div style="display:grid;gap:18px;min-width:0">
          <form class="card" data-form="public" style="display:grid;gap:12px">
            <div class="card-h" style="margin:0"><h2>${esc(L('المتجر', 'Store'))}</h2><small>${esc(L('يظهر للعملاء في السلة', 'Customers see this at checkout'))}</small></div>
            <div class="grid-2">
              <label class="f"><span>${esc(L('رسوم الشحن (ر.س)', 'Shipping fee (SAR)'))}</span><input name="shipping_fee" type="number" min="0" step="0.01" value="${esc(pub.shipping_fee ?? 0)}"></label>
              <label class="f"><span>${esc(L('شحن مجاني فوق (ر.س، 0 = لا)', 'Free shipping over (SAR, 0 = off)'))}</span><input name="free_shipping_over" type="number" min="0" step="1" value="${esc(pub.free_shipping_over ?? 0)}"></label>
            </div>
            <div class="f"><span>${esc(L('طرق الدفع المتاحة في المتجر', 'Payment methods offered at checkout'))}</span><div class="chips">${PAYMENT_METHODS.filter((m) => !['refund', 'cash'].includes(m.id))
              .map((m) => `<label class="check chip"><input type="checkbox" name="pm_${m.id}" ${methods.includes(m.id) ? 'checked' : ''}>${esc(tr(m))}</label>`)
              .join('')}</div></div>
            <label class="f"><span>${esc(L('بيانات التحويل البنكي (تظهر للعميل وفي التذكير)', 'Bank transfer details (shown to customers & in reminders)'))}</span><textarea name="bank_details" rows="3" dir="auto" placeholder="${esc(L('اسم البنك — اسم الحساب — الآيبان SA…', 'Bank — account name — IBAN SA…'))}">${esc(pub.bank_details || '')}</textarea></label>
            <div class="grid-3">
              <label class="f"><span>${esc(L('واتساب المتجر', 'Store WhatsApp'))}</span><input name="whatsapp" dir="ltr" inputmode="tel" placeholder="9665XXXXXXXX" value="${esc(pub.whatsapp || '')}"></label>
              <label class="f"><span>Instagram</span><input name="instagram" dir="ltr" type="url" placeholder="https://instagram.com/…" value="${esc(pub.instagram || '')}"></label>
              <label class="f"><span>TikTok</span><input name="tiktok" dir="ltr" type="url" placeholder="https://tiktok.com/@…" value="${esc(pub.tiktok || '')}"></label>
            </div>
            <div class="row"><button class="b b-primary" type="submit">${icon('check')}${esc(L('حفظ', 'Save'))}</button></div>
          </form>

          <form class="card" data-form="notifications" style="display:grid;gap:12px">
            <div class="card-h" style="margin:0"><h2>${esc(L('التنبيهات والإيميلات', 'Alerts & emails'))}</h2></div>
            <label class="f"><span>${esc(L('بريد المالك (يوصله تنبيه كل طلب)', 'Owner email (gets every new-order alert)'))}</span><input name="owner_email" type="email" dir="ltr" value="${esc(nt.owner_email || '')}"></label>
            <label class="switch"><input type="checkbox" name="owner_new_order" ${nt.owner_new_order !== false ? 'checked' : ''}>${esc(L('أرسل لي إيميل مع كل طلب جديد', 'Email me on every new order'))}</label>
            <label class="switch"><input type="checkbox" name="status_emails" ${nt.status_emails !== false ? 'checked' : ''}>${esc(L('أرسل للعميل إيميل لما تتغير حالة طلبه (افتراضيًا)', 'Email customers when their order status changes (default)'))}</label>
            <div class="row"><button class="b b-primary" type="submit">${icon('check')}${esc(L('حفظ', 'Save'))}</button></div>
          </form>
        </div>

        <div style="display:grid;gap:18px;min-width:0">
          <section class="card" style="display:grid;gap:12px">
            <div class="card-h" style="margin:0"><h2>${esc(L('هذا الجهاز', 'This device'))}</h2></div>
            <div class="spread"><span class="row" style="gap:8px">${icon('bell')}${esc(L('تنبيهات الطلبات الجديدة', 'New-order notifications'))}</span>${
              notif === 'granted'
                ? `<span class="badge" style="--c:var(--ok)"><i></i>${esc(L('مفعّلة', 'On'))}</span>`
                : notif === 'unsupported'
                  ? `<span class="badge"><i></i>${esc(L('غير مدعومة', 'Unsupported'))}</span>`
                  : `<button class="b b-sm b-dark" type="button" data-push>${esc(L('فعّل', 'Turn on'))}</button>`
            }</div>
            <label class="switch"><input type="checkbox" data-sound ${soundOn() ? 'checked' : ''}>${esc(L('صوت تنبيه للطلبات الجديدة', 'Chime on new orders'))}</label>
            <div class="spread"><span class="row" style="gap:8px">${icon('install')}${esc(L('ثبّت اللوحة كتطبيق', 'Install as an app'))}</span>${standalone ? `<span class="badge" style="--c:var(--ok)"><i></i>${esc(L('مثبّتة', 'Installed'))}</span>` : `<button class="b b-sm" type="button" data-install-app>${esc(L('ثبّت', 'Install'))}</button>`}</div>
            <div class="spread"><span class="row" style="gap:8px">${icon('globe')}${esc(L('اللغة', 'Language'))}</span><div class="seg"><button type="button" data-setlang="ar" aria-pressed="${lang === 'ar'}">عربي</button><button type="button" data-setlang="en" aria-pressed="${lang === 'en'}">English</button></div></div>
          </section>

          <section class="card" style="display:grid;gap:10px">
            <div class="card-h" style="margin:0"><h2>${esc(L('الربط', 'Connections'))}</h2></div>
            <div class="spread"><span>${esc(L('قاعدة البيانات', 'Database'))}</span>${demo ? `<span class="badge" style="--c:var(--warn)"><i></i>${esc(L('تجريبي (هذا المتصفح)', 'Demo (this browser)'))}</span>` : `<span class="badge" style="--c:var(--ok)"><i></i>Supabase · LIVE</span>`}</div>
            <div class="spread"><span>${esc(L('الإيميلات', 'Emails'))} (Resend)</span><span data-resend class="muted">…</span></div>
            <div class="spread"><span>${esc(L('تنبيهات الجوال', 'Phone push'))}</span><span data-pushstate class="muted">…</span></div>
            ${
              demo
                ? `<p class="muted" style="font-size:13px">${esc(L('عشان تصير الطلبات حقيقية ومشتركة بين أجهزتكم: أنشئ مشروع Supabase مجاني وحط رابطه ومفتاحه العام في إعدادات GitHub — الخطوات في README تحت «لوحة التحكم».', 'To make orders real and shared across your devices: create a free Supabase project and add its URL + public key in the GitHub settings — steps in the README under “Owner dashboard”.'))}</p>`
                : ''
            }
          </section>

          <section class="card" style="display:grid;gap:10px">
            <div class="card-h" style="margin:0"><h2>${esc(L('المناديب', 'Couriers'))}</h2><a class="b b-sm" href="../courier/" target="_blank" rel="noopener">${icon('truck')}${esc(L('تطبيق المندوب', 'Courier app'))}</a></div>
            ${
              store.couriers.length
                ? store.couriers
                    .map((c) => {
                      const l = c.location;
                      const fresh = l && Date.now() - Date.parse(l.updated_at) < 10 * 60000;
                      return `<div class="spread" style="padding:6px 0;border-bottom:1px solid #f0ebe1">
                        <span class="row" style="gap:10px;flex-wrap:nowrap">${icon('user')}<span style="line-height:1.4"><strong>${esc(c.name || c.email)}</strong><br><small class="muted" dir="ltr">${esc(c.email || '')}${c.phone ? ` · ${esc(c.phone)}` : ''}</small><br><small style="color:${fresh ? 'var(--ok)' : 'var(--muted)'}">${esc(l ? `${fresh ? L('يشارك موقعه', 'Live now') : L('آخر موقع', 'Last seen')} · ${new Date(l.updated_at).toLocaleString(lang === 'en' ? 'en-GB' : 'ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : L('ما شارك موقع للحين', 'No location yet'))}</small></span></span>
                        <span class="row" style="flex-wrap:nowrap"><label class="switch" title="${esc(L('نشط', 'Active'))}"><input type="checkbox" data-courier-active="${esc(c.id)}" ${c.active ? 'checked' : ''}><span class="sr">${esc(L('نشط', 'Active'))}</span></label><button class="b b-sm b-icon b-ghost" type="button" data-courier-edit="${esc(c.id)}" aria-label="${esc(L('تعديل', 'Edit'))}">${icon('edit')}</button></span>
                      </div>`;
                    })
                    .join('')
                : `<p class="muted">${esc(L('ما فيه مناديب للحين.', 'No couriers yet.'))}</p>`
            }
            <button class="b" type="button" data-courier-add>${icon('plus')}${esc(L('أضف مندوب', 'Add a courier'))}</button>
            <p class="muted" style="font-size:13px">${esc(
              demo
                ? L('وضع تجريبي: المندوب التجريبي يدخل بـ courier1demo@zooot.sa. بعد ربط Supabase كل مندوب يدخل بحسابه.', 'Demo mode: the demo courier signs in as courier1demo@zooot.sa. With Supabase, every courier gets their own account.')
                : L('المندوب يحتاج حساب في Supabase أولًا (Authentication → Users أو npm run create-admin -- --courier)، بعدها أضفه هنا ببريده.', 'A courier needs a Supabase account first (Authentication → Users, or npm run create-admin -- --courier); then add them here by email.'),
            )}</p>
          </section>

          <section class="card" style="display:grid;gap:12px">
            <div class="card-h" style="margin:0"><h2>${esc(L('الحساب', 'Account'))}</h2></div>
            <div class="spread"><span dir="ltr">${esc(store.me.email)}</span><button class="b b-sm" type="button" data-signout>${icon('logout')}${esc(L('خروج', 'Sign out'))}</button></div>
            ${
              demo
                ? `<p class="muted" style="font-size:13px">${esc(L('في الوضع التجريبي كلمة المرور ثابتة ومحفوظة كبصمة مشفّرة فقط. بعد ربط Supabase تقدر تغيّرها من هنا وتضيف شريك.', 'In demo mode the password is fixed (stored only as a hash). Once Supabase is connected you can change it here and add a partner.'))}</p>`
                : `<button class="b" type="button" data-password>${icon('lock')}${esc(L('غيّر كلمة المرور', 'Change password'))}</button>`
            }
          </section>

          ${
            demo
              ? `<section class="card" style="display:grid;gap:10px">
            <div class="card-h" style="margin:0"><h2>${esc(L('البيانات التجريبية', 'Demo data'))}</h2></div>
            <div class="row">
              <button class="b" type="button" data-data="export">${icon('download')}${esc(L('نسخة احتياطية', 'Back up'))}</button>
              <label class="b">${icon('upload')}${esc(L('استرجاع', 'Restore'))}<input type="file" accept="application/json" hidden data-import></label>
              ${store.api.demo.hasDemo() ? `<button class="b" type="button" data-data="clear">${icon('trash')}${esc(L('امسح التجريبي', 'Clear samples'))}</button>` : `<button class="b" type="button" data-data="seed">${icon('star')}${esc(L('عبّي بيانات تجريبية', 'Load samples'))}</button>`}
              <button class="b b-danger" type="button" data-data="reset">${icon('refresh')}${esc(L('صفّر كل شي', 'Reset everything'))}</button>
            </div>
          </section>`
              : ''
          }
        </div>
      </div>`,
    );

    const resendEl = el.querySelector('[data-resend]');
    const pushEl = el.querySelector('[data-pushstate]');
    const showPing = (p) => {
      resendEl.outerHTML = demo
        ? `<span class="badge" style="--c:var(--blue)"><i></i>${esc(L('معاينة فقط', 'Preview only'))}</span>`
        : p?.resend
          ? `<span class="badge" style="--c:var(--ok)"><i></i>${esc(p.from || 'Resend')}</span>`
          : `<span class="badge" style="--c:var(--bad)"><i></i>${esc(p?.missing ? L('الدالة غير منشورة', 'Function not deployed') : L('المفتاح ناقص', 'API key missing'))}</span>`;
      pushEl.outerHTML =
        !demo && p?.push && VAPID_PUBLIC_KEY
          ? `<span class="badge" style="--c:var(--ok)"><i></i>${esc(L('جاهزة', 'Ready'))}</span>`
          : `<span class="badge"><i></i>${esc(demo ? L('داخل المتصفح فقط', 'In-browser only') : L('غير مفعّلة (VAPID)', 'Off (VAPID)'))}</span>`;
    };
    if (ping) showPing(ping);
    else store.api.emails.ping().then((p) => showPing((ping = p)));

    el.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const key = form.dataset.form;
      const d = Object.fromEntries(new FormData(form));
      let value;
      if (key === 'public') {
        value = {
          shipping_fee: Math.max(0, Number(d.shipping_fee) || 0),
          free_shipping_over: Math.max(0, Number(d.free_shipping_over) || 0),
          payment_methods: PAYMENT_METHODS.map((m) => m.id).filter((id) => d[`pm_${id}`]),
          bank_details: d.bank_details.trim(),
          whatsapp: d.whatsapp.replace(/\D/g, ''),
          instagram: d.instagram.trim(),
          tiktok: d.tiktok.trim(),
        };
        if (!value.payment_methods.length) return bad(new Error(L('اختر طريقة دفع وحدة على الأقل', 'Pick at least one payment method')));
      } else {
        value = { owner_email: d.owner_email.trim().toLowerCase(), owner_new_order: Boolean(d.owner_new_order), status_emails: Boolean(d.status_emails) };
      }
      const out = await busy(form.querySelector('[type=submit]'), () => store.api.settings.save(key, value), L('انحفظت الإعدادات', 'Settings saved'));
      if (out) store.settings = out;
    });

    el.addEventListener('change', async (e) => {
      if (e.target.matches('[data-courier-active]')) {
        const out = await busy(null, () => store.api.couriers.save(e.target.dataset.courierActive, { active: e.target.checked }), L('انحفظ', 'Saved'));
        if (out) await reload(['couriers']);
        else e.target.checked = !e.target.checked;
        return;
      }
      if (e.target.matches('[data-sound]')) {
        try {
          localStorage.setItem(SOUND, e.target.checked ? 'on' : 'off');
        } catch {
          /* ignore */
        }
        if (e.target.checked) chime();
      }
      if (e.target.matches('[data-import]') && e.target.files[0]) {
        try {
          const data = JSON.parse(await e.target.files[0].text());
          if (!(await confirmDialog(L('استرجاع النسخة يستبدل كل البيانات الحالية بهذا المتصفح. متأكد؟', 'Restoring replaces all current data in this browser. Continue?'), { danger: true }))) return;
          store.api.demo.import(data);
          await reload();
          ok(L('تم الاسترجاع', 'Restored'));
          render();
        } catch (ex) {
          bad(ex);
        }
      }
    });

    el.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.matches('[data-courier-add], [data-courier-edit]')) {
        const c = store.couriers.find((x) => x.id === b.dataset.courierEdit);
        const r = await dialog({
          title: c ? L('تعديل المندوب', 'Edit courier') : L('أضف مندوب', 'Add a courier'),
          body: `${c ? '' : `<label class="f"><span>${esc(L('بريد حسابه', 'Their account email'))}</span><input name="email" type="email" dir="ltr" required></label>`}
            <label class="f"><span>${esc(L('الاسم (يظهر للعميل)', 'Name (customers see it)'))}</span><input name="name" required value="${esc(c?.name || '')}"></label>
            <label class="f"><span>${esc(L('الجوال', 'Mobile'))}</span><input name="phone" dir="ltr" inputmode="tel" value="${esc(c?.phone || '')}"></label>`,
          actions: [
            { label: L('إلغاء', 'Cancel'), value: '', cls: 'b-ghost' },
            { label: L('حفظ', 'Save'), value: 'ok', cls: 'b-primary', submit: true },
          ],
        });
        if (!r) return;
        const out = await busy(null, () => (c ? store.api.couriers.save(c.id, { name: r.data.name, phone: r.data.phone }) : store.api.couriers.add(r.data)), L('انحفظ', 'Saved'));
        if (out) {
          await reload(['couriers']);
          render();
        }
        return;
      }
      if (b.matches('[data-push]')) {
        const mode = await busy(b, enablePush);
        if (mode) {
          ok(mode === 'push' ? L('بتوصلك تنبيهات حتى لو اللوحة مقفلة', 'You’ll get alerts even when the dashboard is closed') : L('بتوصلك تنبيهات وهذي اللوحة مفتوحة', 'You’ll get alerts while the dashboard is open'));
          render();
        }
      } else if (b.matches('[data-install-app]')) installApp();
      else if (b.matches('[data-setlang]')) {
        setLang(b.dataset.setlang);
        location.reload();
      } else if (b.matches('[data-signout]')) {
        await store.api.auth.signOut();
        location.hash = '#/';
        location.reload();
      } else if (b.matches('[data-password]')) {
        const r = await dialog({
          title: L('كلمة مرور جديدة', 'New password'),
          body: `<label class="f"><span>${esc(L('كلمة المرور الجديدة (١٠ أحرف على الأقل)', 'New password (at least 10 characters)'))}</span><input name="pw" type="password" minlength="10" required autocomplete="new-password" dir="ltr"></label>
            <label class="f"><span>${esc(L('أعد كتابتها', 'Repeat it'))}</span><input name="pw2" type="password" minlength="10" required autocomplete="new-password" dir="ltr"></label>`,
          actions: [
            { label: L('إلغاء', 'Cancel'), value: '', cls: 'b-ghost' },
            { label: L('غيّر', 'Change'), value: 'ok', cls: 'b-primary', submit: true },
          ],
        });
        if (!r) return;
        if (r.data.pw !== r.data.pw2) return bad(new Error(L('الكلمتين مو متطابقة', 'Passwords don’t match')));
        await busy(null, () => store.api.auth.changePassword(r.data.pw), L('تغيّرت كلمة المرور', 'Password changed'));
      } else if (b.dataset.data === 'export') {
        download(`zooot-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(store.api.demo.export(), null, 2), 'application/json');
      } else if (b.dataset.data) {
        const act = b.dataset.data;
        if (act === 'reset' && !(await confirmDialog(L('حذف كل الطلبات والمشتركين والإعدادات من هذا المتصفح؟', 'Delete every order, subscriber and setting in this browser?'), { danger: true, okLabel: L('صفّر', 'Reset') })))
          return;
        await busy(b, async () => {
          store.api.demo[act]();
          await reload();
        });
        render();
      }
    });
    return null;
  },
};
