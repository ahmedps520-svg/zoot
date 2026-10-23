import '@fontsource-variable/kufam/wght.css';
import '@fontsource/lalezar/400.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import '@fontsource/archivo-black/400.css';
import '@fontsource-variable/archivo/wdth.css';
import '../styles/base.css';
import '../styles/admin.css';

import { backend, MODE } from '../js/backend/index.js';
import { bad, chime, esc, icon, L, lang, money, setLang, toast } from './ui.js';
import { renderLogin } from './views/login.js';
import overview from './views/overview.js';
import orders from './views/orders.js';
import order from './views/order.js';
import newOrder from './views/new-order.js';
import payments from './views/payments.js';
import products from './views/products.js';
import customers from './views/customers.js';
import subscribers from './views/subscribers.js';
import emails from './views/emails.js';
import settings from './views/settings.js';
import more from './views/more.js';

/* ------------------------------------------------------------------ store */
export const store = {
  api: null,
  mode: MODE,
  me: null,
  orders: [],
  products: [],
  subscribers: [],
  settings: { public: {}, notifications: {} },
  emails: [],
  couriers: [],
  live: false,
  selfCreated: new Set(),
  installPrompt: null,
};

const NAV = [
  { path: '', icon: 'home', ar: 'نظرة عامة', en: 'Overview', view: overview },
  { path: 'orders', icon: 'orders', ar: 'الطلبات', en: 'Orders', view: orders, count: () => store.orders.filter((o) => o.status === 'new').length },
  { path: 'payments', icon: 'pay', ar: 'المدفوعات', en: 'Payments', view: payments },
  { path: 'products', icon: 'box', ar: 'المنتجات والمخزون', en: 'Products & stock', view: products, count: () => lowStock().length || '' },
  { path: 'customers', icon: 'users', ar: 'العملاء', en: 'Customers', view: customers },
  { path: 'subscribers', icon: 'heart', ar: 'المشتركين', en: 'Subscribers', view: subscribers },
  { path: 'emails', icon: 'mail', ar: 'الإيميلات', en: 'Emails', view: emails },
  { path: 'settings', icon: 'gear', ar: 'الإعدادات', en: 'Settings', view: settings },
];
const EXTRA = [
  { path: 'orders/:no', view: order, parent: 'orders' },
  { path: 'new', view: newOrder, ar: 'طلب جديد', en: 'New order', parent: 'orders' },
  { path: 'more', view: more, ar: 'المزيد', en: 'More' },
];

export function lowStock() {
  return store.products.filter((p) => p.active && p.type !== 'custom' && (p.out_of_stock || (p.stock && Object.values(p.stock).some((v) => Number(v) <= 2))));
}

/* ------------------------------------------------------------------ data */
export async function reload(which = ['orders', 'products', 'subscribers', 'settings', 'emails', 'couriers']) {
  const api = store.api;
  const jobs = {
    orders: () => api.orders.list(),
    products: () => api.productsApi.list(),
    subscribers: () => api.subscribers.list(),
    settings: () => api.settings.get(),
    emails: () => api.emails.list(),
    couriers: () => api.couriers?.list() ?? [],
  };
  const results = await Promise.allSettled(which.map((k) => jobs[k]()));
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') store[which[i]] = r.value;
    else console.error(which[i], r.reason);
  });
}

/* ------------------------------------------------------------------ router */
let cleanup = null;
let pendingRender = false;
const viewEl = () => document.getElementById('view');

function parse() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  for (const r of [...NAV, ...EXTRA]) {
    const keys = [];
    const re = new RegExp(`^${r.path.replace(/:([a-z]+)/g, (_, k) => (keys.push(k), '([^/]+)'))}$`);
    const m = path.match(re);
    if (m) return { route: r, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])), query };
  }
  return { route: NAV[0], params: {}, query };
}

export function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

/** soft: keep scroll (live refresh). force: the user asked for it, so don't wait for focus to leave. */
export function render({ soft = false, force = false } = {}) {
  const host = viewEl();
  if (!host) return;
  // Never yank a form out from under someone who is typing.
  if (soft && !force && host.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
    pendingRender = true;
    return;
  }
  pendingRender = false;
  const { route, params, query } = parse();
  if (soft && route.view.live === false) return;
  const title = route.view.title?.(params) || L(route.ar, route.en);
  document.querySelector('.top h1').textContent = title;
  updateChrome(route);
  const y = soft ? window.scrollY : 0;
  cleanup?.();
  cleanup = route.view.render(host, { params, query, soft }) || null;
  if (!soft) window.scrollTo(0, 0);
  else window.scrollTo(0, y);
}

