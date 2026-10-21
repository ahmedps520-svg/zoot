/**
 * Demo backend — everything lives in this browser's localStorage.
 * Mirrors the Supabase schema rules (server-side prices, stock, derived totals,
 * audit events, cancel → restock) so the dashboard behaves the same in both modes.
 * Tabs stay in sync through BroadcastChannel + storage events (live orders).
 */
import { CONFIG, PRODUCTS } from '../data.js';
import { DEMO_COURIERS, DEMO_OWNER } from './config.js';
import { balanceOf, computeTotals, FLOW, ONE, phoneKey, round2, SIZES } from './model.js';
import * as T from '../../../supabase/functions/_shared/email-templates.js';

const KEY = 'zooot-db-v1';
const SESSION = 'zooot-owner-session';
const THROTTLE = 'zooot-owner-throttle';
const chan = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('zooot-db') : null;
const listeners = new Set();

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
const now = () => new Date().toISOString();
const clone = (x) => JSON.parse(JSON.stringify(x));
const siteUrl = () => new URL('.', location.href.replace(/\/admin\/.*$/, '/')).href.replace(/\/$/, '');

/* ------------------------------------------------------------------ storage */
const blank = () => ({
  version: 1,
  seq: 1001,
  orders: [],
  products: {},
  subscribers: [],
  settings: {
    public: { shipping_fee: 0, free_shipping_over: 0, whatsapp: CONFIG.whatsapp || '', payment_methods: ['cod', 'transfer'], bank_details: '', instagram: '', tiktok: '' },
    notifications: { owner_email: DEMO_OWNER.email, status_emails: true, owner_new_order: true },
  },
  emails: [],
  couriers: [{ id: DEMO_COURIERS[0].id, email: DEMO_COURIERS[0].email, name: 'سالم', phone: '0550000001', active: true, created_at: new Date().toISOString() }],
  locations: {},
});

function load() {
  try {
    const db = JSON.parse(localStorage.getItem(KEY) || 'null');
    return db && db.version === 1 ? { ...blank(), ...db } : blank();
  } catch {
    return blank();
  }
}

function save(db, change) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    throw new Error(e.name === 'QuotaExceededError' ? 'storage_full' : 'storage_unavailable');
  }
  if (change) {
    chan?.postMessage(change);
    // Next tick, so the caller (e.g. "create order") finishes before listeners react — like a real backend.
    setTimeout(() => emit(change), 0);
  }
}

function emit(change) {
  listeners.forEach((cb) => {
    try {
      cb(change);
    } catch (e) {
      console.error(e);
    }
  });
}
chan && (chan.onmessage = (e) => emit(e.data));
window.addEventListener('storage', (e) => {
  if (e.key === KEY) emit({ table: '*', type: 'SYNC' });
});

/** Run a mutation on a fresh copy of the db (other tabs may have written). */
function tx(fn, change) {
  const db = load();
  const out = fn(db);
  save(db, typeof change === 'function' ? change(out) : change);
  return out;
}

/* ------------------------------------------------------------------ catalogue */
const BASE = [
  ...PRODUCTS.map((p, i) => ({
    id: p.id,
    type: p.type,
    ref: p.ref,
    name: p.name,
    sub: p.sub,
    description: null,
    price: p.price,
    compare_at_price: null,
    images: p.imgs,
    swatches: p.swatches,
    sizes: p.type === 'set' ? [] : [...SIZES],
    stock: null,
    out_of_stock: false,
    active: true,
    sort: (i + 1) * 10,
    builtin: true,
  })),
  {
    id: 'custom-set',
    type: 'custom',
    ref: 'studio',
    name: { ar: 'طقم زوووط مخصّص', en: 'Custom ZOOOT set' },
    sub: { ar: 'من استوديو زوووط', en: 'From the ZOOOT studio' },
    description: null,
    price: CONFIG.prices.set,
    compare_at_price: null,
    images: [],
    swatches: [],
    sizes: [],
    stock: null,
    out_of_stock: false,
    active: true,
    sort: 999,
    builtin: true,
  },
];

function products(db) {
  const merged = BASE.map((p) => ({ ...p, ...(db.products[p.id] || {}) }));
  Object.entries(db.products)
    .filter(([id, v]) => v.custom && !BASE.some((b) => b.id === id))
    .forEach(([id, v]) => merged.push({ id, type: 'extra', sizes: [], stock: null, images: [], swatches: [], active: true, out_of_stock: false, sort: 500, ...v }));
  return merged.sort((a, b) => a.sort - b.sort);
}

/* ------------------------------------------------------------------ orders */
const ev = (type, data = {}, actor = null, at = now()) => ({ id: uid(), type, data, actor, created_at: at });
const findOrder = (db, idOrNo) => db.orders.find((o) => o.id === idOrNo || o.order_no === idOrNo);

