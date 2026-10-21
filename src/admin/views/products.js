import { ONE, SIZES } from '../../js/backend/model.js';
import { reload, render, store } from '../main.js';
import { L, bad, confirmDialog, dialog, esc, icon, img, money, moneyHTML, num, tr } from '../ui.js';
import { busy, empty, mount, statTile } from './common.js';

const state = { q: '', filter: '', view: '' };
const FILTERS = [
  { id: '', ar: 'الكل', en: 'All' },
  { id: 'set', ar: 'أطقم', en: 'Sets' },
  { id: 'hoodie', ar: 'هوديز', en: 'Hoodies' },
  { id: 'sirwal', ar: 'شراويل', en: 'Sirwals' },
  { id: 'other', ar: 'أخرى', en: 'Other' },
  { id: 'out', ar: 'نفد', en: 'Sold out' },
  { id: 'low', ar: 'قارب يخلص', en: 'Low stock' },
  { id: 'hidden', ar: 'مخفي', en: 'Hidden' },
];
const LOW = 2;
const keysOf = (p) => (p.sizes?.length ? p.sizes : [ONE]);
const unitsOf = (p) => (p.stock ? Object.values(p.stock).reduce((s, v) => s + Number(v || 0), 0) : null);
const isLow = (p) => p.stock && Object.values(p.stock).some((v) => Number(v) <= LOW);

function visible() {
  const q = state.q.toLowerCase();
  return store.products.filter((p) => {
    if (q && !(JSON.stringify(p.name).toLowerCase().includes(q) || p.id.toLowerCase().includes(q))) return false;
    switch (state.filter) {
      case 'set':
      case 'hoodie':
      case 'sirwal':
        return p.type === state.filter;
      case 'other':
        return !['set', 'hoodie', 'sirwal'].includes(p.type);
      case 'out':
        return p.out_of_stock || unitsOf(p) === 0;
      case 'low':
        return p.active && (p.out_of_stock || isLow(p));
      case 'hidden':
        return !p.active;
      default:
        return true;
    }
  });
}

function stockHTML(p) {
  if (p.type === 'custom') return `<small class="muted">${esc(L('حسب الطلب', 'Made to order'))}</small>`;
  if (!p.stock) return `<button class="b b-sm b-ghost" type="button" data-track="${esc(p.id)}">${icon('box')}${esc(L('تتبّع المخزون', 'Track stock'))}</button>`;
  return `<div class="stock-grid">${keysOf(p)
    .map((k) => {
      const v = Number(p.stock[k] ?? 0);
      return `<label class="stock-cell"><span>${k === ONE ? L('الكمية', 'Qty') : k}</span><input type="number" min="0" max="9999" inputmode="numeric" value="${v}" data-stock="${esc(p.id)}" data-key="${esc(k)}" class="${v === 0 ? 'is-zero' : v <= LOW ? 'is-low' : ''}" aria-label="${esc(`${tr(p.name)} ${k}`)}"></label>`;
    })
    .join('')}</div>`;
}

function switches(p) {
  return `<label class="switch" title="${esc(L('يوقف البيع في المتجر ويظهر «نفد»', 'Stops sales and shows “Sold out” in the store'))}"><input type="checkbox" class="is-danger" data-flag="out_of_stock" data-id="${esc(p.id)}" ${p.out_of_stock ? 'checked' : ''}>${esc(L('نفد', 'Sold out'))}</label>
    <label class="switch" title="${esc(L('يظهر في المتجر', 'Shown in the store'))}"><input type="checkbox" data-flag="active" data-id="${esc(p.id)}" ${p.active ? 'checked' : ''}>${esc(L('ظاهر', 'Visible'))}</label>`;
}

function priceHTML(p) {
  return `<div style="display:grid;gap:4px"><input class="in price-in" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(p.price)}" data-price="${esc(p.id)}" aria-label="${esc(L('السعر', 'Price'))}">
    ${p.compare_at_price ? `<small class="muted" style="text-decoration:line-through;text-align:center">${esc(money(p.compare_at_price))}</small>` : ''}</div>`;
}

const thumb = (p) => (p.images?.[0] ? `<img src="${esc(img(p.images[0]))}" alt="" loading="lazy">` : `<span style="display:block;width:44px;height:54px;border-radius:9px;background:var(--yellow)"></span>`);

