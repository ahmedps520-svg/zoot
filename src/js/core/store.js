/**
 * Live catalogue: prices, "sold out", hidden products and per-size stock come from
 * the owner dashboard. The last known state is cached so pages render with the
 * right prices immediately; a fresh copy is fetched on every page view and any
 * change is patched into the page (and the bag) without a reload.
 */
import { CONFIG, PRODUCTS } from '../data.js';
import { publicApi } from '../backend/public.js';
import { cart } from './cart.js';

const CACHE = 'zooot-catalog-v1';
export const storeSettings = { shipping_fee: 0, free_shipping_over: 0, payment_methods: ['cod', 'transfer'], bank_details: '', whatsapp: '' };

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE) || 'null');
  } catch {
    return null;
  }
};

function apply(snapshot) {
  if (!snapshot?.rows?.length) return false;
  let changed = false;
  const set = (p, k, v) => {
    if (JSON.stringify(p[k]) !== JSON.stringify(v)) {
      p[k] = v;
      changed = true;
    }
  };
  for (const p of PRODUCTS) {
    const row = snapshot.rows.find((r) => r.id === p.id);
    set(p, 'hidden', !row);
    if (!row) continue;
    set(p, 'price', Number(row.price));
    set(p, 'compareAt', row.compare_at_price ? Number(row.compare_at_price) : null);
    set(p, 'soldOut', Boolean(row.out_of_stock) || (row.stock ? Object.values(row.stock).every((v) => Number(v) <= 0) : false));
    set(p, 'stock', row.stock || null);
  }
  const custom = snapshot.rows.find((r) => r.id === 'custom-set');
  if (custom && CONFIG.prices.set !== Number(custom.price)) {
    CONFIG.prices.set = Number(custom.price);
    changed = true;
  }
  CONFIG.customSoldOut = custom ? Boolean(custom.out_of_stock) : false;
  Object.assign(storeSettings, snapshot.settings || {});
  if (storeSettings.whatsapp) CONFIG.whatsapp = storeSettings.whatsapp;
  for (const k of ['instagram', 'tiktok']) if (storeSettings[k]) CONFIG.socials[k] = storeSettings[k];
  return changed;
}

// Synchronously, before any page renders.
apply(readCache());

/** Is this product (or one size of it) unavailable? */
export function soldOut(p, size) {
  if (!p || p.hidden || p.soldOut) return true;
  if (size && p.stock && size in p.stock) return Number(p.stock[size]) <= 0;
  return false;
}

/** Bring prices in the bag in line with the live catalogue. */
function repriceCart() {
  let touched = false;
  for (const l of cart.lines) {
    const price = l.pid === 'custom-set' ? CONFIG.prices.set : PRODUCTS.find((p) => p.id === l.pid)?.price;
    if (price != null && l.price !== price) {
      l.price = price;
      touched = true;
    }
  }
  if (touched) cart.setQty(cart.lines[0].key, cart.lines[0].qty); // persist + notify
}

let syncing = null;
export function syncCatalog(force = false) {
  if (force) syncing = null;
  syncing ||= (async () => {
    try {
      const api = await publicApi();
      const [rows, settings] = await Promise.all([api.catalog(), api.publicSettings().catch(() => ({}))]);
      const snapshot = { rows: rows.map(({ id, price, compare_at_price, out_of_stock, stock }) => ({ id, price, compare_at_price, out_of_stock, stock })), settings, at: Date.now() };
      const changed = apply(snapshot);
      try {
        localStorage.setItem(CACHE, JSON.stringify(snapshot));
      } catch {
        /* ignore */
      }
      repriceCart();
      if (changed) window.dispatchEvent(new CustomEvent('catalog:change'));
      return snapshot;
    } catch (e) {
      console.warn('catalogue sync failed — showing cached prices', e);
      return null;
    }
  })();
  return syncing;
}

// Demo mode: the dashboard in another tab changes stock/prices → follow along live.
publicApi().then((api) =>
  api.onChange?.((c) => {
    if (c.table === 'products' || c.table === 'settings' || c.table === '*') {
      syncCatalog(true);
    }
  }),
);
