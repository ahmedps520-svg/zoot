/**
 * ZOOOT — DROP 001 catalogue.
 * Everything here comes from "ZOOOT Issue 01 — The Loud Launch" (pp. 45–64).
 * Prices are PLACEHOLDERS: the magazine marks quantities & prices as
 * "pending sample approval" — update CONFIG.prices before launch.
 */
export const CONFIG = {
  currency: { ar: 'ر.س', en: 'SAR' },
  prices: { hoodie: 289, sirwal: 229, set: 479 }, // TODO: confirm with the founders
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  // Fallback only — the owner dashboard (Settings) overrides it once set.
  whatsapp: '', // international format without "+", e.g. '9665XXXXXXXX'
  socials: {
    instagram: 'https://www.instagram.com/',
    tiktok: 'https://www.tiktok.com/',
  },
};

export const PALETTE = [
  { id: 'yellow', hex: '#FFD21F', ar: 'الأصفر الصاخب', en: 'Loud Yellow', use: { ar: 'العناوين والشعار', en: 'Headlines & logo' } },
  { id: 'blue', hex: '#1F4BFF', ar: 'الأزرق الكهربائي', en: 'Electric Blue', use: { ar: 'الخلفيات والحدود', en: 'Backgrounds & borders' } },
  { id: 'magenta', hex: '#E5197F', ar: 'الماجنتا', en: 'Magenta', use: { ar: 'الظلال والعناصر', en: 'Shadows & elements' } },
  { id: 'black', hex: '#0D0D0D', ar: 'الأسود', en: 'Black', use: { ar: 'الهودي والصفحات الداكنة', en: 'Hoodies & dark pages' } },
  { id: 'orange', hex: '#F26B21', ar: 'البرتقالي', en: 'Orange', use: { ar: 'الإصدارات الخاصة', en: 'Special editions' } },
  { id: 'purple', hex: '#4B1E8C', ar: 'البنفسجي', en: 'Purple', use: { ar: 'مجموعات الريترو', en: 'Retro collections' } },
  { id: 'gold', hex: '#C9A04A', ar: 'الذهبي', en: 'Gold', use: { ar: 'صفحات الفخامة', en: 'Luxury pages' } },
];

/** Iconic-back colourways of the big «زوووط» on the sirwal (p.51). */
export const COLORWAYS = [
  { id: 'souq-pop', ar: 'سوق بوب', en: 'Souq Pop', fill: '#FFD21F', edge: '#1F4BFF', shadow: '#E5197F', note: { ar: 'أصفر · حد أزرق · ظل ماجنتا', en: 'Yellow · blue edge · magenta shadow' }, img: 'img/colorways/souq-pop.webp' },
  { id: 'late-night', ar: 'آخر الليل', en: 'Late Night', fill: '#8FC3FF', edge: '#1F4BFF', shadow: '#0F1B4D', note: { ar: 'أزرق فاتح · حد أزرق', en: 'Light blue · blue edge' }, img: 'img/colorways/late-night.webp' },
  { id: 'neon-heritage', ar: 'تراث نيون', en: 'Neon Heritage', fill: '#FFD21F', edge: '#4B1E8C', shadow: '#E5197F', note: { ar: 'أصفر · حد بنفسجي · ظل ماجنتا', en: 'Yellow · purple edge · magenta shadow' }, img: 'img/colorways/neon-heritage.webp' },
  { id: 'desert-cloud', ar: 'سحابة الصحراء', en: 'Desert Cloud', fill: '#B9582B', edge: '#2A1810', shadow: '#4A2E1E', note: { ar: 'بني محمر · ظل بني داكن', en: 'Rust brown · dark brown shadow' }, img: 'img/colorways/desert-cloud.webp' },
  { id: 'full-stop', ar: 'زوووط.', en: 'Full Stop', fill: '#E02B2B', edge: '#FFFFFF', shadow: '#151515', note: { ar: 'أحمر على قاعدة بيضاء', en: 'Red on a white base' }, img: 'img/colorways/full-stop.webp' },
  { id: 'earth-black', ar: 'أسود ترابي', en: 'Earth Black', fill: '#FFFFFF', edge: '#151515', shadow: '#8A8A8A', note: { ar: 'أبيض · ظل رمادي', en: 'White · grey shadow' }, img: 'img/colorways/earth-black.webp' },
];