function tableHTML(list) {
  return `<div class="card" style="padding-top:6px"><div class="t-wrap"><table class="t p-table">
    <thead><tr><th></th><th>${esc(L('المنتج', 'Product'))}</th><th>${esc(L('السعر', 'Price'))}</th><th>${esc(L('المخزون', 'Stock'))}</th><th>${esc(L('الحالة', 'Status'))}</th><th></th></tr></thead>
    <tbody>${list
      .map(
        (p) => `<tr style="${p.active ? '' : 'opacity:.6'}">
        <td>${thumb(p)}</td>
        <td><strong>${esc(tr(p.name))}</strong><br><small class="muted" dir="ltr">${esc(p.id)}</small>${p.stock ? `<br><small class="muted">${esc(L('المجموع', 'Total'))}: <span class="num">${num(unitsOf(p))}</span></small>` : ''}</td>
        <td>${priceHTML(p)}</td>
        <td>${stockHTML(p)}</td>
        <td><div style="display:grid;gap:8px">${switches(p)}</div></td>
        <td><button class="b b-sm b-ghost b-icon" type="button" data-edit="${esc(p.id)}" aria-label="${esc(L('تعديل', 'Edit'))}">${icon('edit')}</button></td>
      </tr>`,
      )
      .join('')}</tbody></table></div></div>`;
}

function cardsHTML(list) {
  return `<div class="p-cards">${list
    .map(
      (p) => `<article class="card p-card2 ${p.active ? '' : 'is-off'}">
      <div class="head">${thumb(p).replace('<img', '<img style="width:54px;height:66px"')}<div><strong style="line-height:1.35">${esc(tr(p.name))}</strong><br><small class="muted">${p.stock ? `${num(unitsOf(p))} ${esc(L('قطعة', 'pcs'))}` : esc(L('بدون تتبّع', 'Not tracked'))}</small></div>
        <button class="b b-sm b-ghost b-icon" type="button" data-edit="${esc(p.id)}" aria-label="${esc(L('تعديل', 'Edit'))}">${icon('edit')}</button></div>
      <div class="spread">${priceHTML(p)}<div class="row">${switches(p)}</div></div>
      ${stockHTML(p)}
    </article>`,
    )
    .join('')}</div>`;
}

/** Image picker state lives in the dialog; returns { html, bind(dialogEl) , value() }. */
function imagePicker(initial) {
  let picked = [...(initial || [])];
  const library = [...new Set(store.products.flatMap((p) => p.images || []))].filter((s) => !/^data:/.test(s) || picked.includes(s));
  const paint = (d) => {
    const all = [...picked, ...library.filter((s) => !picked.includes(s))];
    d.querySelector('[data-imgs]').innerHTML = `${all
      .map((s) => `<button type="button" data-img="${esc(s)}" aria-pressed="${picked.includes(s)}" title="${picked[0] === s ? esc(L('الصورة الرئيسية', 'Main image')) : ''}"><img src="${esc(img(s))}" alt="" loading="lazy">${picked[0] === s ? `<span class="badge" style="position:absolute;top:4px;inset-inline-start:4px;--c:var(--yellow)">1</span>` : ''}</button>`)
      .join('')}<label>${icon('upload')}<span>${esc(L('ارفع صورة', 'Upload'))}</span><input type="file" accept="image/*" hidden data-upload></label>`;
  };
  return {
    html: `<div class="f"><span>${esc(L('الصور — اضغط للاختيار، الأولى هي الرئيسية', 'Images — tap to select; the first is the main one'))}</span><div class="img-picker" data-imgs style="max-height:260px;overflow-y:auto"></div></div>`,
    bind(d) {
      paint(d);
      d.addEventListener('click', (e) => {
        const b = e.target.closest('[data-img]');
        if (!b) return;
        e.preventDefault();
        const s = b.dataset.img;
        picked = picked.includes(s) ? picked.filter((x) => x !== s) : [...picked, s];
        paint(d);
      });
      d.addEventListener('change', async (e) => {
        if (!e.target.matches('[data-upload]') || !e.target.files[0]) return;
        const label = e.target.closest('label');
        label.classList.add('is-busy');
        try {
          const url = await store.api.productsApi.uploadImage(e.target.files[0]);
          picked = [url, ...picked];
          paint(d);
        } catch (ex) {
          bad(ex);
          label.classList.remove('is-busy');
        }
      });
    },
    value: () => picked,
  };
}

