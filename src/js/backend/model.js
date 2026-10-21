/**
 * Shared order / payment model — used by the storefront, the owner dashboard,
 * the demo backend and (mirrored in SQL) the Supabase schema.
 */
export const ORDER_STATUSES = [
  { id: 'new', ar: 'جديد', en: 'New', color: '#E5197F' },
  { id: 'confirmed', ar: 'مؤكد', en: 'Confirmed', color: '#1F4BFF' },
  { id: 'preparing', ar: 'قيد التجهيز', en: 'Preparing', color: '#F26B21' },
  { id: 'shipped', ar: 'تم الشحن', en: 'Shipped', color: '#4B1E8C' },
  { id: 'delivered', ar: 'تم التسليم', en: 'Delivered', color: '#1E9E5A' },
  { id: 'cancelled', ar: 'ملغي', en: 'Cancelled', color: '#8A8A8A' },
];
/** The happy path, in order — used for steppers and "next step" buttons. */
export const FLOW = ['new', 'confirmed', 'preparing', 'shipped', 'delivered'];

export const PAYMENT_STATUSES = [
  { id: 'unpaid', ar: 'غير مدفوع', en: 'Unpaid', color: '#E5197F' },
  { id: 'partial', ar: 'مدفوع جزئيًا', en: 'Partially paid', color: '#F26B21' },
  { id: 'paid', ar: 'مدفوع', en: 'Paid', color: '#1E9E5A' },
  { id: 'refunded', ar: 'مسترجع', en: 'Refunded', color: '#8A8A8A' },
];

export const PAYMENT_METHODS = [
  { id: 'cod', ar: 'الدفع عند الاستلام', en: 'Cash on delivery' },
  { id: 'transfer', ar: 'تحويل بنكي', en: 'Bank transfer' },
  { id: 'mada', ar: 'مدى', en: 'mada' },
  { id: 'card', ar: 'بطاقة ائتمانية', en: 'Credit card' },
  { id: 'applepay', ar: 'Apple Pay', en: 'Apple Pay' },
  { id: 'stcpay', ar: 'STC Pay', en: 'STC Pay' },
  { id: 'cash', ar: 'نقدًا', en: 'Cash' },
  { id: 'refund', ar: 'استرجاع', en: 'Refund' },
];

export const SOURCES = [
  { id: 'web', ar: 'المتجر', en: 'Website' },
  { id: 'instagram', ar: 'إنستقرام', en: 'Instagram' },
  { id: 'tiktok', ar: 'تيك توك', en: 'TikTok' },
  { id: 'whatsapp', ar: 'واتساب', en: 'WhatsApp' },
  { id: 'popup', ar: 'بوب أب / معرض', en: 'Pop-up / event' },
  { id: 'manual', ar: 'يدوي', en: 'Manual' },
];

/** 'ZOOOT' = our own delivery couriers (the courier app); the rest are shipping companies. */
export const COURIERS = ['ZOOOT', 'SMSA', 'Aramex', 'SPL', 'J&T', 'DHL', 'Naqel', 'Redbox', 'Other'];

export const byIdIn = (list, id) => list.find((x) => x.id === id);

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Recompute money fields exactly like the SQL triggers do. */
export function computeTotals(order) {
  const subtotal = round2((order.items || []).reduce((s, it) => s + Number(it.unit_price) * Number(it.qty), 0));
  const discount = round2(Math.max(0, Number(order.discount) || 0));
  const shipping = round2(Math.max(0, Number(order.shipping) || 0));
  const total = round2(Math.max(0, subtotal - discount + shipping));
  const paid = round2((order.payments || []).reduce((s, p) => s + Number(p.amount), 0));
  const hadRefund = (order.payments || []).some((p) => Number(p.amount) < 0);
  let payment_status = 'unpaid';
  if (total > 0 && paid >= total) payment_status = 'paid';
  else if (paid > 0) payment_status = 'partial';
  else if (hadRefund) payment_status = 'refunded';
  return { ...order, subtotal, discount, shipping, total, paid_amount: paid, payment_status };
}

export const balanceOf = (o) => round2(Math.max(0, (o.total || 0) - (o.paid_amount || 0)));

/** Normalise a Saudi/international phone to its last 9 digits for matching. */
export const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-9);

/** wa.me needs international digits; assume Saudi (966) for local 05… numbers. */
export function waNumber(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('05')) d = '966' + d.slice(1);
  else if (d.length === 9 && d.startsWith('5')) d = '966' + d;
  return d;
}

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
/** Stock key for one-size products (sets, accessories). */
export const ONE = 'ONE';