/** Souq fabric families (p.54). */
export const FABRICS = [
  { id: 'souq-woven', ar: 'كليم السوق', en: 'Souq Kilim', img: 'img/fabrics/souq-onbody.webp', size: 120, note: { ar: 'على الجسم · منسوج', en: 'On body · woven' } },
  { id: 'kilim-ref', ar: 'كليم الماس', en: 'Diamond Kilim', img: 'img/fabrics/kilim-ref.webp', size: 64, note: { ar: 'مرجع النقشة · رسم فني', en: 'Pattern reference · artwork' } },
  { id: 'kilim-kahli', ar: 'كليم كحلي', en: 'Navy Kilim', img: 'img/fabrics/kilim-kahli.webp', size: 90 },
  { id: 'multi-stripe', ar: 'مخطط متعدد الألوان', en: 'Multi Stripe', img: 'img/fabrics/multi-stripe.webp', size: 90 },
  { id: 'bezli', ar: 'بيزلي', en: 'Paisley Dot', img: 'img/fabrics/bezli.webp', size: 80 },
  { id: 'kilim-black-blue', ar: 'كليم أسود/أزرق', en: 'Black/Blue Kilim', img: 'img/fabrics/kilim-black-blue.webp', size: 90 },
  { id: 'kilim-turquoise', ar: 'كليم تركوازي', en: 'Turquoise Kilim', img: 'img/fabrics/kilim-turquoise.webp', size: 90 },
  { id: 'tartan', ar: 'كاروهات', en: 'Tartan', img: 'img/fabrics/tartan.webp', size: 90 },
];

/** Statement collection S01–S06 (pp.45–47). */
export const STATEMENTS = [
  {
    id: 'S01', n: '01', ar: 'تاج الكوميكس', en: 'Comic Crown', mood: { ar: 'ملك الشارع', en: 'Street royalty' },
    quote: { ar: 'امسك شروالك مزبوووط', en: 'Hold your sirwal just right' },
    method: 'Screen', methodColor: '#1F4BFF',
    spec: { ar: 'شاشة 5 ألوان + أساس أبيض', en: '5-colour screen + white base' },
    colors: ['#22D3EE', '#E5197F', '#1F4BFF', '#FFD21F'],
  },
  {
    id: 'S02', n: '02', ar: 'سرعة', en: 'Speed Stretch', mood: { ar: 'مستعجل', en: 'In a rush' },
    quote: { ar: 'لا تشدّها.. زوووطها', en: "Don't stress it.. ZOOOT it" },
    method: 'Screen', methodColor: '#1F4BFF',
    spec: { ar: 'شاشة 4 ألوان + أساس أبيض', en: '4-colour screen + white base' },
    colors: ['#22D3EE', '#0D0D0D', '#E5197F', '#FFD21F'],
  },
  {
    id: 'S03', n: '03', ar: 'زر التشغيل', en: 'Mode Switch', mood: { ar: 'جاهز', en: 'Switched on' },
    quote: { ar: 'على وضع زوووط', en: 'On ZOOOT mode' },
    method: 'Screen + Neon', methodColor: '#2E9E4F',
    spec: { ar: 'شاشة 5 ألوان + حبر نيون للمؤشر (اختياري)', en: '5-colour screen + neon ink indicator (optional)' },
    colors: ['#B8F23A', '#1F4BFF', '#0D0D0D', '#FFD21F'],
  },
  {
    id: 'S04', n: '04', ar: 'عدّاد المزاج', en: 'Mood Meter', mood: { ar: 'رايق', en: 'Easy going' },
    quote: { ar: 'المزاج زوووط', en: 'Mood: ZOOOT' },
    method: 'DTF', methodColor: '#E5197F',
    spec: { ar: 'DTF — ألوان كثيرة وتدرجات دقيقة', en: 'DTF — many colours & fine gradients' },
    colors: ['#6E2BD9', '#F26B21', '#E5197F', '#FFD21F', '#22D3EE', '#1F4BFF'],
  },
  {
    id: 'S05', n: '05', ar: 'فقاعة الكلام', en: 'Speech Bubble', mood: { ar: 'سوالف', en: 'Chatty' },
    quote: { ar: 'شروالك يحكي عنك', en: 'Your sirwal speaks for you' },
    method: 'Screen', methodColor: '#1F4BFF',
    spec: { ar: 'شاشة 5 ألوان + أساس أبيض', en: '5-colour screen + white base' },
    colors: ['#E5197F', '#FFD21F', '#0D0D0D', '#1F4BFF'],
  },
  {
    id: 'S06', n: '06', ar: 'الختم الذهبي', en: 'Gold Stamp', mood: { ar: 'واثق', en: 'Confident' },
    quote: { ar: 'مو أي شروال.. زوووط', en: 'Not just any sirwal.. ZOOOT' },
    method: 'DTF / Foil', methodColor: '#B08A2E',
    spec: { ar: 'DTF للتدرج، أو فويل ذهبي حراري + شاشة للأحمر', en: 'DTF for the gradient, or heat gold foil + red screen' },
    colors: ['#8B5E14', '#D4A52A', '#FFF1A8', '#E02B2B'],
  },
].map((s) => {
  const k = s.id.toLowerCase();
  return {
    ...s,
    art: `img/statements/art-${k}.webp`,
    cut: `img/statements/cut-${k}.webp`,
    back: `img/statements/back-${k}.webp`,
    full: `img/statements/full-${k}.webp`,
  };
});