function adjustStock(db, order, sign) {
  for (const it of order.items) {
    if (!it.product_id) continue;
    const ov = (db.products[it.product_id] ||= {});
    const base = BASE.find((b) => b.id === it.product_id);
    const stock = ov.stock !== undefined ? ov.stock : base?.stock;
    const k = it.size || ONE;
    if (stock && k in stock) ov.stock = { ...stock, [k]: Math.max(0, Number(stock[k]) + sign * it.qty) };
  }
}

function buildOrder(db, p, { admin = false, actor = null, at = now() } = {}) {
  if (!String(p.customer_name || '').trim()) throw new Error('invalid_name');
  if (!/^\+?[0-9 ]{9,18}$/.test(String(p.customer_phone || ''))) throw new Error('invalid_phone');
  if (p.customer_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.customer_email)) throw new Error('invalid_email');
  if (!admin && (!String(p.city || '').trim() || !String(p.address || '').trim())) throw new Error('invalid_address');
  if (!Array.isArray(p.items) || !p.items.length || p.items.length > 30) throw new Error('invalid_items');

  const catalog = products(db);
  const items = p.items.map((it) => {
    const prod = catalog.find((x) => x.id === it.pid);
    if (!prod) throw new Error(`unknown_product:${it.pid}`);
    if (!admin && (prod.out_of_stock || !prod.active)) throw new Error(`out_of_stock:${prod.id}`);
    const qty = Math.max(1, Math.min(Number(it.qty) || 1, admin ? 99 : 10));
    const k = it.size || ONE;
    if (prod.stock && k in prod.stock && !admin && Number(prod.stock[k]) < qty) throw new Error(`out_of_stock:${prod.id}:${k}`);
    const price = admin && it.unit_price !== undefined && it.unit_price !== '' ? Math.max(0, Number(it.unit_price)) : prod.price;
    return {
      id: uid(),
      product_id: prod.id,
      name: admin && it.name ? it.name : prod.name,
      image: it.image || prod.images?.[0] || null,
      options: Array.isArray(it.options) ? it.options : [],
      size: it.size || null,
      meta: it.meta || null,
      unit_price: round2(price),
      qty,
    };
  });

  const pub = db.settings.public || {};
  const subtotal = items.reduce((s, it) => s + it.unit_price * it.qty, 0);
  let shipping = Number(pub.shipping_fee) || 0;
  if (Number(pub.free_shipping_over) > 0 && subtotal >= Number(pub.free_shipping_over)) shipping = 0;
  if (admin && p.shipping !== undefined && p.shipping !== '') shipping = Math.max(0, Number(p.shipping));
  const paid = admin ? Math.max(0, Number(p.paid_amount) || 0) : 0;
  const order = computeTotals({
    id: uid(),
    order_no: `ZT-${db.seq++}`,
    status: admin && FLOW.includes(p.status) ? p.status : 'new',
    payment_method: p.payment_method || 'cod',
    source: admin ? p.source || 'manual' : 'web',
    customer_name: String(p.customer_name).trim(),
    customer_phone: String(p.customer_phone).trim(),
    customer_email: p.customer_email ? String(p.customer_email).trim().toLowerCase() : null,
    city: p.city || null,
    district: p.district || null,
    address: p.address || null,
    customer_note: p.customer_note || null,
    internal_note: admin ? p.internal_note || null : null,
    lang: p.lang === 'en' ? 'en' : 'ar',
    currency: 'SAR',
    discount: admin ? Math.max(0, Number(p.discount) || 0) : 0,
    shipping,
    courier: null,
    tracking_no: null,
    courier_id: null,
    delivery_eta: null,
    delivery_location: null,
    out_for_delivery_at: null,
    delivered_at: null,
    created_at: at,
    updated_at: at,
    items,
    payments: paid > 0 ? [{ id: uid(), amount: paid, method: p.payment_method || 'cash', reference: p.payment_reference || null, note: null, paid_at: at }] : [],
    events: [ev('created', { source: admin ? p.source || 'manual' : 'web' }, actor, at)],
  });
  if (paid > 0) order.events.push(ev('payment', { amount: paid, method: p.payment_method || 'cash' }, actor, at));
  adjustStock(db, order, -1);
  db.orders.unshift(order);
  return order;
}

const ORDER_FIELDS = ['status', 'payment_method', 'source', 'customer_name', 'customer_phone', 'customer_email', 'city', 'district', 'address', 'customer_note', 'internal_note', 'lang', 'discount', 'shipping', 'courier', 'tracking_no', 'courier_id', 'delivery_eta', 'delivery_location'];

function patchOrder(db, order, patch, actor) {
  const before = { status: order.status, total: order.total };
  for (const k of ORDER_FIELDS) if (k in patch) order[k] = patch[k] === '' ? null : patch[k];
  order.discount = Number(order.discount) || 0;
  order.shipping = Number(order.shipping) || 0;
  Object.assign(order, computeTotals(order), { updated_at: now() });
  if (order.status !== before.status) {
    if (order.status === 'shipped') order.out_for_delivery_at ||= now();
    if (order.status === 'delivered') order.delivered_at = now();
    order.events.push(ev('status', { from: before.status, to: order.status }, actor));
    if (order.status === 'cancelled') adjustStock(db, order, 1);
    if (before.status === 'cancelled') adjustStock(db, order, -1);
  }
  if (order.total !== before.total) order.events.push(ev('price', { from: before.total, to: order.total }, actor));
  return order;
}

