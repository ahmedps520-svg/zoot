/**
 * Cart state, persisted in localStorage. Lines are keyed by product id +
 * options so the same hoodie in two sizes is two lines.
 * Line: { key, pid, name:{ar,en}, img, price, qty, options:[{label:{ar,en}, value:{ar,en}|string, swatch?}], meta? }
 */
const KEY = 'zooot-cart-v1';

const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

let lines = read();

const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable — cart lives for this page view only */
  }
  window.dispatchEvent(new CustomEvent('cart:change', { detail: { lines } }));
};

const keyOf = (pid, options = [], meta) =>
  pid + '|' + options.map((o) => (typeof o.value === 'object' ? o.value.en : o.value)).join('|') + (meta ? '|' + JSON.stringify(meta) : '');

export const cart = {
  get lines() {
    return lines;
  },
  count: () => lines.reduce((n, l) => n + l.qty, 0),
  subtotal: () => lines.reduce((n, l) => n + l.qty * l.price, 0),
  add(item) {
    const key = keyOf(item.pid, item.options, item.meta);
    const found = lines.find((l) => l.key === key);
    if (found) found.qty = Math.min(found.qty + (item.qty || 1), 10);
    else lines.push({ ...item, key, qty: item.qty || 1 });
    persist();
    return key;
  },
  setQty(key, qty) {
    const l = lines.find((x) => x.key === key);
    if (!l) return;
    if (qty <= 0) lines = lines.filter((x) => x.key !== key);
    else l.qty = Math.min(qty, 10);
    persist();
  },
  remove(key) {
    lines = lines.filter((x) => x.key !== key);
    persist();
  },
  clear() {
    lines = [];
    persist();
  },
};

// Keep tabs in sync.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    lines = read();
    window.dispatchEvent(new CustomEvent('cart:change', { detail: { lines } }));
  }
});