async function editProduct(p) {
  const isNew = !p;
  p ||= { id: '', type: 'extra', name: { ar: '', en: '' }, sub: { ar: '', en: '' }, description: { ar: '', en: '' }, price: '', compare_at_price: null, sizes: [], images: [], stock: null, active: true };
  const pics = imagePicker(p.images);
  const v = (o, k) => esc(o?.[k] || '');
  const sizesOn = p.sizes?.length ? p.sizes : [];
  const r = await dialog({
    title: isNew ? L('منتج جديد', 'New product') : tr(p.name),
    wide: true,
    body: `
      <div class="grid-2">
        <label class="f"><span>${esc(L('الاسم بالعربي *', 'Name (Arabic) *'))}</span><input name="name_ar" required value="${v(p.name, 'ar')}"></label>
        <label class="f"><span>${esc(L('الاسم بالإنجليزي', 'Name (English)'))}</span><input name="name_en" dir="ltr" value="${v(p.name, 'en')}"></label>
        <label class="f"><span>${esc(L('وصف قصير بالعربي', 'Short line (Arabic)'))}</span><input name="sub_ar" value="${v(p.sub, 'ar')}"></label>
        <label class="f"><span>${esc(L('وصف قصير بالإنجليزي', 'Short line (English)'))}</span><input name="sub_en" dir="ltr" value="${v(p.sub, 'en')}"></label>
      </div>
      <div class="grid-3">
        <label class="f"><span>${esc(L('السعر (ر.س) *', 'Price (SAR) *'))}</span><input name="price" type="number" min="0" step="0.01" required value="${esc(p.price)}"></label>
        <label class="f"><span>${esc(L('السعر قبل الخصم', 'Compare-at price'))}</span><input name="compare_at_price" type="number" min="0" step="0.01" value="${esc(p.compare_at_price ?? '')}" placeholder="—"></label>
        <label class="f"><span>${esc(L('الترتيب', 'Sort order'))}</span><input name="sort" type="number" step="1" value="${esc(p.sort ?? 500)}"></label>
      </div>
      ${
        p.type === 'set' || p.type === 'custom'
          ? ''
          : `<div class="f"><span>${esc(L('المقاسات (اتركها فاضية لمنتج بمقاس واحد)', 'Sizes (leave empty for one-size)'))}</span><div class="chips">${SIZES.map((s) => `<label class="check chip"><input type="checkbox" name="size_${s}" ${sizesOn.includes(s) ? 'checked' : ''}>${s}</label>`).join('')}</div></div>`
      }
      ${pics.html}
      <div class="grid-2">
        <label class="f"><span>${esc(L('تفاصيل بالعربي', 'Details (Arabic)'))}</span><textarea name="desc_ar">${v(p.description, 'ar')}</textarea></label>
        <label class="f"><span>${esc(L('تفاصيل بالإنجليزي', 'Details (English)'))}</span><textarea name="desc_en" dir="ltr">${v(p.description, 'en')}</textarea></label>
      </div>
      ${!isNew && p.stock ? `<label class="check"><input type="checkbox" name="untrack">${esc(L('أوقف تتبّع المخزون لهذا المنتج', 'Stop tracking stock for this product'))}</label>` : ''}
      ${isNew ? `<label class="f"><span>${esc(L('المعرّف (اختياري، إنجليزي)', 'ID (optional, latin)'))}</span><input name="id" dir="ltr" pattern="[a-z0-9-]{2,40}" placeholder="cap-black"></label>` : ''}`,
    actions: [
      ...(!isNew && !p.builtin ? [{ label: L('حذف', 'Delete'), value: 'delete', cls: 'b-danger' }] : []),
      { label: L('إلغاء', 'Cancel'), value: '', cls: 'b-ghost' },
      { label: isNew ? L('أضف المنتج', 'Add product') : L('حفظ', 'Save'), value: 'ok', cls: 'b-primary', submit: true },
    ],
    onOpen: (d) => pics.bind(d),
  });
  if (!r) return;
  if (r.value === 'delete') {
    if (!(await confirmDialog(L('حذف المنتج نهائيًا؟ الطلبات القديمة ما تتأثر.', 'Delete this product for good? Past orders are kept.'), { danger: true, okLabel: L('حذف', 'Delete') }))) return;
    await busy(null, () => store.api.productsApi.remove(p.id), L('انحذف المنتج', 'Product deleted'));
    await reload(['products']);
    return render({ soft: true, force: true });
  }
  const d = r.data;
  const sizes = p.type === 'set' || p.type === 'custom' ? p.sizes || [] : SIZES.filter((s) => d[`size_${s}`]);
  const patch = {
    name: { ar: d.name_ar.trim(), en: d.name_en.trim() || d.name_ar.trim() },
    sub: { ar: d.sub_ar.trim(), en: d.sub_en.trim() },
    description: d.desc_ar.trim() || d.desc_en.trim() ? { ar: d.desc_ar.trim(), en: d.desc_en.trim() } : null,
    price: Number(d.price),
    compare_at_price: d.compare_at_price === '' ? null : Number(d.compare_at_price),
    sort: Number(d.sort) || 500,
    images: pics.value(),
    sizes,
  };
  if (d.untrack) patch.stock = null;
  else if (p.stock) {
    // Keep stock keys in line with the sizes.
    const keys = sizes.length ? sizes : [ONE];
    patch.stock = Object.fromEntries(keys.map((k) => [k, Number(p.stock[k] ?? 0)]));
  }
  const saved = await busy(null, () => (isNew ? store.api.productsApi.create({ ...patch, ...(d.id ? { id: d.id.trim() } : {}) }) : store.api.productsApi.save(p.id, patch)), isNew ? L('انضاف المنتج', 'Product added') : L('انحفظ', 'Saved'));
  if (saved) {
    await reload(['products']);
    render({ soft: true, force: true });
  }
}