const strip = (o) => {
  const { events, ...rest } = o;
  return rest;
};

/* ------------------------------------------------------------------ emails (demo outbox) */
function outbox(db, template, to, params, order_id = null) {
  const mail = renderEmail(template, params);
  db.emails.unshift({ id: uid(), to_email: to, subject: mail.subject, template, status: 'preview', order_id, params, created_at: now() });
  db.emails = db.emails.slice(0, 80);
}

export function renderEmail(template, params) {
  const base = { siteUrl: siteUrl(), ...params };
  switch (template) {
    case 'welcome':
      return T.welcomeEmail(base);
    case 'order_confirmation':
      return T.orderConfirmationEmail(base);
    case 'owner_new_order':
      return T.ownerNewOrderEmail(base);
    case 'custom':
      return T.customMessageEmail(base);
    case 'campaign':
    case 'campaign_test':
      return T.campaignEmail(base);
    default:
      return T.statusUpdateEmail(base);
  }
}

/* ================================================================== public API */
export const mode = 'demo';

export async function catalog() {
  return products(load()).filter((p) => p.active);
}

export async function publicSettings() {
  return load().settings.public || {};
}

export async function placeOrder(payload) {
  const order = tx(
    (db) => {
      const o = buildOrder(db, payload);
      const settings = db.settings;
      if (o.customer_email) outbox(db, 'order_confirmation', o.customer_email, { order: strip(o), settings: settings.public }, o.id);
      if (settings.notifications?.owner_email && settings.notifications.owner_new_order !== false)
        outbox(db, 'owner_new_order', settings.notifications.owner_email, { order: strip(o) }, o.id);
      return o;
    },
    (o) => ({ table: 'orders', type: 'INSERT', record: strip(o) }),
  );
  return { id: order.id, order_no: order.order_no, total: order.total, subtotal: order.subtotal, shipping: order.shipping };
}

export async function subscribe({ email, lang = 'ar', source = 'footer' }) {
  const clean = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new Error('invalid_email');
  return tx(
    (db) => {
      const existing = db.subscribers.find((s) => s.email === clean);
      if (existing && existing.status === 'subscribed') return { is_new: false };
      if (existing) Object.assign(existing, { status: 'subscribed', unsubscribed_at: null });
      const sub = existing || { id: uid(), email: clean, lang: lang === 'en' ? 'en' : 'ar', source, status: 'subscribed', token: uid(), created_at: now() };
      if (!existing) db.subscribers.unshift(sub);
      outbox(db, 'welcome', clean, { lang: sub.lang, unsubscribeUrl: `${siteUrl()}/track.html?unsubscribe=${sub.token}` });
      return { is_new: true };
    },
    { table: 'subscribers', type: 'INSERT' },
  );
}

export async function trackOrder(orderNo, phone) {
  const db = load();
  const o = db.orders.find((x) => x.order_no.toUpperCase() === String(orderNo || '').trim().toUpperCase());
  if (!o || phoneKey(phone).length < 9 || phoneKey(o.customer_phone) !== phoneKey(phone)) return null;
  return {
    order_no: o.order_no,
    status: o.status,
    payment_status: o.payment_status,
    created_at: o.created_at,
    updated_at: o.updated_at,
    courier: o.courier,
    tracking_no: o.tracking_no,
    total: o.total,
    currency: o.currency,
    lang: o.lang,
    delivered_at: o.delivered_at || null,
    driver: driverFor(db, o),
    items: o.items.map(({ name, qty, image, options }) => ({ name, qty, image, options })),
    events: o.events.filter((e) => ['created', 'status'].includes(e.type)).map((e) => ({ type: e.type, to: e.data.to, at: e.created_at })),
  };
}

/** What the customer sees about their courier: name, ETA and (if fresh) the live position. */
function driverFor(db, o) {
  if (o.status !== 'shipped' || !o.courier_id) return null;
  const c = (db.couriers || []).find((x) => x.id === o.courier_id);
  const l = (db.locations || {})[o.courier_id];
  const fresh = l && Date.now() - Date.parse(l.updated_at) < 10 * 60_000;
  return { name: c?.name || '', phone: c?.phone || null, eta: o.delivery_eta, out_at: o.out_for_delivery_at, location: fresh ? { lat: l.lat, lng: l.lng, accuracy: l.accuracy, heading: l.heading, at: l.updated_at } : null };
}

export async function unsubscribe(token) {
  return tx(
    (db) => {
      const s = db.subscribers.find((x) => x.token === token && x.status === 'subscribed');
      if (s) Object.assign(s, { status: 'unsubscribed', unsubscribed_at: now() });
      return Boolean(s);
    },
    { table: 'subscribers', type: 'UPDATE' },
  );
}

export function onChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/* ================================================================== owner API */
async function pbkdf2(password, saltHex, iterations) {
  const enc = new TextEncoder();
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const readJSON = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null');
  } catch {
    return null;
  }
};

