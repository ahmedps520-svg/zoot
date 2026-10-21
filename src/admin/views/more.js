import { installApp, store } from '../main.js';
import { L, esc, icon, lang, setLang } from '../ui.js';
import { mount } from './common.js';

const LINKS = [
  { href: '#/payments', icon: 'pay', ar: 'المدفوعات', en: 'Payments' },
  { href: '#/customers', icon: 'users', ar: 'العملاء', en: 'Customers' },
  { href: '#/subscribers', icon: 'heart', ar: 'المشتركين', en: 'Subscribers' },
  { href: '#/emails', icon: 'mail', ar: 'الإيميلات', en: 'Emails' },
  { href: '#/settings', icon: 'gear', ar: 'الإعدادات', en: 'Settings' },
];

/** Mobile overflow menu — everything the bottom tab bar has no room for. */
export default {
  render(host) {
    const el = mount(
      host,
      `<section class="card" style="padding:8px">
        <nav class="tpl-list" aria-label="${esc(L('المزيد', 'More'))}">
          ${LINKS.map((l) => `<a class="b b-ghost" style="justify-content:flex-start;min-height:52px" href="${l.href}">${icon(l.icon)}<span>${esc(L(l.ar, l.en))}</span></a>`).join('')}
          <a class="b b-ghost" style="justify-content:flex-start;min-height:52px" href="../index.html" target="_blank" rel="noopener">${icon('out')}<span>${esc(L('افتح المتجر', 'Open the store'))}</span></a>
        </nav>
      </section>
      <section class="card" style="display:grid;gap:10px">
        <div class="spread"><span class="muted" dir="ltr">${esc(store.me.email)}</span><span class="live is-on"><i></i>${store.mode === 'demo' ? 'DEMO' : 'LIVE'}</span></div>
        <div class="row">
          <button class="b" type="button" data-l>${icon('globe')}${lang === 'en' ? 'عربي' : 'English'}</button>
          <button class="b" type="button" data-i>${icon('install')}${esc(L('ثبّت التطبيق', 'Install app'))}</button>
          <button class="b" type="button" data-o>${icon('logout')}${esc(L('خروج', 'Sign out'))}</button>
        </div>
      </section>`,
    );
    el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-l]')) {
        setLang(lang === 'en' ? 'ar' : 'en');
        location.reload();
      }
      if (e.target.closest('[data-i]')) installApp();
      if (e.target.closest('[data-o]')) {
        await store.api.auth.signOut();
        location.hash = '#/';
        location.reload();
      }
    });
    return null;
  },
};
