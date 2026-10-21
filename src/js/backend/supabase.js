/**
 * Supabase backend — shared, live data protected by owner logins + Row Level Security.
 * Same API surface as ./local.js.
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './config.js';
import { SIZES } from './model.js';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'zooot-owner-auth' },
});

export const mode = 'supabase';
export const client = sb;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER = '*, items:order_items(*), payments(*)';

function fail(error) {
  if (!error) return;
  const msg = error.message || String(error);
  throw Object.assign(new Error(msg), { cause: error });
}

/** Call an edge function; returns null when it isn't deployed so callers can fall back. */
async function invoke(name, body) {
  const { data, error } = await sb.functions.invoke(name, { body });
  if (!error) return data;
  if (error.name === 'FunctionsHttpError') {
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(detail?.error || error.message);
  }
  return null; // FunctionsFetchError / FunctionsRelayError → not deployed or offline
}

/* ================================================================== public API */
export async function catalog() {
  const { data, error } = await sb.from('products').select('*').eq('active', true).order('sort');
  fail(error);
  return data;
}

export async function publicSettings() {
  const { data } = await sb.from('settings').select('value').eq('key', 'public').maybeSingle();
  return data?.value || {};
}

export async function placeOrder(payload) {
  const viaFunction = await invoke('place-order', payload);
  if (viaFunction) return viaFunction;
  const { data, error } = await sb.rpc('create_order', { p: payload });
  fail(error);
  return data;
}

export async function subscribe({ email, lang = 'ar', source = 'footer' }) {
  const viaFunction = await invoke('subscribe', { email, lang, source });
  if (viaFunction) return viaFunction;
  const { data, error } = await sb.rpc('subscribe', { p_email: email, p_lang: lang, p_source: source });
  fail(error);
  return data;
}

export async function trackOrder(orderNo, phone) {
  const { data, error } = await sb.rpc('track_order', { p_order_no: orderNo, p_phone: phone });
  fail(error);
  return data;
}

export async function unsubscribe(token) {
  const { data, error } = await sb.rpc('unsubscribe', { p_token: token });
  fail(error);
  return data;
}

export function onChange() {
  return () => {};
}

/* ================================================================== owner API */
let adminChecked = null;

export const auth = {
  async signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email: String(email).trim(), password });
    if (error) throw new Error(error.status === 400 ? 'invalid_credentials' : error.message);
    const { data: isAdmin } = await sb.rpc('is_admin');
    if (!isAdmin) {
      await sb.auth.signOut();
      throw new Error('not_owner');
    }
    adminChecked = data.user.id;
    return { email: data.user.email };
  },
  async signOut() {
    adminChecked = null;
    await sb.auth.signOut();
  },
  async session() {
    const { data } = await sb.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    if (adminChecked !== user.id) {
      const { data: isAdmin } = await sb.rpc('is_admin');
      if (!isAdmin) return null;
      adminChecked = user.id;
    }
    return { email: user.email };
  },
  async changePassword(password) {
    const { error } = await sb.auth.updateUser({ password });
    fail(error);
  },
};

const sortEvents = (o) => {
  if (o?.events) o.events.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return o;
};

export const orders = {
  async list() {
    const { data, error } = await sb.from('orders').select(ORDER).order('created_at', { ascending: false }).limit(2000);
    fail(error);
    return data;
  },
  async get(idOrNo) {
    const q = sb.from('orders').select(`${ORDER}, events:order_events(*)`);
    const { data, error } = await (UUID.test(idOrNo) ? q.eq('id', idOrNo) : q.eq('order_no', idOrNo)).maybeSingle();
    fail(error);
    return sortEvents(data);
  },
  async create(payload) {
    const { data, error } = await sb.rpc('create_order', { p: payload });
    fail(error);
    return orders.get(data.id);
  },
  async update(id, patch) {
    const allowed = ['status', 'payment_method', 'source', 'customer_name', 'customer_phone', 'customer_email', 'city', 'district', 'address', 'customer_note', 'internal_note', 'lang', 'discount', 'shipping', 'courier', 'tracking_no'];
    const row = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)).map(([k, v]) => [k, v === '' ? null : v]));
    const { error } = await sb.from('orders').update(row).eq('id', id);
    fail(error);
    return orders.get(id);
  },
  async remove(id) {
    const { error } = await sb.from('orders').delete().eq('id', id);
    fail(error);
  },
  async addNote(id, text, actor) {
    const { error } = await sb.from('order_events').insert({ order_id: id, type: 'note', data: { text: String(text).slice(0, 2000) }, actor });
    fail(error);
    return orders.get(id);
  },
};