export const auth = {
  async signIn(email, password, { remember = false } = {}) {
    const th = readJSON(THROTTLE) || { fails: 0, until: 0 };
    if (th.until > Date.now()) throw Object.assign(new Error('too_many_attempts'), { retryIn: Math.ceil((th.until - Date.now()) / 1000) });
    const ok =
      String(email).trim().toLowerCase() === DEMO_OWNER.email &&
      (await pbkdf2(String(password), DEMO_OWNER.salt, DEMO_OWNER.iterations)) === DEMO_OWNER.hash;
    if (!ok) {
      th.fails += 1;
      if (th.fails >= 5) Object.assign(th, { fails: 0, until: Date.now() + 60_000 });
      localStorage.setItem(THROTTLE, JSON.stringify(th));
      throw new Error('invalid_credentials');
    }
    localStorage.removeItem(THROTTLE);
    const session = { email: DEMO_OWNER.email, exp: Date.now() + (remember ? 30 : 1) * 86_400_000 };
    localStorage.setItem(SESSION, JSON.stringify(session));
    return { email: session.email };
  },
  async signOut() {
    localStorage.removeItem(SESSION);
  },
  async session() {
    const s = readJSON(SESSION);
    if (!s || s.exp < Date.now()) return null;
    return { email: s.email };
  },
  async changePassword() {
    throw new Error('demo_mode');
  },
};

const full = (o) => clone(o);

export const orders = {
  async list() {
    return load().orders.map((o) => full(strip(o)));
  },
  async get(idOrNo) {
    const o = findOrder(load(), idOrNo);
    return o ? full(o) : null;
  },
  async create(payload, actor) {
    const o = tx(
      (db) => buildOrder(db, payload, { admin: true, actor }),
      (x) => ({ table: 'orders', type: 'INSERT', record: strip(x) }),
    );
    return full(o);
  },
  async update(id, patch, actor) {
    return full(
      tx(
        (db) => {
          const o = findOrder(db, id);
          if (!o) throw new Error('not_found');
          return patchOrder(db, o, patch, actor);
        },
        (o) => ({ table: 'orders', type: 'UPDATE', record: strip(o) }),
      ),
    );
  },
  async remove(id) {
    tx(
      (db) => {
        const o = findOrder(db, id);
        if (o && o.status !== 'cancelled') adjustStock(db, o, 1);
        db.orders = db.orders.filter((x) => x.id !== id);
      },
      { table: 'orders', type: 'DELETE', record: { id } },
    );
  },
  async addNote(id, text, actor) {
    return full(
      tx(
        (db) => {
          const o = findOrder(db, id);
          o.events.push(ev('note', { text: String(text).slice(0, 2000) }, actor));
          return o;
        },
        (o) => ({ table: 'order_events', type: 'INSERT', record: { order_id: o.id } }),
      ),
    );
  },
};

const withOrder = (fn) => (db, orderId) => {
  const o = findOrder(db, orderId);
  if (!o) throw new Error('not_found');
  return fn(o, db);
};

export const items = {
  async update(orderId, itemId, patch, actor) {
    return full(
      tx(
        (db) => withOrder((o) => patchItem(db, o, itemId, patch, actor))(db, orderId),
        (o) => ({ table: 'order_items', type: 'UPDATE', record: { order_id: o.id } }),
      ),
    );
  },
  async add(orderId, item, actor) {
    return full(
      tx(
        (db) =>
          withOrder((o) => {
            const prod = products(db).find((p) => p.id === item.pid);
            o.items.push({
              id: uid(),
              product_id: prod?.id || null,
              name: item.name || prod?.name || { ar: 'قطعة', en: 'Item' },
              image: item.image || prod?.images?.[0] || null,
              options: item.options || [],
              size: item.size || null,
              meta: null,
              unit_price: round2(item.unit_price ?? prod?.price ?? 0),
              qty: Math.max(1, Number(item.qty) || 1),
            });
            return patchOrder(db, o, {}, actor);
          })(db, orderId),
        (o) => ({ table: 'order_items', type: 'INSERT', record: { order_id: o.id } }),
      ),
    );
  },
  async remove(orderId, itemId, actor) {
    return full(
      tx(
        (db) =>
          withOrder((o) => {
            o.items = o.items.filter((x) => x.id !== itemId);
            return patchOrder(db, o, {}, actor);
          })(db, orderId),
        (o) => ({ table: 'order_items', type: 'DELETE', record: { order_id: o.id } }),
      ),
    );
  },
};

function patchItem(db, o, itemId, patch, actor) {
  const it = o.items.find((x) => x.id === itemId);
  if (!it) throw new Error('not_found');
  if ('unit_price' in patch) it.unit_price = round2(Math.max(0, Number(patch.unit_price)));
  if ('qty' in patch) it.qty = Math.max(1, Math.min(99, Number(patch.qty) || 1));
  return patchOrder(db, o, {}, actor);
}

