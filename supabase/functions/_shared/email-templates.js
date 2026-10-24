/**
 * ZOOOT transactional + marketing emails.
 * Plain ESM with no dependencies: imported by the Supabase Edge Functions (Deno)
 * to send through Resend, and by the owner dashboard (browser) for live previews.
 *
 * Every template returns { subject, html, text } and is fully bilingual (ar · RTL / en · LTR).
 * Layout is table-based with inline styles so it survives Gmail, Apple Mail and Outlook.
 */

const C = { ink: '#0D0D0D', cream: '#F2EBDF', paper: '#FBF8F2', yellow: '#FFD21F', blue: '#1F4BFF', magenta: '#E5197F', muted: '#6E665B' };
const FONT_AR = "'IBM Plex Sans Arabic', Tahoma, 'Segoe UI', Arial, sans-serif";
const FONT_EN = "'IBM Plex Sans Arabic', 'Helvetica Neue', Arial, sans-serif";
const FONT_LATIN_BLACK = "'Archivo Black', 'Arial Black', Arial, sans-serif";

export const STATUS_LABELS = {
  new: { ar: 'جديد', en: 'New' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed' },
  preparing: { ar: 'قيد التجهيز', en: 'Preparing' },
  shipped: { ar: 'تم الشحن', en: 'Shipped' },
  delivered: { ar: 'تم التسليم', en: 'Delivered' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};
const FLOW = ['new', 'confirmed', 'preparing', 'shipped', 'delivered'];
const METHODS = {
  cod: { ar: 'الدفع عند الاستلام', en: 'Cash on delivery' },
  transfer: { ar: 'تحويل بنكي', en: 'Bank transfer' },
  mada: { ar: 'مدى', en: 'mada' },
  card: { ar: 'بطاقة ائتمانية', en: 'Credit card' },
  applepay: { ar: 'Apple Pay', en: 'Apple Pay' },
  stcpay: { ar: 'STC Pay', en: 'STC Pay' },
  cash: { ar: 'نقدًا', en: 'Cash' },
};

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pick = (v, lang) => (v && typeof v === 'object' ? v[lang] ?? v.ar ?? v.en ?? '' : v ?? '');
export const money = (n, lang) => {
  const num = Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return lang === 'en' ? `SAR ${num}` : `${num} ر.س`;
};
const abs = (siteUrl, path) => (!path ? '' : /^https?:|^data:/.test(path) ? path : `${siteUrl.replace(/\/$/, '')}/${path.replace(/^\.?\//, '')}`);
/** Product photos are WebP on the site; emails use the JPG thumbnails in /email/p/ when one exists. */
const emailThumb = (siteUrl, item) => (item.product_id && !String(item.image || '').startsWith('http') ? abs(siteUrl, `email/p/${item.product_id}.jpg`) : abs(siteUrl, item.image));

/* ------------------------------------------------------------------ building blocks */
function layout({ lang = 'ar', title, preheader = '', body, siteUrl, unsubscribeUrl, socials = {} }) {
  const rtl = lang !== 'en';
  const dir = rtl ? 'rtl' : 'ltr';
  const align = rtl ? 'right' : 'left';
  const font = rtl ? FONT_AR : FONT_EN;
  const L = (ar, en) => (rtl ? ar : en);
  const link = (href, label) => `<a href="${esc(href)}" style="color:${C.cream};text-decoration:none;font-weight:700">${label}</a>`;
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;700&family=Archivo+Black&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  a { color:${C.blue}; }
  @media (max-width: 620px) {
    .container { width:100% !important; border-radius:0 !important; border-left:0 !important; border-right:0 !important; }
    .px { padding-left:22px !important; padding-right:22px !important; }
    .h1 { font-size:28px !important; line-height:1.25 !important; }
    .stack { display:block !important; width:100% !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cream};">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" dir="${dir}"
         style="width:600px;max-width:600px;background:${C.paper};border:2px solid ${C.ink};border-radius:22px;overflow:hidden;">
    <tr><td align="center" style="background:${C.ink};padding:30px 24px 24px;">
      <a href="${esc(siteUrl)}" style="text-decoration:none"><img src="${esc(abs(siteUrl, 'email/logo.png'))}" width="168" height="78" alt="زوووط ZOOOT" style="display:block;border:0;width:168px;height:auto;color:${C.yellow};font:700 28px ${font}"></a>
      <div style="font-family:${FONT_LATIN_BLACK};font-size:10px;letter-spacing:4px;color:${C.yellow};margin-top:14px;">WEAR THE MOOD. OWN THE STREET.</div>
    </td></tr>
    <tr><td style="font-size:0;line-height:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td height="6" style="background:${C.yellow};font-size:0;line-height:0">&nbsp;</td>
        <td height="6" style="background:${C.magenta};font-size:0;line-height:0">&nbsp;</td>
        <td height="6" style="background:${C.blue};font-size:0;line-height:0">&nbsp;</td>
      </tr></table>
    </td></tr>
    <tr><td class="px" dir="${dir}" align="${align}" style="padding:36px 40px 40px;font-family:${font};color:${C.ink};text-align:${align};direction:${dir};">
      ${body}
    </td></tr>
    <tr><td align="center" style="background:${C.ink};padding:26px 24px;font-family:${font};font-size:13px;line-height:1.9;color:#9A9387;">
      ${link(siteUrl + '/shop.html', L('المتجر', 'Shop'))} &nbsp;·&nbsp; ${link(siteUrl + '/track.html', L('تتبّع طلبك', 'Track an order'))}${socials.instagram ? ` &nbsp;·&nbsp; ${link(socials.instagram, 'Instagram')}` : ''}${socials.tiktok ? ` &nbsp;·&nbsp; ${link(socials.tiktok, 'TikTok')}` : ''}
      <div style="margin-top:10px;">© ZOOOT — زوووط · DROP 001</div>
      ${unsubscribeUrl ? `<div style="margin-top:6px;"><a href="${esc(unsubscribeUrl)}" style="color:#9A9387;text-decoration:underline">${L('إلغاء الاشتراك', 'Unsubscribe')}</a></div>` : ''}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

const kicker = (txt) =>
  `<div style="font-family:${FONT_LATIN_BLACK};font-size:11px;letter-spacing:3px;color:${C.magenta};margin:0 0 10px;direction:ltr;unicode-bidi:isolate;">${esc(txt)}</div>`;
const h1 = (txt, font) => `<h1 class="h1" style="margin:0 0 16px;font-family:${font};font-size:34px;line-height:1.2;font-weight:700;color:${C.ink};">${txt}</h1>`;
const p = (txt, font, extra = '') => `<p style="margin:0 0 16px;font-family:${font};font-size:16px;line-height:1.85;color:#3A352F;${extra}">${txt}</p>`;

function button(href, label, font, { bg = C.yellow, fg = C.ink } = {}) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px;"><tr>
    <td align="center" bgcolor="${bg}" style="background:${bg};border:2px solid ${C.ink};border-radius:999px;mso-padding-alt:14px 30px;">
      <a href="${esc(href)}" style="display:inline-block;padding:14px 30px;font-family:${font};font-size:16px;font-weight:700;color:${fg};text-decoration:none;border-radius:999px;">${esc(label)} &nbsp;${font === FONT_AR ? '&#8592;' : '&#8594;'}</a>
    </td></tr></table>`;
}

function box(inner, { bg = C.cream, border = 'rgba(13,13,13,.16)', dashed = true } = {}) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;"><tr>
    <td style="background:${bg};border:1.5px ${dashed ? 'dashed' : 'solid'} ${border};border-radius:16px;padding:20px 22px;">${inner}</td>
  </tr></table>`;
}

function progress(status, lang) {
  const idx = FLOW.indexOf(status);
  const cells = FLOW.map((s, i) => {
    const on = idx >= i;
    return `<td width="20%" align="center" style="padding:0 2px;">
      <div style="height:8px;border-radius:8px;background:${on ? (i === idx ? C.magenta : C.ink) : 'rgba(13,13,13,.12)'};"></div>
      <div style="font-size:11px;line-height:1.4;margin-top:8px;color:${on ? C.ink : '#9A9387'};font-weight:${i === idx ? 700 : 400};">${esc(STATUS_LABELS[s][lang])}</div>
    </td>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px;"><tr>${cells}</tr></table>`;
}

function itemsTable(order, lang, siteUrl, font) {
  const rtl = lang !== 'en';
  const end = rtl ? 'left' : 'right';
  const rows = (order.items || [])
    .map((it) => {
      const opts = (it.options || [])
        .map((o) => `${esc(pick(o.label, lang))}: ${esc(typeof o.value === 'object' ? pick(o.value, lang) : o.value)}`)
        .join(' · ');
      const img = emailThumb(siteUrl, it);
      return `<tr>
        <td width="64" valign="top" style="padding:10px 0;">${img ? `<img src="${esc(img)}" width="56" height="70" alt="" style="display:block;width:56px;height:70px;object-fit:cover;border-radius:10px;background:${C.cream};">` : ''}</td>
        <td valign="top" style="padding:10px 12px;font-family:${font};">
          <div style="font-size:15px;font-weight:700;line-height:1.5;color:${C.ink};">${esc(pick(it.name, lang))}</div>
          ${opts ? `<div style="font-size:12.5px;line-height:1.6;color:${C.muted};">${opts}</div>` : ''}
          <div style="font-size:12.5px;color:${C.muted};">× ${Number(it.qty)}</div>
        </td>
        <td valign="top" align="${end}" style="padding:10px 0;font-family:${font};font-size:15px;font-weight:700;white-space:nowrap;color:${C.ink};">${money(it.unit_price * it.qty, lang)}</td>
      </tr>`;
    })
    .join(`<tr><td colspan="3" style="border-top:1px solid rgba(13,13,13,.1);font-size:0;line-height:0;">&nbsp;</td></tr>`);
  const line = (label, value, bold = false) =>
    `<tr><td style="padding:4px 0;font-family:${font};font-size:${bold ? 17 : 14}px;font-weight:${bold ? 700 : 400};color:${bold ? C.ink : C.muted};">${label}</td>
      <td align="${end}" style="padding:4px 0;font-family:${font};font-size:${bold ? 17 : 14}px;font-weight:700;color:${C.ink};white-space:nowrap;">${value}</td></tr>`;
  const L = (ar, en) => (rtl ? ar : en);
  const totals = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;border-top:2px solid ${C.ink};padding-top:8px;">
    ${line(L('المجموع الفرعي', 'Subtotal'), money(order.subtotal, lang))}
    ${Number(order.discount) > 0 ? line(L('الخصم', 'Discount'), '− ' + money(order.discount, lang)) : ''}
    ${line(L('الشحن', 'Shipping'), Number(order.shipping) > 0 ? money(order.shipping, lang) : L('مجاني', 'Free'))}
    ${line(L('الإجمالي', 'Total'), money(order.total, lang), true)}
  </table>`;
  return box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>${totals}`, { bg: '#FFFFFF' });
}

const addressBlock = (order, lang, font) => {
  const L = (ar, en) => (lang !== 'en' ? ar : en);
  return `<div style="font-family:${font};font-size:14px;line-height:1.8;color:#3A352F;">
    <strong style="color:${C.ink}">${L('التوصيل إلى', 'Delivering to')}</strong><br>
    ${esc(order.customer_name)} · <span dir="ltr">${esc(order.customer_phone)}</span><br>
    ${esc([order.city, order.district].filter(Boolean).join(' — '))}${order.address ? '<br>' + esc(order.address) : ''}
  </div>`;
};

/** @param {Record<string, any>} [o] */
const ctx = (o = {}) => ({ siteUrl: (o.siteUrl || 'https://zooot.shop').replace(/\/$/, ''), socials: o.socials || {} });
const trackLink = (siteUrl, order) => `${siteUrl}/track.html?order=${encodeURIComponent(order.order_no)}`;

/* ------------------------------------------------------------------ templates */

/** Newsletter welcome (footer “Join the ZOOOTA” form). */
/** @param {Record<string, any>} [opts] */
export function welcomeEmail(opts = {}) {
  const { lang = 'ar', unsubscribeUrl, ...o } = opts;
  const { siteUrl, socials } = ctx(o);
  const rtl = lang !== 'en';
  const font = rtl ? FONT_AR : FONT_EN;
  const L = (ar, en) => (rtl ? ar : en);
  const star = `<span style="color:${C.magenta};font-weight:700">✦</span>`;
  const perks = [
    L('وصول مبكّر لكل إصدار قبل الكل', 'Early access to every drop'),
    L('عدّاد الإطلاق — يوم بيوم حتى الإصدار الجاي', 'The launch counter — day by day to the next drop'),
    L('قاموس زوووط: كلمة من القاموس + موقف من الشارع', 'The ZOOOT dictionary: one word, one street moment'),
  ];
  const subject = L('أهلًا بك في الزوووطة ✦', 'Welcome to the ZOOOTA ✦');
  const body = `
    <a href="${esc(siteUrl)}"><img src="${esc(abs(siteUrl, 'og-image.jpg'))}" width="520" alt="${esc(L('امسك شروالك مزبوووط', 'Hold your sirwal just right'))}" style="display:block;width:100%;max-width:520px;height:auto;border-radius:16px;border:2px solid ${C.ink};margin:0 0 28px;"></a>
    ${kicker('JOIN THE ZOOOTA')}
    ${h1(L('أهلًا بك في <span style="color:' + C.magenta + '">الزوووطة</span>', 'Welcome to <span style="color:' + C.magenta + '">the ZOOOTA</span>'), font)}
    ${p(L('صرت من أوّل الناس اللي يدرون. زوووط: هودي أوفرسايز، شروال من أقمشة السوق، وكلمة وحدة على الظهر — يقرأها الشارع قبل ما يشوف وجهك.', 'You’re now one of the first to know. ZOOOT: an oversized hoodie, a sirwal in souq fabric, and one word on the back — the street reads it before it sees your face.'), font)}
    ${box(perks.map((x) => `<div style="font-family:${font};font-size:15px;line-height:1.9;color:${C.ink};">${star}&nbsp; ${esc(x)}</div>`).join(''))}
    ${button(`${siteUrl}/shop.html`, L('تسوّق DROP 001', 'Shop DROP 001'), font)}
    ${p(L('ولا تنسى: امسك شروالك مزبوووط.', 'And remember: hold your sirwal just right.'), font, `color:${C.muted};font-size:14px;margin-top:18px;`)}`;
  return {
    subject,
    html: layout({ lang, title: subject, preheader: L('وصول مبكّر، عدّاد الإطلاق، وقاموس زوووط.', 'Early access, the launch counter and the ZOOOT dictionary.'), body, siteUrl, unsubscribeUrl, socials }),
    text: `${subject}\n\n${perks.map((x) => '✦ ' + x).join('\n')}\n\n${L('تسوّق', 'Shop')}: ${siteUrl}/shop.html${unsubscribeUrl ? `\n\n${L('إلغاء الاشتراك', 'Unsubscribe')}: ${unsubscribeUrl}` : ''}`,
  };
}

/** Sent to the customer right after checkout. */
/** @param {Record<string, any>} opts */
export function orderConfirmationEmail(opts) {
  const { order, settings = {}, ...o } = opts;
  const { siteUrl, socials } = ctx(o);
  const lang = order.lang === 'en' ? 'en' : 'ar';
  const rtl = lang !== 'en';
  const font = rtl ? FONT_AR : FONT_EN;
  const L = (ar, en) => (rtl ? ar : en);
  const method = METHODS[order.payment_method] ? pick(METHODS[order.payment_method], lang) : order.payment_method;
  const subject = L(`طلبك ${order.order_no} وصلنا ✦`, `We got your order ${order.order_no} ✦`);
  const bank =
    order.payment_method === 'transfer' && settings.bank_details
      ? box(`<div style="font-family:${font};font-size:14px;line-height:1.8;"><strong>${L('بيانات التحويل البنكي', 'Bank transfer details')}</strong><br>${esc(settings.bank_details).replace(/\n/g, '<br>')}<br><span style="color:${C.muted}">${L('اكتب رقم الطلب في ملاحظة التحويل.', 'Put the order number in the transfer note.')}</span></div>`, { bg: C.cream, dashed: false })
      : '';
  const body = `
    ${kicker(`ORDER ${order.order_no} · DROP 001`)}
    ${h1(L('شكرًا لأنك اخترت زوووط', 'Thanks for choosing ZOOOT'), font)}
    ${p(L(`أهلًا ${esc(order.customer_name)}، استلمنا طلبك وبنبدأ نجهّزه. بنرسل لك تحديث مع كل خطوة.`, `Hi ${esc(order.customer_name)}, we’ve got your order and we’re getting it ready. You’ll hear from us at every step.`), font)}
    ${progress(order.status || 'new', lang)}
    ${itemsTable(order, lang, siteUrl, font)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="stack" valign="top" width="55%" style="padding:0 0 12px;">${addressBlock(order, lang, font)}</td>
      <td class="stack" valign="top" width="45%" style="padding:0 0 12px;font-family:${font};font-size:14px;line-height:1.8;color:#3A352F;">
        <strong style="color:${C.ink}">${L('طريقة الدفع', 'Payment')}</strong><br>${esc(method)}
      </td>
    </tr></table>
    ${bank}
    ${button(trackLink(siteUrl, order), L('تتبّع طلبك', 'Track your order'), font)}
    ${box(`<div style="font-family:${font};font-size:15px;line-height:1.8;color:${C.cream};"><strong style="color:${C.yellow}">${L('تدري مين وراء الزوووطة؟', 'Who’s behind the ZOOOTA?')}</strong><br>${L('الجواب داخل العلبة. افتحها وصوّر اللحظة 👀', 'The answer is inside the box. Open it — and film the moment 👀')}</div>`, { bg: C.ink, dashed: false, border: C.ink })}`;
  return {
    subject,
    html: layout({ lang, title: subject, preheader: L(`الإجمالي ${money(order.total, lang)} — تتبّع طلبك في أي وقت.`, `Total ${money(order.total, lang)} — track it any time.`), body, siteUrl, socials }),
    text: [
      subject,
      '',
      ...(order.items || []).map((it) => `• ${pick(it.name, lang)} ×${it.qty} — ${money(it.unit_price * it.qty, lang)}`),
      `${L('الإجمالي', 'Total')}: ${money(order.total, lang)}`,
      `${L('الدفع', 'Payment')}: ${method}`,
      '',
      `${L('تتبّع طلبك', 'Track your order')}: ${trackLink(siteUrl, order)}`,
    ].join('\n'),
  };
}

const STATUS_COPY = {
  confirmed: {
    h: { ar: 'طلبك تأكّد ✓', en: 'Your order is confirmed ✓' },
    p: { ar: 'كل شي تمام — طلبك دخل قائمة التجهيز.', en: 'All good — your order is in the queue.' },
  },
  preparing: {
    h: { ar: 'طلبك قيد التجهيز', en: 'Your order is being made' },
    p: { ar: 'نطبع العبارة، نثبّت «زوووط» على الظهر، ونجهّز صندوق التوقيع.', en: 'Printing the statement, fixing «ZOOOT» on the back and packing the signature box.' },
  },
  shipped: {
    h: { ar: 'طلبك في الطريق 🚚', en: 'Your order is on its way 🚚' },
    p: { ar: 'سلّمنا الصندوق لشركة الشحن. جهّز مكان في الدولاب.', en: 'The box is with the courier. Make some room in the closet.' },
  },
  delivered: {
    h: { ar: 'وصلك؟ البسه.', en: 'Got it? Wear it.' },
    p: { ar: 'خلّ الشارع يقرأ الظهر — وصوّرها وأشّر علينا.', en: 'Let the street read the back — and tag us when you post it.' },
  },
  cancelled: {
    h: { ar: 'تم إلغاء طلبك', en: 'Your order was cancelled' },
    p: { ar: 'إذا كان في شي غلط أو تبي تطلب من جديد، ردّ على هذا الإيميل.', en: 'If something’s off or you want to order again, just reply to this email.' },
  },
  new: {
    h: { ar: 'استلمنا طلبك', en: 'We received your order' },
    p: { ar: 'بنبدأ نجهّزه قريب.', en: 'We’ll start on it soon.' },
  },
};

/** Sent when the owner moves an order to a new status. */
/** @param {Record<string, any>} opts */
export function statusUpdateEmail(opts) {
  const { order, ...o } = opts;
  const status = opts.status || order.status;
  const { siteUrl, socials } = ctx(o);
  const lang = order.lang === 'en' ? 'en' : 'ar';
  const rtl = lang !== 'en';
  const font = rtl ? FONT_AR : FONT_EN;
  const L = (ar, en) => (rtl ? ar : en);
  const copy = STATUS_COPY[status] || STATUS_COPY.new;
  const subject = `${order.order_no} · ${pick(copy.h, lang)}`;
  const shipping =
    status === 'shipped' && (order.courier || order.tracking_no)
      ? box(`<div style="font-family:${font};font-size:14px;line-height:1.8;"><strong>${L('بيانات الشحنة', 'Shipment')}</strong><br>${esc(order.courier || '')} ${order.tracking_no ? `· <span dir="ltr" style="font-family:${FONT_LATIN_BLACK}">${esc(order.tracking_no)}</span>` : ''}</div>`, { bg: C.cream, dashed: false })
      : '';
  const body = `
    ${kicker(`ORDER ${order.order_no} · ${STATUS_LABELS[status]?.en?.toUpperCase() || ''}`)}
    ${h1(esc(pick(copy.h, lang)), font)}
    ${p(esc(pick(copy.p, lang)), font)}
    ${status !== 'cancelled' ? progress(status, lang) : ''}
    ${shipping}
    ${button(trackLink(siteUrl, order), L('تتبّع طلبك', 'Track your order'), font)}`;
  return {
    subject,
    html: layout({ lang, title: subject, preheader: pick(copy.p, lang), body, siteUrl, socials }),
    text: `${pick(copy.h, lang)}\n${pick(copy.p, lang)}\n\n${L('تتبّع طلبك', 'Track your order')}: ${trackLink(siteUrl, order)}`,
  };
}

/** A personal message from the owners about one order. */
/** @param {Record<string, any>} opts */
export function customMessageEmail(opts) {
  const { order, subject, message, ...o } = opts;
  const { siteUrl, socials } = ctx(o);
  const lang = order.lang === 'en' ? 'en' : 'ar';
  const rtl = lang !== 'en';
  const font = rtl ? FONT_AR : FONT_EN;
  const L = (ar, en) => (rtl ? ar : en);
  const paras = String(message || '')
    .split(/\n{2,}/)
    .map((x) => p(esc(x).replace(/\n/g, '<br>'), font))
    .join('');
  const body = `${kicker(`ORDER ${order.order_no}`)}${h1(esc(subject), font)}${paras}${button(trackLink(siteUrl, order), L('تتبّع طلبك', 'Track your order'), font)}`;
  return { subject, html: layout({ lang, title: subject, preheader: String(message || '').slice(0, 90), body, siteUrl, socials }), text: `${subject}\n\n${message}` };
}

/** Internal: pings the owners when a web order lands. */
/** @param {Record<string, any>} opts */
export function ownerNewOrderEmail(opts) {
  const { order, dashboardUrl, ...o } = opts;
  const { siteUrl } = ctx(o);
  const font = FONT_AR;
  const subject = `🟡 طلب جديد ${order.order_no} — ${money(order.total, 'ar')}`;
  const body = `
    ${kicker(`NEW ORDER · ${order.order_no}`)}
    ${h1(`طلب جديد من ${esc(order.customer_name)}`, font)}
    ${p(`${esc(order.city || '')} · <span dir="ltr">${esc(order.customer_phone)}</span>${order.customer_email ? ` · ${esc(order.customer_email)}` : ''}`, font)}
    ${itemsTable({ ...order, lang: 'ar' }, 'ar', siteUrl, font)}
    ${order.customer_note ? box(`<div style="font-family:${font};font-size:14px;line-height:1.8;"><strong>ملاحظة العميل</strong><br>${esc(order.customer_note)}</div>`) : ''}
    ${button(dashboardUrl || `${siteUrl}/admin/`, 'افتح الطلب في لوحة التحكم', font, { bg: C.magenta, fg: '#FFFFFF' })}`;
  return { subject, html: layout({ lang: 'ar', title: subject, preheader: `${order.customer_name} · ${money(order.total, 'ar')}`, body, siteUrl }), text: `${subject}\n${order.customer_name} · ${order.customer_phone}\n${dashboardUrl || siteUrl + '/admin/'}` };
}

/** Newsletter campaign composed in the dashboard. */
/** @param {Record<string, any>} opts */
export function campaignEmail(opts) {
  const { lang = 'ar', subject, heading, body: message, ctaLabel, ctaUrl, image, unsubscribeUrl, ...o } = opts;
  const { siteUrl, socials } = ctx(o);
  const rtl = lang !== 'en';
  const font = rtl ? FONT_AR : FONT_EN;
  const paras = String(message || '')
    .split(/\n{2,}/)
    .map((x) => p(esc(x).replace(/\n/g, '<br>'), font))
    .join('');
  const html = `
    ${image ? `<img src="${esc(abs(siteUrl, image))}" width="520" alt="" style="display:block;width:100%;max-width:520px;height:auto;border-radius:16px;border:2px solid ${C.ink};margin:0 0 28px;">` : ''}
    ${kicker('ZOOOT · DROP 001')}
    ${h1(esc(heading || subject), font)}
    ${paras}
    ${ctaLabel && ctaUrl ? button(abs(siteUrl, ctaUrl), ctaLabel, font) : ''}`;
  return {
    subject,
    html: layout({ lang, title: subject, preheader: String(message || '').slice(0, 90), body: html, siteUrl, unsubscribeUrl, socials }),
    text: `${heading || subject}\n\n${message}${ctaUrl ? `\n\n${ctaLabel}: ${abs(siteUrl, ctaUrl)}` : ''}${unsubscribeUrl ? `\n\nUnsubscribe: ${unsubscribeUrl}` : ''}`,
  };
}