async function trackStock(p) {
  const keys = keysOf(p);
  const r = await dialog({
    title: L('كم القطع المتوفرة؟', 'How many do you have?'),
    body: `<p class="muted">${esc(tr(p.name))}</p><div class="stock-grid" style="gap:10px">${keys
      .map((k) => `<label class="stock-cell"><span>${k === ONE ? L('الكمية', 'Qty') : k}</span><input name="k_${esc(k)}" type="number" min="0" inputmode="numeric" value="0" required style="width:64px;min-height:40px"></label>`)
      .join('')}</div><p class="muted" style="font-size:13px">${esc(L('بعدها كل طلب ينقص المخزون تلقائيًا، والإلغاء يرجّعه. لما يوصل صفر يتوقف البيع لذاك المقاس.', 'From now on every order deducts stock and cancellations add it back. At zero, that size stops selling.'))}</p>`,
    actions: [
      { label: L('إلغاء', 'Cancel'), value: '', cls: 'b-ghost' },
      { label: L('ابدأ التتبّع', 'Start tracking'), value: 'ok', cls: 'b-primary', submit: true },
    ],
  });
  if (!r) return;
  const stock = Object.fromEntries(keys.map((k) => [k, Math.max(0, Number(r.data[`k_${k}`]) || 0)]));
  await save(p.id, { stock }, L('بدأ تتبّع المخزون', 'Stock tracking on'));
  render({ soft: true, force: true });
}

async function save(id, patch, msg = L('انحفظ', 'Saved')) {
  const out = await busy(null, () => store.api.productsApi.save(id, patch), msg);
  if (out) {
    const i = store.products.findIndex((p) => p.id === id);
    if (i >= 0) store.products[i] = out;
  }
  return out;
}