export const payments = {
  async add(orderId, p, actor) {
    return full(
      tx(
        (db) =>
          withOrder((o) => {
            const amount = round2(Number(p.amount));
            if (!amount) throw new Error('invalid_amount');
            const at = p.paid_at || now();
            o.payments.push({ id: uid(), amount, method: p.method || 'cash', reference: p.reference || null, note: p.note || null, paid_at: at });
            o.events.push(ev('payment', { amount, method: p.method || 'cash', reference: p.reference || null }, actor));
            return patchOrder(db, o, {}, actor);
          })(db, orderId),
        (o) => ({ table: 'payments', type: 'INSERT', record: { order_id: o.id } }),
      ),
    );
  },
  async remove(orderId, paymentId, actor) {
    return full(
      tx(
        (db) =>
          withOrder((o) => {
            o.payments = o.payments.filter((x) => x.id !== paymentId);
            return patchOrder(db, o, {}, actor);
          })(db, orderId),
        (o) => ({ table: 'payments', type: 'DELETE', record: { order_id: o.id } }),
      ),
    );
  },
};

export const productsApi = {
  async list() {
    return clone(products(load()));
  },
  async save(id, patch) {
    return tx(
      (db) => {
        const allowed = ['price', 'compare_at_price', 'stock', 'out_of_stock', 'active', 'name', 'sub', 'description', 'images', 'sizes', 'sort', 'type', 'swatches'];
        const ov = (db.products[id] ||= {});
        for (const k of allowed) if (k in patch) ov[k] = patch[k];
        return clone(products(db).find((p) => p.id === id));
      },
      { table: 'products', type: 'UPDATE', record: { id } },
    );
  },
  async create(data) {
    const id = data.id || `p-${Date.now().toString(36)}`;
    return tx(
      (db) => {
        if (products(db).some((p) => p.id === id)) throw new Error('duplicate_id');
        db.products[id] = { custom: true, type: 'extra', sort: 500, active: true, out_of_stock: false, images: [], swatches: [], sizes: [], stock: null, ...data, id };
        return clone(products(db).find((p) => p.id === id));
      },
      { table: 'products', type: 'INSERT', record: { id } },
    );
  },
  async remove(id) {
    tx(
      (db) => {
        if (!db.products[id]?.custom) throw new Error('builtin_product');
        delete db.products[id];
      },
      { table: 'products', type: 'DELETE', record: { id } },
    );
  },
  /** Demo: images are downscaled and kept inline (localStorage is small). */
  async uploadImage(file) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', 0.8);
  },
};

export const subscribers = {
  async list() {
    return clone(load().subscribers);
  },
  async add(email, lang = 'ar') {
    return subscribe({ email, lang, source: 'manual' });
  },
  async remove(id) {
    tx(
      (db) => {
        db.subscribers = db.subscribers.filter((s) => s.id !== id);
      },
      { table: 'subscribers', type: 'DELETE' },
    );
  },
};

export const settings = {
  async get() {
    return clone(load().settings);
  },
  async save(key, value) {
    return tx(
      (db) => {
        db.settings[key] = { ...(db.settings[key] || {}), ...value };
        return clone(db.settings);
      },
      { table: 'settings', type: 'UPDATE' },
    );
  },
};

export const emails = {
  async list() {
    return clone(load().emails);
  },
  async ping() {
    return { resend: false, push: false, from: 'demo outbox' };
  },
  /** Demo: nothing leaves the browser — the email lands in the outbox preview. */
  async send(action, params, actor) {
    return tx(
      (db) => {
        if (action === 'status' || action === 'custom') {
          const o = findOrder(db, params.order_id);
          if (!o?.customer_email) throw new Error('no_email');
          const tpl = action === 'status' ? `status_${o.status}` : 'custom';
          const p = action === 'status' ? { order: strip(o) } : { order: strip(o), subject: params.subject, message: params.message };
          outbox(db, tpl, o.customer_email, p, o.id);
          o.events.push(ev('email', { subject: renderEmail(tpl, p).subject, status: 'preview' }, actor));
          return { status: 'preview' };
        }
        if (action === 'campaign') {
          const content = { subject: params.subject, heading: params.heading, body: params.body, ctaLabel: params.cta_label, ctaUrl: params.cta_url, image: params.image };
          if (params.test) {
            outbox(db, 'campaign_test', actor || DEMO_OWNER.email, { ...content, lang: params.lang || 'ar' });
            return { status: 'preview', total: 1 };
          }
          const subs = db.subscribers.filter((s) => s.status === 'subscribed');
          subs.slice(0, 3).forEach((s) => outbox(db, 'campaign', s.email, { ...content, lang: s.lang, unsubscribeUrl: `${siteUrl()}/track.html?unsubscribe=${s.token}` }));
          return { status: 'preview', total: subs.length, sent: 0 };
        }
        throw new Error('unknown_action');
      },
      { table: 'email_log', type: 'INSERT' },
    );
  },
};

export function live(cb) {
  return onChange(cb);
}

