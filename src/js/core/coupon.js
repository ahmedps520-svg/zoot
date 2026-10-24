/**
 * The discount code a shopper carries around the store: set by the Ramadan envelope page or
 * typed at checkout. Only the code is kept here — the server prices it on every order.
 */
import { formatPrice, getLang } from './i18n.js';
import { couponDiscount } from '../backend/model.js';

const KEY = 'zooot-coupon';

export function savedCoupon() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    return c?.code ? c : null;
  } catch {
    return null;
  }
}

export function saveCoupon(c) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code: c.code, kind: c.kind, value: Number(c.value), min_subtotal: Number(c.min_subtotal) || 0 }));
  } catch {
    /* private mode — the shopper can still type it */
  }
  window.dispatchEvent(new CustomEvent('coupon:change'));
}

export function clearCoupon() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('coupon:change'));
}

export { couponDiscount };

/** "30% off" / "خصم ٣٠٪" */
export const couponLabel = (c) => {
  const v = c.kind === 'percent' ? `${Number(c.value)}%` : formatPrice(c.value);
  return getLang() === 'en' ? `${v} off` : `خصم ${v}`;
};

/** Why a code was refused, in the shopper's language (codes come from coupon_validate). */
export function couponMessage(err) {
  const en = getLang() === 'en';
  const msg = String(err?.message || err || '');
  if (msg.startsWith('coupon_min:')) {
    const min = formatPrice(Number(msg.split(':')[1]) || 0);
    return en ? `This code works on orders of ${min} or more.` : `الكود يشتغل على الطلبات من ${min} وفوق.`;
  }
  const M = {
    coupon_invalid: ['الكود غير صحيح — تأكد منه.', 'That code isn’t valid — check it.'],
    coupon_not_started: ['الكود ما بدأ للحين.', 'This code isn’t active yet.'],
    coupon_expired: ['انتهت صلاحية الكود.', 'This code has expired.'],
    coupon_used_up: ['خلصت مرات استخدام هالكود.', 'This code has been fully used.'],
    coupon_already_used: ['استخدمت هالكود قبل برقم جوالك.', 'You’ve already used this code with this mobile.'],
  };
  const key = Object.keys(M).find((k) => msg === k);
  return key ? M[key][en ? 1 : 0] : null;
}