export const items = {
  async update(orderId, itemId, patch) {
    const row = {};
    if ('unit_price' in patch) row.unit_price = Math.max(0, Number(patch.unit_price));
    if ('qty' in patch) row.qty = Math.max(1, Math.min(99, Number(patch.qty) || 1));
    const { error } = await sb.from('order_items').update(row).eq('id', itemId);
    fail(error);
    return orders.get(orderId);
  },
  async add(orderId, item) {
    const { data: prod } = await sb.from('products').select('*').eq('id', item.pid).maybeSingle();
    const { error } = await sb.from('order_items').insert({
      order_id: orderId,
      product_id: prod?.id || null,
      name: item.name || prod?.name || { ar: 'قطعة', en: 'Item' },
      image: item.image || prod?.images?.[0] || null,
      options: item.options || [],
      size: item.size || null,
      unit_price: Math.max(0, Number(item.unit_price ?? prod?.price ?? 0)),
      qty: Math.max(1, Number(item.qty) || 1),
    });
    fail(error);
    return orders.get(orderId);
  },
  async remove(orderId, itemId) {
    const { error } = await sb.from('order_items').delete().eq('id', itemId);
    fail(error);
    return orders.get(orderId);
  },
};

export const payments = {
  async add(orderId, p) {
    const { error } = await sb.from('payments').insert({
      order_id: orderId,
      amount: Number(p.amount),
      method: p.method || 'cash',
      reference: p.reference || null,
      note: p.note || null,
      paid_at: p.paid_at || new Date().toISOString(),
    });
    fail(error);
    return orders.get(orderId);
  },
  async remove(orderId, paymentId) {
    const { error } = await sb.from('payments').delete().eq('id', paymentId);
    fail(error);
    return orders.get(orderId);
  },
};

export const productsApi = {
  async list() {
    const { data, error } = await sb.from('products').select('*').order('sort');
    fail(error);
    return data.map((p) => ({ ...p, builtin: p.type !== 'extra' }));
  },
  async save(id, patch) {
    const allowed = ['price', 'compare_at_price', 'stock', 'out_of_stock', 'active', 'name', 'sub', 'description', 'images', 'sizes', 'sort', 'type', 'swatches'];
    const row = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
    const { data, error } = await sb.from('products').update(row).eq('id', id).select().single();
    fail(error);
    return data;
  },
  async create(data) {
    const id = data.id || `p-${Date.now().toString(36)}`;
    const { data: row, error } = await sb
      .from('products')
      .insert({ sizes: [], images: [], swatches: [], type: 'extra', sort: 500, ...data, id })
      .select()
      .single();
    fail(error);
    return row;
  },
  async remove(id) {
    const { error } = await sb.from('products').delete().eq('id', id).eq('type', 'extra');
    fail(error);
  },
  async uploadImage(file) {
    const path = `${Date.now().toString(36)}-${file.name.replace(/[^a-z0-9.]+/gi, '-').toLowerCase()}`;
    const { error } = await sb.storage.from('products').upload(path, file, { cacheControl: '31536000', upsert: false });
    fail(error);
    return sb.storage.from('products').getPublicUrl(path).data.publicUrl;
  },
};

export const subscribers = {
  async list() {
    const { data, error } = await sb.from('subscribers').select('*').order('created_at', { ascending: false });
    fail(error);
    return data;
  },
  /** Goes through the subscribe function when deployed, so the welcome email is sent too. */
  async add(email, lang = 'ar') {
    return subscribe({ email, lang, source: 'manual' });
  },
  async remove(id) {
    const { error } = await sb.from('subscribers').delete().eq('id', id);
    fail(error);
  },
};

export const settings = {
  async get() {
    const { data, error } = await sb.from('settings').select('key, value');
    fail(error);
    const out = { public: {}, notifications: {} };
    for (const r of data) out[r.key] = r.value || {};
    return out;
  },
  async save(key, value) {
    const current = (await settings.get())[key] || {};
    const { error } = await sb.from('settings').upsert({ key, value: { ...current, ...value }, updated_at: new Date().toISOString() });
    fail(error);
    return settings.get();
  },
};

export const emails = {
  async list() {
    const { data, error } = await sb.from('email_log').select('*').order('created_at', { ascending: false }).limit(150);
    fail(error);
    return data;
  },
  async ping() {
    try {
      return (await invoke('admin-email', { action: 'ping' })) || { resend: false, push: false, from: null, missing: true };
    } catch {
      return { resend: false, push: false, from: null, missing: true };
    }
  },
  async send(action, params) {
    const data = await invoke('admin-email', { action, ...params });
    if (!data) throw new Error('function_missing');
    return data;
  },
};

/** Realtime: owners get every order, payment and stock change as it happens. */
export function live(cb) {
  const ch = sb.channel('owner-live');
  for (const table of ['orders', 'order_items', 'payments', 'order_events', 'products']) {
    ch.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) =>
      cb({ table, type: payload.eventType, record: payload.new && Object.keys(payload.new).length ? payload.new : payload.old }),
    );
  }
  ch.subscribe();
  return () => sb.removeChannel(ch);
}

export const push = {
  async save(sub) {
    const json = sub.toJSON();
    const { error } = await sb.from('push_subscriptions').upsert({ endpoint: json.endpoint, keys: json.keys });
    fail(error);
  },
};

export const demo = {
  hasData: () => true,
  hasDemo: () => false,
  seed() {},
  clear() {},
  reset() {},
  export: () => null,
  import() {
    throw new Error('not_in_live_mode');
  },
};

export const ALL_SIZES = SIZES;