/* ------------------------------------------------------------------ demo data */
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const demo = {
  hasData() {
    const db = load();
    return db.orders.length > 0 || db.subscribers.length > 0;
  },
  hasDemo() {
    return load().orders.some((o) => o.demo);
  },
  seed() {
    const r = rng(20261021);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const first = ['ريم', 'نورة', 'لمى', 'جود', 'فيصل', 'عبدالله', 'خالد', 'ناصر', 'يزن', 'ريان', 'لين', 'دانة', 'مشاري', 'تركي', 'هيا', 'غلا', 'بدر', 'سلطان', 'رهف', 'شهد'];
    const last = ['العتيبي', 'الشهري', 'القحطاني', 'الزهراني', 'الحربي', 'المطيري', 'الدوسري', 'العنزي', 'السبيعي', 'الشمري'];
    const cities = ['الرياض', 'جدة', 'جدة', 'الدمام', 'مكة', 'المدينة', 'الخبر', 'أبها', 'الطائف', 'تبوك', 'الرياض', 'بريدة'];
    const sources = ['web', 'web', 'web', 'web', 'instagram', 'instagram', 'tiktok', 'whatsapp'];
    const methods = ['cod', 'cod', 'transfer', 'mada', 'applepay', 'stcpay'];
    tx((db) => {
      const catalog = products(db).filter((p) => p.type !== 'custom');
      // Stock so the inventory screens have something to show.
      for (const p of catalog) {
        const sizes = p.sizes.length ? p.sizes : [ONE];
        db.products[p.id] = { ...(db.products[p.id] || {}), stock: Object.fromEntries(sizes.map((s) => [s, Math.floor(r() * (p.type === 'set' ? 9 : 15))])) };
      }
      db.products['sirwal-earth-black'] = { ...db.products['sirwal-earth-black'], out_of_stock: true };
      // Oldest first, so order numbers rise with time like real ones.
      const slots = Array.from({ length: 34 }, () => {
        const daysAgo = Math.floor(Math.pow(r(), 1.4) * 32);
        return { daysAgo, at: new Date(Date.now() - daysAgo * 86_400_000 - Math.floor(r() * 80_000_000)).toISOString() };
      }).sort((x, y) => x.at.localeCompare(y.at));
      for (const [i, { daysAgo, at }] of slots.entries()) {
        const nItems = r() < 0.7 ? 1 : 2;
        const its = Array.from({ length: nItems }, () => {
          const prod = pick(catalog);
          const size = prod.type === 'set' ? null : pick(['S', 'M', 'M', 'L', 'L', 'XL', 'XS', 'XXL']);
          const options =
            prod.type === 'set'
              ? [
                  { label: { ar: 'مقاس الهودي', en: 'Hoodie size' }, value: pick(['M', 'L', 'XL']) },
                  { label: { ar: 'مقاس الشروال', en: 'Sirwal size' }, value: pick(['S', 'M', 'L']) },
                ]
              : [{ label: { ar: 'المقاس', en: 'Size' }, value: size }];
          return { pid: prod.id, qty: r() < 0.85 ? 1 : 2, size, options };
        });
        const method = pick(methods);
        const name = `${pick(first)} ${pick(last)}`;
        const o = buildOrder(
          db,
          {
            customer_name: name,
            customer_phone: `05${Math.floor(10000000 + r() * 89999999)}`,
            customer_email: r() < 0.6 ? `demo${i + 1}@example.com` : null,
            city: pick(cities),
            district: pick(['النرجس', 'الروضة', 'الشاطئ', 'السلامة', 'العليا', 'الحمراء']),
            address: `شارع ${Math.floor(r() * 90) + 1}، مبنى ${Math.floor(r() * 30) + 1}`,
            source: pick(sources),
            payment_method: method,
            items: its,
          },
          { admin: true, actor: 'demo', at },
        );
        o.demo = true;
        // Older orders have moved further along the pipeline.
        const age = daysAgo / 30;
        const target = r() < 0.06 ? 'cancelled' : age > 0.45 ? 'delivered' : age > 0.25 ? pick(['shipped', 'delivered']) : age > 0.1 ? pick(['confirmed', 'preparing', 'shipped']) : pick(['new', 'new', 'confirmed']);
        const steps = target === 'cancelled' ? ['cancelled'] : FLOW.slice(1, FLOW.indexOf(target) + 1);
        let t = Date.parse(at);
        let prev = 'new';
        for (const s of steps) {
          t += (6 + r() * 30) * 3_600_000;
          o.events.push(ev('status', { from: prev, to: s }, 'demo', new Date(Math.min(t, Date.now())).toISOString()));
          prev = s;
        }
        o.status = target;
        if (['shipped', 'delivered'].includes(target)) Object.assign(o, { courier: pick(['SMSA', 'Aramex', 'SPL']), tracking_no: `${Math.floor(100000000 + r() * 899999999)}` });
        const paidNow = method !== 'cod' ? target !== 'cancelled' : target === 'delivered';
        if (paidNow) {
          const amt = r() < 0.12 && method === 'transfer' ? round2(o.total / 2) : o.total;
          o.payments.push({ id: uid(), amount: amt, method: method === 'cod' ? 'cash' : method, reference: null, note: null, paid_at: at });
          o.events.push(ev('payment', { amount: amt, method }, 'demo', at));
        }
        Object.assign(o, computeTotals(o));
        if (target === 'cancelled') adjustStock(db, o, 1);
      }
      db.orders.sort((a, b) => b.created_at.localeCompare(a.created_at));
      // The demo courier is out with the two newest shipped orders.
      db.couriers = db.couriers?.length ? db.couriers : blank().couriers;
      db.orders
        .filter((o) => o.status === 'shipped')
        .slice(0, 2)
        .forEach((o, i) => Object.assign(o, { courier: 'ZOOOT', tracking_no: null, courier_id: db.couriers[0].id, out_for_delivery_at: now(), delivery_eta: new Date(Date.now() + (25 + i * 20) * 60_000).toISOString() }));
      const domains = ['gmail.com', 'outlook.com', 'icloud.com', 'hotmail.com'];
      for (let i = 0; i < 46; i++) {
        db.subscribers.push({
          id: uid(),
          email: `fan${i + 1}@${pick(domains)}`.replace('@', `.demo@`),
          lang: r() < 0.8 ? 'ar' : 'en',
          source: r() < 0.85 ? 'footer' : 'checkout',
          status: r() < 0.94 ? 'subscribed' : 'unsubscribed',
          token: uid(),
          created_at: new Date(Date.now() - Math.floor(r() * 40) * 86_400_000).toISOString(),
          demo: true,
        });
      }
    }, { table: '*', type: 'SYNC' });
  },
  clear() {
    tx(
      (db) => {
        db.orders = db.orders.filter((o) => !o.demo);
        db.locations = {};
        db.subscribers = db.subscribers.filter((s) => !s.demo);
        for (const [id, ov] of Object.entries(db.products)) {
          if (ov.custom) continue;
          delete ov.stock;
          delete ov.out_of_stock;
          if (!Object.keys(ov).length) delete db.products[id];
        }
      },
      { table: '*', type: 'SYNC' },
    );
  },
  reset() {
    save(blank(), { table: '*', type: 'SYNC' });
  },
  export() {
    return load();
  },
  import(data) {
    if (!data || data.version !== 1) throw new Error('bad_file');
    save({ ...blank(), ...data }, { table: '*', type: 'SYNC' });
  },
};

