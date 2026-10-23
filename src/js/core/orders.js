/**
 * Orders remembered on this device (order number + the mobile used at checkout), so the
 * tracking page never asks twice. Nothing else is stored; the order itself is always
 * fetched through track_order, which checks the pair.
 */
const KEY = 'zooot-orders';
const LEGACY = 'zooot-last-order';
const MAX = 20;
const norm = (no) => String(no || '').trim().toUpperCase();

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    const legacy = JSON.parse(localStorage.getItem(LEGACY) || 'null');
    if (legacy?.order_no && !list.some((o) => norm(o.order_no) === norm(legacy.order_no))) list.push(legacy);
    return Array.isArray(list) ? list.filter((o) => o?.order_no && o?.phone) : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    localStorage.removeItem(LEGACY);
  } catch {
    /* private mode — the page just asks again next time */
  }
}

/** Newest first. */
export const savedOrders = () => read().sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));

export const phoneFor = (orderNo) => read().find((o) => norm(o.order_no) === norm(orderNo))?.phone || '';

export function rememberOrder(orderNo, phone, at) {
  const list = read().filter((o) => norm(o.order_no) !== norm(orderNo));
  list.unshift({ order_no: norm(orderNo), phone: String(phone).trim(), at: at || new Date().toISOString() });
  write(list);
}

export function forgetOrder(orderNo) {
  write(read().filter((o) => norm(o.order_no) !== norm(orderNo)));
}

export function forgetAll() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY);
  } catch {
    /* ignore */
  }
}
