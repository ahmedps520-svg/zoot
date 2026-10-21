import { CONFIG, LOOKS, STATEMENTS, COLORWAYS, byId } from '../data.js';
import { formatPrice, t, UI, ui } from '../core/i18n.js';
import { esc } from '../core/ui.js';
import { addToCart } from '../core/ui.js';

export const TYPE_LABEL = { set: UI.typeSet, hoodie: UI.typeHoodie, sirwal: UI.typeSirwal };

export function productCode(p) {
  if (p.type === 'set') return `L${byId(LOOKS, p.ref).n}`;
  if (p.type === 'hoodie') return `S${byId(STATEMENTS, p.ref).n}`;
  return `B0${COLORWAYS.findIndex((c) => c.id === p.ref) + 1}`;
}

export function productCard(p, { quick = true } = {}) {
  const name = t(p.name);
  const quickHtml =
    p.type === 'set'
      ? `<div class="p-quick"><a class="btn btn--sm btn--block" href="product.html?id=${p.id}">${esc(ui('pickSizes'))}</a></div>`
      : `<div class="p-quick" role="group" aria-label="${esc(ui('quickAdd'))}"><span class="p-quick-label">${esc(ui('quickAdd'))} · ${esc(ui('size'))}</span>${CONFIG.sizes
          .map((s) => `<button type="button" data-quick="${p.id}" data-size="${s}">${s}</button>`)
          .join('')}</div>`;
  return `
  <article class="p-card" data-id="${p.id}" data-type="${p.type}" data-price="${p.price}">
    <div class="p-media">
      <img src="${p.imgs[0]}" alt="${esc(name)}" loading="lazy" decoding="async">
      ${p.imgs[1] ? `<img src="${p.imgs[1]}" alt="" loading="lazy" decoding="async">` : ''}
      <div class="p-badges"><span class="tag ${p.type === 'set' ? 'tag--yellow' : p.type === 'hoodie' ? 'tag--ink' : ''}">${esc(t(TYPE_LABEL[p.type]))}</span><span class="p-num">${productCode(p)}</span></div>
      ${quick ? quickHtml : ''}
    </div>
    <div class="p-info">
      <h3 class="p-name">${esc(name)}</h3>
      <span class="p-price">${formatPrice(p.price)}</span>
      <p class="p-sub">${esc(t(p.sub))}</p>
      <span class="sw-row" aria-hidden="true">${p.swatches.map((c) => `<i class="sw" style="--c:${c}"></i>`).join('')}</span>
    </div>
    <a class="p-link" href="product.html?id=${p.id}" aria-label="${esc(name)}" data-cursor="شوفها" data-cursor-en="VIEW"></a>
  </article>`;
}

/** Delegated quick-add handler for any grid of product cards. */
export function bindQuickAdd(root, products) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-quick]');
    if (!b) return;
    e.preventDefault();
    const p = products.find((x) => x.id === b.dataset.quick);
    if (!p) return;
    addToCart({ pid: p.id, name: p.name, img: p.imgs[0], price: p.price, options: [{ label: UI.size, value: b.dataset.size }] });
  });
}