/* ================================================================== couriers */
const COURIER_SESSION = 'zooot-courier-session';
const COURIER_THROTTLE = 'zooot-courier-throttle';
const DAY_MS = 86_400_000;

/** Owner side: the delivery team and where they are. */
export const couriers = {
  async list() {
    const db = load();
    return clone((db.couriers || []).map((c) => ({ ...c, location: (db.locations || {})[c.id] || null })));
  },
  async save(id, patch) {
    return tx(
      (db) => {
        const c = db.couriers.find((x) => x.id === id);
        if (!c) throw new Error('not_found');
        for (const k of ['name', 'phone', 'active']) if (k in patch) c[k] = patch[k];
        return clone(c);
      },
      { table: 'couriers', type: 'UPDATE' },
    );
  },
  /** Demo: only the demo courier has a password, extra couriers are for assignment practice. */
  async add({ email, name, phone }) {
    return tx(
      (db) => {
        const clean = String(email || '').trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new Error('invalid_email');
        const existing = db.couriers.find((x) => x.email === clean);
        if (existing) return clone(Object.assign(existing, { name: name || existing.name, phone: phone || existing.phone, active: true }));
        const c = { id: uid(), email: clean, name: name || clean.split('@')[0], phone: phone || null, active: true, created_at: now() };
        db.couriers.push(c);
        return clone(c);
      },
      { table: 'couriers', type: 'INSERT' },
    );
  },
};

const courierView = (o, me) => ({
  id: o.id,
  order_no: o.order_no,
  status: o.status,
  created_at: o.created_at,
  customer_name: o.customer_name,
  customer_phone: o.customer_phone,
  city: o.city,
  district: o.district,
  address: o.address,
  customer_note: o.customer_note,
  lang: o.lang,
  payment_method: o.payment_method,
  payment_status: o.payment_status,
  total: o.total,
  balance: balanceOf(o),
  courier_id: o.courier_id || null,
  mine: o.courier_id === me,
  delivery_eta: o.delivery_eta || null,
  delivery_location: o.delivery_location || null,
  out_for_delivery_at: o.out_for_delivery_at || null,
  delivered_at: o.delivered_at || null,
  items: o.items.map(({ name, qty, image, options }) => ({ name, qty, image, options })),
});

const courierCanSee = (o, me) =>
  (o.courier_id === me && (['confirmed', 'preparing', 'shipped'].includes(o.status) || (o.status === 'delivered' && Date.now() - Date.parse(o.delivered_at || 0) < DAY_MS))) ||
  (!o.courier_id && ['confirmed', 'preparing'].includes(o.status) && ['', 'ZOOOT'].includes(o.courier || ''));