/** The 8 looks of DROP 001 (p.60) with their colour recipe (p.47). */
export const LOOKS = [
  { id: 'L01', n: '01', ar: 'سوق بوب', en: 'Souq Pop', hoodie: '#151515', print: ['#E5197F', '#1F4BFF', '#FFD21F'], sirwal: ['#E8DCC4', '#C9A04A', '#8B1A2B', '#1E2A4A'], fabric: 'souq-woven', colorway: 'souq-pop', imgs: ['img/looks/look-01.webp', 'img/statements/back-s01.webp'] },
  { id: 'L02', n: '02', ar: 'آخر الليل', en: 'Late Night', hoodie: '#0E0E10', print: ['#0F1B4D', '#1F4BFF', '#A3C4FF'], sirwal: ['#D9DCE3', '#5E6B8F', '#3366FF', '#151A2E'], fabric: 'kilim-black-blue', colorway: 'late-night', imgs: ['img/looks/look-02.webp', 'img/looks/look-02b.webp'] },
  { id: 'L03', n: '03', ar: 'تراث نيون', en: 'Neon Heritage', hoodie: '#3E1F5C', print: ['#E5197F', '#4B1E8C', '#FFD21F'], sirwal: ['#FFD21F', '#2FB5A6', '#E5197F', '#2A1438'], fabric: 'multi-stripe', colorway: 'neon-heritage', imgs: ['img/looks/look-03.webp'] },
  { id: 'L04', n: '04', ar: 'غروب أحمر', en: 'Sunset Red', hoodie: '#7D1424', print: ['#2A1215', '#7D1424', '#FFD21F'], sirwal: ['#E8DCC4', '#D9A42A', '#C9302C', '#2A1215'], fabric: 'tartan', colorway: 'full-stop', imgs: ['img/looks/look-04.webp'] },
  { id: 'L05', n: '05', ar: 'نسمة البحر', en: 'Ocean Breeze', hoodie: '#A6CBF2', print: ['#13294B', '#1F4BFF', '#C5E0FF'], sirwal: ['#F2EBDF', '#E8DCC4', '#3389DD', '#163A66'], fabric: 'kilim-black-blue', colorway: 'late-night', imgs: ['img/looks/look-05.webp'] },
  { id: 'L06', n: '06', ar: 'زيتوني حضري', en: 'Urban Olive', hoodie: '#4D5A2A', print: ['#B5472A', '#2E2A1E', '#FFD21F'], sirwal: ['#E8DCC4', '#D9A42A', '#B5472A', '#2E2A1E'], fabric: 'kilim-turquoise', colorway: 'souq-pop', imgs: ['img/looks/look-06.webp', 'img/looks/look-06b.webp'] },
  { id: 'L07', n: '07', ar: 'سحابة الصحراء', en: 'Desert Sage', hoodie: '#E8DCC4', print: ['#3D2A1E', '#8B5A3C', '#B85C2A'], sirwal: ['#3D2A1E', '#8B5A3C', '#3D2A1E', '#E8DCC4'], fabric: 'bezli', colorway: 'desert-cloud', imgs: ['img/looks/look-07.webp'] },
  { id: 'L08', n: '08', ar: 'زوووط.', en: 'Full Stop', hoodie: '#EDE4D3', print: ['#111111', '#FFFFFF', '#E02B2B'], sirwal: ['#C9302C', '#111111', '#C9302C', '#F2EBDF'], fabric: 'tartan', colorway: 'full-stop', imgs: ['img/looks/look-08.webp'] },
];

export const byId = (list, id) => list.find((x) => x.id === id);

/** Shop catalogue: 8 look sets + 6 statement hoodies + 6 sirwal colourways. */
export const PRODUCTS = [
  ...LOOKS.map((l) => ({
    id: `set-${l.n}`,
    type: 'set',
    ref: l.id,
    name: { ar: `طقم ${l.ar}`, en: `${l.en} Set` },
    sub: { ar: `الإطلالة ${l.n} · هودي + شروال`, en: `Look ${l.n} · hoodie + sirwal` },
    price: CONFIG.prices.set,
    imgs: l.imgs,
    swatches: [l.hoodie, ...l.print.slice(0, 2), l.sirwal[2]],
  })),
  ...STATEMENTS.map((s) => ({
    id: `hoodie-${s.n}`,
    type: 'hoodie',
    ref: s.id,
    name: { ar: `هودي «${s.quote.ar}»`, en: `“${s.quote.en}” Hoodie` },
    sub: { ar: `العبارة S${s.n} · ${s.ar}`, en: `Statement S${s.n} · ${s.en}` },
    price: CONFIG.prices.hoodie,
    imgs: [s.back, s.full],
    swatches: s.colors,
  })),
  ...COLORWAYS.map((c, i) => ({
    id: `sirwal-${c.id}`,
    type: 'sirwal',
    ref: c.id,
    name: { ar: `شروال زوووط · ${c.ar}`, en: `ZOOOT Sirwal · ${c.en}` },
    sub: { ar: c.note.ar, en: c.note.en },
    price: CONFIG.prices.sirwal,
    imgs: [c.img, i % 2 ? 'img/details/embroidery-2.webp' : 'img/details/embroidery-1.webp'],
    swatches: [c.fill, c.edge, c.shadow],
  })),
];

export const productById = (id) => PRODUCTS.find((p) => p.id === id);
