/**
 * Arabic is the source language and lives in the HTML. English sits next to it
 * in `data-en` (innerHTML) and `data-en-<attr>` (attributes), so copy and its
 * translation are edited in one place. JS-only strings live in UI below.
 */
const KEY = 'zooot-lang';
const ATTRS = ['placeholder', 'aria-label', 'alt', 'title', 'content', 'value'];
const SELECTOR = ['[data-en]', ...ATTRS.map((a) => `[data-en-${a}]`)].join(',');
const original = new WeakMap();

const stored = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

let lang = stored() === 'en' ? 'en' : 'ar';

export const UI = {
  addToBag: { ar: 'أضف للسلة', en: 'Add to bag' },
  added: { ar: 'انضاف للسلة', en: 'Added to your bag' },
  viewBag: { ar: 'شوف السلة', en: 'View bag' },
  size: { ar: 'المقاس', en: 'Size' },
  hoodieSize: { ar: 'مقاس الهودي', en: 'Hoodie size' },
  sirwalSize: { ar: 'مقاس الشروال', en: 'Sirwal size' },
  statement: { ar: 'العبارة', en: 'Statement' },
  look: { ar: 'الإطلالة', en: 'Look' },
  hoodieColor: { ar: 'لون الهودي', en: 'Hoodie colour' },
  fabric: { ar: 'القماش', en: 'Fabric' },
  backLogo: { ar: 'لون «زوووط»', en: '«ZOOOT» colourway' },
  original: { ar: 'العبارة الأصلية', en: 'Original phrase' },
  pickSize: { ar: 'اختر المقاس أول', en: 'Pick a size first' },
  pickSizes: { ar: 'اختر مقاس الهودي والشروال', en: 'Pick both sizes' },
  emptyBag: { ar: 'سلتك فاضية… للحين.', en: 'Your bag is empty… for now.' },
  remove: { ar: 'إزالة', en: 'Remove' },
  qty: { ar: 'الكمية', en: 'Quantity' },
  custom: { ar: 'تصميمك الخاص', en: 'Your custom build' },
  customSet: { ar: 'طقم زوووط مخصّص', en: 'Custom ZOOOT set' },
  copied: { ar: 'انسخ الرابط ✓', en: 'Link copied ✓' },
  copiedHex: { ar: 'تم النسخ', en: 'Copied' },
  invalid: { ar: 'تأكد من الحقول المطلوبة', en: 'Please check the required fields' },
  emailInvalid: { ar: 'اكتب بريد صحيح', en: 'Enter a valid email' },
  joined: { ar: 'أنت الحين من الزوووطة ✦', en: "You're on the ZOOOT list ✦" },
  sending: { ar: 'جاري الإرسال…', en: 'Sending…' },
  all: { ar: 'الكل', en: 'All' },
  results: { ar: 'قطعة', en: 'pieces' },
  from: { ar: 'من', en: 'from' },
  shopLook: { ar: 'تسوّق الإطلالة', en: 'Shop the look' },
  quickAdd: { ar: 'إضافة سريعة', en: 'Quick add' },
  orderNo: { ar: 'رقم الطلب', en: 'Order N°' },
  random: { ar: 'زوووطني!', en: 'ZOOOT me!' },
  typeSet: { ar: 'طقم', en: 'Set' },
  typeHoodie: { ar: 'هودي', en: 'Hoodie' },
  typeSirwal: { ar: 'شروال', en: 'Sirwal' },
};

export const getLang = () => lang;
export const isRTL = () => lang === 'ar';
/** Pick the current-language value from {ar, en}, or pass strings through. */
export const t = (v) => (v && typeof v === 'object' ? (v[lang] ?? v.ar) : v ?? '');
export const ui = (key) => t(UI[key]) || key;

export function applyLang(root = document) {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  root.querySelectorAll(SELECTOR).forEach((el) => {
    if (!original.has(el)) {
      const snap = { html: el.hasAttribute('data-en') ? el.innerHTML : null };
      ATTRS.forEach((a) => {
        if (el.hasAttribute(`data-en-${a}`)) snap[a] = el.getAttribute(a);
      });
      original.set(el, snap);
    }
    const snap = original.get(el);
    if (snap.html !== null) el.innerHTML = lang === 'en' ? el.dataset.en : snap.html;
    ATTRS.forEach((a) => {
      if (a in snap) el.setAttribute(a, lang === 'en' ? el.getAttribute(`data-en-${a}`) : snap[a] ?? '');
    });
  });
  const body = document.body;
  if (!body.dataset.titleAr) body.dataset.titleAr = document.title;
  document.title = lang === 'en' && body.dataset.titleEn ? body.dataset.titleEn : body.dataset.titleAr;
}

export function setLang(next) {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* private mode — language just won't persist */
  }
  applyLang();
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

export const formatPrice = (n) => {
  const num = Number(n).toLocaleString('en-US');
  return lang === 'en' ? `SAR ${num}` : `${num} ر.س`;
};