function courierSession() {
  const s = readJSON(COURIER_SESSION);
  if (!s || s.exp < Date.now()) return null;
  const c = (load().couriers || []).find((x) => x.id === s.id && x.active);
  return c ? { id: c.id, email: c.email, name: c.name, phone: c.phone } : null;
}
function requireCourier() {
  const me = courierSession();
  if (!me) throw new Error('not_courier');
  return me;
}

/** The delivery app's backend (demo). Mirrors the courier_* RPCs in Supabase. */
export const courierApp = {
  mode: 'demo',
  auth: {
    async signIn(email, password, { remember = true } = {}) {
      const th = readJSON(COURIER_THROTTLE) || { fails: 0, until: 0 };
      if (th.until > Date.now()) throw Object.assign(new Error('too_many_attempts'), { retryIn: Math.ceil((th.until - Date.now()) / 1000) });
      const cred = DEMO_COURIERS.find((c) => c.email === String(email).trim().toLowerCase());
      const ok = cred && (await pbkdf2(String(password), cred.salt, cred.iterations)) === cred.hash;
      const c = ok && (load().couriers || []).find((x) => x.id === cred.id && x.active);
      if (!c) {
        th.fails += 1;
        if (th.fails >= 5) Object.assign(th, { fails: 0, until: Date.now() + 60_000 });
        localStorage.setItem(COURIER_THROTTLE, JSON.stringify(th));
        throw new Error('invalid_credentials');
      }
      localStorage.removeItem(COURIER_THROTTLE);
      localStorage.setItem(COURIER_SESSION, JSON.stringify({ id: c.id, exp: Date.now() + (remember ? 30 : 1) * DAY_MS }));
      return courierSession();
    },
    async signOut() {
      localStorage.removeItem(COURIER_SESSION);
    },
    async session() {
      return courierSession();
    },
  },
  async me(patch = {}) {
    const me = requireCourier();
    return tx(
      (db) => {
        const c = db.couriers.find((x) => x.id === me.id);
        if (patch.name?.trim()) c.name = patch.name.trim();
        if (patch.phone?.trim()) c.phone = patch.phone.trim();
        return { id: c.id, email: c.email, name: c.name, phone: c.phone };
      },
      { table: 'couriers', type: 'UPDATE' },
    );
  },
  async orders() {
    const me = requireCourier();
    return load()
      .orders.filter((o) => courierCanSee(o, me.id))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((o) => courierView(o, me.id));
  },
  async act(orderId, action, { eta = null, text = null, collected = null } = {}) {
    const me = requireCourier();
    return tx(
      (db) => {
        const o = findOrder(db, orderId);
        if (!o) throw new Error('not_found');
        const free = !o.courier_id && ['claim', 'start'].includes(action) && ['confirmed', 'preparing', 'shipped'].includes(o.status);
        if (o.courier_id !== me.id && !free) throw new Error('not_your_order');
        const actor = me.email;
        if (action === 'claim') patchOrder(db, o, { courier_id: me.id, courier: o.courier || 'ZOOOT' }, actor);
        else if (action === 'start') {
          if (!['confirmed', 'preparing', 'shipped'].includes(o.status)) throw new Error(`bad_status:${o.status}`);
          patchOrder(db, o, { courier_id: me.id, courier: o.courier || 'ZOOOT', status: 'shipped', delivery_eta: eta || o.delivery_eta || new Date(Date.now() + 45 * 60_000).toISOString() }, actor);
        } else if (action === 'eta') patchOrder(db, o, { delivery_eta: eta }, actor);
        else if (action === 'location') patchOrder(db, o, { delivery_location: String(text || '').trim().slice(0, 500) || null }, actor);
        else if (action === 'delivered') {
          if (o.status !== 'shipped') throw new Error(`bad_status:${o.status}`);
          const cash = Math.min(Number(collected) || 0, balanceOf(o));
          if (cash > 0) {
            o.payments.push({ id: uid(), amount: round2(cash), method: 'cash', reference: null, note: 'collected by courier', paid_at: now() });
            o.events.push(ev('payment', { amount: round2(cash), method: 'cash' }, actor));
          }
          patchOrder(db, o, { status: 'delivered' }, actor);
        } else if (action === 'release') {
          if (o.status === 'delivered') throw new Error(`bad_status:${o.status}`);
          patchOrder(db, o, { courier_id: null, delivery_eta: null }, actor);
        } else if (action === 'note') o.events.push(ev('note', { text: String(text || '').slice(0, 2000) }, actor));
        else throw new Error('unknown_action');
        return courierView(o, me.id);
      },
      (v) => ({ table: 'orders', type: 'UPDATE', record: { id: v.id } }),
    );
  },
  async ping({ lat, lng, accuracy = null, heading = null, speed = null }) {
    const me = requireCourier();
    tx(
      (db) => {
        db.locations ||= {};
        db.locations[me.id] = { lat, lng, accuracy, heading, speed, updated_at: now() };
      },
      { table: 'courier_locations', type: 'UPDATE' },
    );
  },
  live(cb) {
    return onChange(cb);
  },
};