function updateChrome(route) {
  const active = route.parent || route.path;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === active || (active === 'more' && a.dataset.nav === 'more');
    on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
  const n = store.orders.filter((o) => o.status === 'new').length;
  document.querySelectorAll('[data-count="orders"]').forEach((el) => {
    el.textContent = n;
    el.hidden = !n;
  });
  const low = lowStock().length;
  document.querySelectorAll('[data-count="products"]').forEach((el) => {
    el.textContent = low;
    el.hidden = !low;
  });
  document.title = `${n ? `(${n}) ` : ''}ZOOOT HQ`;
  if ('setAppBadge' in navigator) (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
  document.querySelector('[data-live]')?.classList.toggle('is-on', store.live);
}

document.addEventListener('focusout', () => {
  if (pendingRender) setTimeout(() => !document.activeElement?.matches?.('input,textarea,select') && render({ soft: true }), 50);
});

/* ------------------------------------------------------------------ shell */
function shell() {
  const root = document.getElementById('root');
  root.className = '';
  root.removeAttribute('aria-busy');
  root.innerHTML = `
    <div class="app">
      <aside class="side" aria-label="${esc(L('القائمة', 'Navigation'))}">
        <a class="side-brand" href="#/"><svg aria-hidden="true"><use href="#zooot-logo"/></svg><span class="hq-pill">HQ</span></a>
        <nav class="nav">
          ${NAV.slice(0, 2)
            .map(navLink)
            .join('')}
          <a href="#/new" data-nav="new">${icon('plus')}<span>${esc(L('طلب جديد', 'New order'))}</span></a>
          <div class="nav-sep"></div>
          ${NAV.slice(2)
            .map(navLink)
            .join('')}
        </nav>
        <div class="side-foot">
          <div class="spread"><span class="live" data-live><i></i>${store.mode === 'demo' ? 'DEMO · LIVE' : 'LIVE'}</span><a class="muted" href="../index.html" target="_blank" rel="noopener" title="${esc(L('المتجر', 'Store'))}">${icon('out')}</a></div>
          <span class="who" title="${esc(store.me.email)}">${esc(store.me.email)}</span>
          <div class="row">
            <button class="b b-sm" type="button" data-lang>${icon('globe')}${lang === 'en' ? 'عربي' : 'English'}</button>
            <button class="b b-sm" type="button" data-install hidden>${icon('install')}${esc(L('ثبّت', 'Install'))}</button>
            <button class="b b-sm b-icon" type="button" data-logout title="${esc(L('تسجيل الخروج', 'Sign out'))}" aria-label="${esc(L('تسجيل الخروج', 'Sign out'))}">${icon('logout')}</button>
          </div>
        </div>
      </aside>
      <div class="main">
        <header class="top">
          <a class="top-mobile" href="#/" aria-label="ZOOOT HQ"><svg style="width:64px;height:30px" aria-hidden="true"><use href="#zooot-logo"/></svg></a>
          <h1></h1>
          <label class="search"><span class="sr">${esc(L('بحث', 'Search'))}</span>${icon('search')}<input class="in" type="search" data-search placeholder="${esc(L('ابحث برقم الطلب، الاسم، الجوال…', 'Search order no., name, phone…'))}"></label>
          <a class="b b-primary hide-m" href="#/new">${icon('plus')}${esc(L('طلب جديد', 'New order'))}</a>
          <button class="b b-ghost b-icon top-mobile" type="button" data-lang aria-label="Language">${icon('globe')}</button>
        </header>
        <main class="content" id="view"></main>
      </div>
    </div>
    <nav class="tabbar" aria-label="${esc(L('التنقل', 'Tabs'))}">
      <a href="#/" data-nav="">${icon('home')}<span>${esc(L('الرئيسية', 'Home'))}</span></a>
      <a href="#/orders" data-nav="orders">${icon('orders')}<span>${esc(L('الطلبات', 'Orders'))}</span><span class="count" data-count="orders" hidden></span></a>
      <a href="#/new" data-nav="new" class="tab-new"><span>${icon('plus')}</span><span>${esc(L('جديد', 'New'))}</span></a>
      <a href="#/products" data-nav="products">${icon('box')}<span>${esc(L('المخزون', 'Stock'))}</span><span class="count" data-count="products" hidden></span></a>
      <a href="#/more" data-nav="more">${icon('more')}<span>${esc(L('المزيد', 'More'))}</span></a>
    </nav>`;

  root.addEventListener('click', async (e) => {
    if (e.target.closest('[data-lang]')) {
      setLang(lang === 'en' ? 'ar' : 'en');
      shell();
      render();
    }
    if (e.target.closest('[data-logout]')) {
      await store.api.auth.signOut();
      location.hash = '#/';
      location.reload();
    }
    if (e.target.closest('[data-install]')) installApp();
  });
  root.querySelector('[data-search]').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') go(`#/orders?q=${encodeURIComponent(e.target.value.trim())}`);
  });
  if (store.installPrompt) root.querySelectorAll('[data-install]').forEach((b) => (b.hidden = false));
}