export default {
  render(host, { query, soft }) {
    if (!soft) {
      state.q = query.q || '';
      state.filter = query.filter || '';
    }
    state.view ||= matchMedia('(max-width: 960px)').matches ? 'cards' : 'table';
    const list = visible();
    const sellable = store.products.filter((p) => p.active && p.type !== 'custom');
    const tracked = store.products.filter((p) => p.stock);
    const units = tracked.reduce((s, p) => s + unitsOf(p), 0);
    const value = tracked.reduce((s, p) => s + unitsOf(p) * Number(p.price), 0);
    const soldOut = sellable.filter((p) => p.out_of_stock || unitsOf(p) === 0).length;
    const low = sellable.filter((p) => !p.out_of_stock && isLow(p) && unitsOf(p) !== 0).length;

    const el = mount(
      host,
      `<div class="kpis">
        ${statTile({ label: L('منتجات معروضة', 'Live products'), value: `<span class="num">${num(sellable.length)}</span>`, hint: L(`من ${store.products.length}`, `of ${store.products.length}`) })}
        ${statTile({ label: L('قطع بالمخزون', 'Units in stock'), value: `<span class="num">${num(units)}</span>`, hint: tracked.length ? L(`${tracked.length} منتج متتبّع`, `${tracked.length} tracked`) : L('ما فيه تتبّع للحين', 'Nothing tracked yet') })}
        ${statTile({ label: L('قيمة المخزون', 'Stock value'), value: moneyHTML(value), hint: L('بسعر البيع', 'at retail price') })}
        <button class="card stat" type="button" data-filter="out" style="text-align:start"><span class="stat-label">${esc(L('نفد', 'Sold out'))}</span><span class="stat-value" style="color:${soldOut ? 'var(--bad)' : 'inherit'}">${num(soldOut)}</span><span class="delta">${esc(L(`${low} قارب يخلص`, `${low} running low`))}</span></button>
      </div>
      <div class="toolbar">
        <label class="search grow" style="width:auto"><span class="sr">${esc(L('بحث', 'Search'))}</span>${icon('search')}<input class="in" type="search" data-q value="${esc(state.q)}" placeholder="${esc(L('ابحث عن منتج…', 'Search products…'))}"></label>
        <div class="seg" role="group" aria-label="${esc(L('طريقة العرض', 'View'))}">
          <button type="button" data-view="table" aria-pressed="${state.view === 'table'}">${icon('list')}${esc(L('جدول', 'Table'))}</button>
          <button type="button" data-view="cards" aria-pressed="${state.view === 'cards'}">${icon('board')}${esc(L('بطاقات', 'Cards'))}</button>
        </div>
        <button class="b b-primary" type="button" data-new>${icon('plus')}${esc(L('منتج جديد', 'New product'))}</button>
      </div>
      <div class="chips">${FILTERS.map((f) => `<button class="chip" type="button" data-filter="${f.id}" aria-pressed="${state.filter === f.id}">${esc(L(f.ar, f.en))}</button>`).join('')}</div>
      <div data-list>${list.length ? (state.view === 'cards' ? cardsHTML(list) : tableHTML(list)) : `<div class="card">${empty(L('ما فيه منتجات هنا', 'Nothing here'))}</div>`}</div>`,
    );

    let t;
    el.querySelector('[data-q]').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.q = e.target.value.trim();
        const l = visible();
        el.querySelector('[data-list]').innerHTML = l.length ? (state.view === 'cards' ? cardsHTML(l) : tableHTML(l)) : `<div class="card">${empty(L('ما فيه منتجات هنا', 'Nothing here'))}</div>`;
      }, 140);
    });

    el.addEventListener('click', (e) => {
      const f = e.target.closest('[data-filter]');
      if (f) {
        state.filter = state.filter === f.dataset.filter && f.dataset.filter ? '' : f.dataset.filter;
        history.replaceState(null, '', `#/products${state.filter ? `?filter=${state.filter}` : ''}`);
        return render({ soft: true, force: true });
      }
      const v = e.target.closest('[data-view]');
      if (v) {
        state.view = v.dataset.view;
        return render({ soft: true, force: true });
      }
      if (e.target.closest('[data-new]')) return editProduct(null);
      const ed = e.target.closest('[data-edit]');
      if (ed) return editProduct(store.products.find((p) => p.id === ed.dataset.edit));
      const tr_ = e.target.closest('[data-track]');
      if (tr_) return trackStock(store.products.find((p) => p.id === tr_.dataset.track));
    });

    el.addEventListener('change', async (e) => {
      const t2 = e.target;
      if (t2.matches('[data-flag]')) {
        const k = t2.dataset.flag;
        const out = await save(t2.dataset.id, { [k]: t2.checked }, k === 'out_of_stock' ? (t2.checked ? L('صار «نفد» في المتجر', 'Now “Sold out” in the store') : L('رجع متوفر في المتجر', 'Back on sale')) : t2.checked ? L('ظاهر في المتجر', 'Visible in the store') : L('مخفي من المتجر', 'Hidden from the store'));
        if (!out) t2.checked = !t2.checked;
      } else if (t2.matches('[data-price]')) {
        const v = Number(t2.value);
        if (t2.value === '' || v < 0) return bad(new Error(L('سعر غير صحيح', 'Invalid price')));
        await save(t2.dataset.price, { price: v }, L(`السعر الجديد ${money(v)}`, `New price ${money(v)}`));
      } else if (t2.matches('[data-stock]')) {
        const p = store.products.find((x) => x.id === t2.dataset.stock);
        const v = Math.max(0, Math.round(Number(t2.value) || 0));
        t2.value = v;
        t2.className = v === 0 ? 'is-zero' : v <= LOW ? 'is-low' : '';
        await save(p.id, { stock: { ...p.stock, [t2.dataset.key]: v } }, L('تحدّث المخزون', 'Stock updated'));
      }
    });
    return () => clearTimeout(t);
  },
};

