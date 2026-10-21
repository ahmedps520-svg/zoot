import '../../styles/anatomy.css';
import { t } from '../core/i18n.js';
import { esc } from '../core/ui.js';

/** Sirwal anatomy (p.55). Points are % of the flat illustration (942×1600). */
export const SIRWAL_POINTS = [
  { x: 50, y: 3.2, side: 'l', label: { ar: 'لسان «زوووط» المنسوج', en: 'Woven «ZOOOT» tongue' } },
  { x: 82, y: 4.5, side: 'r', label: { ar: 'حزام مطاطي + رباط', en: 'Elastic waistband + drawstring' } },
  { x: 66, y: 17, side: 'r', label: { ar: '«زوووط» الكبيرة · أعلى الخلف', en: 'The big «ZOOOT» · top of the back' } },
  { x: 72, y: 41, side: 'r', label: { ar: 'جيب خلفي', en: 'Back pocket' } },
  { x: 50, y: 50, side: 'l', label: { ar: 'منطقة وسطى نازلة (قصّة تقليدية)', en: 'Dropped crotch (traditional cut)' } },
  { x: 24, y: 72, side: 'l', label: { ar: 'ساق واسعة', en: 'Wide leg' } },
  { x: 76, y: 93, side: 'r', label: { ar: 'كف مطاطي عند الكاحل', en: 'Elastic ankle cuff' } },
];

/**
 * Anatomy diagram with leader-line labels (desktop) and numbered pins + list (mobile).
 * The sirwal flat gets the vector «زوووط» and the woven tongue drawn on top.
 */
export function renderAnatomy(host, { points = SIRWAL_POINTS, colorway } = {}) {
  host.innerHTML = `
    <figure class="anatomy">
      <div class="anatomy-figure" ${colorway ? `style="--zl-fill:${colorway.fill};--zl-edge:${colorway.edge};--zl-shadow:${colorway.shadow}"` : ''}>
        <img src="img/products/sirwal-anatomy.webp" width="942" height="1600" alt="${esc(t({ ar: 'رسم تقني لشروال زوووط من الخلف', en: 'Technical flat of the ZOOOT sirwal, back view' }))}" loading="lazy">
        <svg class="anatomy-logo" aria-hidden="true"><use href="#zooot-logo"/></svg>
        <span class="anatomy-tongue" aria-hidden="true"><svg><use href="#zooot-logo"/></svg></span>
        ${points
          .map(
            (p, i) => `
          <button type="button" class="hs hs--${p.side}" style="--x:${p.x};--y:${p.y}" aria-describedby="hs-${i}">
            <span class="hs-dot"><b>${i + 1}</b></span>
            <span class="hs-line" aria-hidden="true"></span>
            <span class="hs-label" id="hs-${i}" role="tooltip">${esc(t(p.label))}</span>
          </button>`,
          )
          .join('')}
      </div>
      <figcaption>
        <ol class="anatomy-list">${points.map((p) => `<li>${esc(t(p.label))}</li>`).join('')}</ol>
      </figcaption>
    </figure>`;
}