function navLink(n) {
  return `<a href="#/${n.path}" data-nav="${n.path}">${icon(n.icon)}<span>${esc(L(n.ar, n.en))}</span>${n.count ? `<span class="count" data-count="${n.path}" hidden></span>` : ''}</a>`;
}

/* ------------------------------------------------------------------ live */
let reloadTimer = null;
// New orders are announced after the reload, so the alert shows the final total
// (the INSERT event fires before the items are priced).
const pendingNew = new Map();
function onLive(change) {
  if (change.table === 'orders' && change.type === 'INSERT' && change.record && !store.selfCreated.has(change.record.id)) pendingNew.set(change.record.id, change.record);
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(async () => {
    const which =
      change.table === '*'
        ? undefined
        : change.table === 'products'
          ? ['products']
          : change.table === 'subscribers'
            ? ['subscribers', 'emails']
            : change.table === 'settings'
              ? ['settings']
              : change.table === 'email_log'
                ? ['emails', 'orders']
                : ['couriers', 'courier_locations'].includes(change.table)
                  ? ['couriers']
                  : ['orders', 'products', 'emails'];
    await reload(pendingNew.size ? undefined : which);
    for (const [id, rec] of pendingNew) notifyNewOrder(store.orders.find((o) => o.id === id) || rec);
    pendingNew.clear();
    // Location pings only refresh screens that show couriers.
    if (change.table === 'courier_locations' && !/^#\/(orders\/|settings)/.test(location.hash)) return;
    render({ soft: true });
  }, 250);
}

async function notifyNewOrder(o) {
  const title = L(`طلب جديد ${o.order_no}`, `New order ${o.order_no}`);
  const body = `${o.customer_name || ''} · ${money(o.total || 0)}`;
  toast(`${title} — ${body}`, { tone: 'new', timeout: 9000, action: { label: L('افتح', 'Open'), onClick: () => go(`#/orders/${o.order_no}`) } });
  if (localStorage.getItem('zooot-hq-sound') !== 'off') chime();
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    const reg = await navigator.serviceWorker?.getRegistration();
    reg?.showNotification(title, { body, icon: 'icon-192.png', badge: 'icon-192.png', tag: o.order_no, data: { url: `#/orders/${o.order_no}` } });
  }
}

/* ------------------------------------------------------------------ PWA */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  store.installPrompt = e;
  document.querySelectorAll('[data-install]').forEach((b) => (b.hidden = false));
});
export async function installApp() {
  if (!store.installPrompt) {
    toast(L('على الآيفون: زر المشاركة ← «إضافة إلى الشاشة الرئيسية»', 'On iPhone: Share → “Add to Home Screen”'), { timeout: 7000 });
    return;
  }
  store.installPrompt.prompt();
  await store.installPrompt.userChoice;
  store.installPrompt = null;
  document.querySelectorAll('[data-install]').forEach((b) => (b.hidden = true));
}
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('sw', e));
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.url) location.hash = e.data.url.replace(/^.*#/, '#');
  });
}

/* ------------------------------------------------------------------ boot */
async function start() {
  setLang(lang);
  store.api = await backend();
  const session = await store.api.auth.session().catch(() => null);
  if (!session) {
    renderLogin(document.getElementById('root'), {
      mode: store.mode,
      onSignIn: async (email, password, remember) => {
        store.me = await store.api.auth.signIn(email, password, { remember });
        await enter();
      },
    });
    return;
  }
  store.me = session;
  await enter();
}

async function enter() {
  document.getElementById('root').innerHTML = `<svg aria-hidden="true"><use href="#zooot-logo"/></svg>`;
  document.getElementById('root').className = 'loading';
  await reload();
  shell();
  store.api.live(onLive);
  store.live = true;
  window.addEventListener('hashchange', () => render());
  window.addEventListener('online', () => toast(L('رجع الاتصال', 'Back online'), { tone: 'ok' }));
  window.addEventListener('offline', () => toast(L('أنت غير متصل — بعض الميزات متوقفة', 'You’re offline — some features paused'), { tone: 'bad' }));
  render();
}

start().catch((e) => {
  console.error(e);
  bad(e);
});
