/**
 * Small, dependency-free SVG charts for the dashboard.
 * Mark specs follow the dataviz guidelines: ≤24px bars with 4px rounded data-ends,
 * hairline solid grid, compact ticks, one series colour + one emphasis colour,
 * per-bar hover/focus tooltips with hit targets wider than the marks, and every
 * chart has a table view.
 */
import { compact, esc } from './ui.js';

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/**
 * Column chart. data: [{ label, value, tip, accent? }]
 * Returns a cleanup function.
 */
export function columnChart(host, data, { height = 220, format = String, ariaLabel = '' } = {}) {
  host.classList.add('chart');
  const tip = document.createElement('div');
  tip.className = 'tip';
  const draw = () => {
    const W = Math.max(280, host.clientWidth);
    const m = { t: 22, r: 8, b: 26, l: 40 };
    const iw = W - m.l - m.r;
    const ih = height - m.t - m.b;
    const max = niceMax(Math.max(...data.map((d) => d.value), 0));
    const band = iw / Math.max(1, data.length);
    const bw = Math.max(3, Math.min(24, band * 0.62));
    const y = (v) => m.t + ih - (v / max) * ih;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
    const every = Math.ceil(data.length / Math.max(2, Math.floor(iw / 64)));
    let maxI = -1;
    data.forEach((d, i) => {
      if (d.value > 0 && (maxI < 0 || d.value > data[maxI].value)) maxI = i;
    });
    const bars = data
      .map((d, i) => {
        const cx = m.l + band * i + band / 2;
        const top = y(d.value);
        const h = m.t + ih - top;
        const r = Math.min(4, h);
        const x0 = cx - bw / 2;
        const path =
          h <= 0
            ? ''
            : `M${x0},${m.t + ih} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${m.t + ih} Z`;
        return `<rect class="hit" x="${m.l + band * i}" y="${m.t}" width="${band}" height="${ih}" tabindex="0" data-i="${i}" aria-label="${esc(`${d.label}: ${format(d.value)}`)}"/>
          <path class="bar${d.accent ? ' accent' : ''}" d="${path}"/>
          ${i === maxI ? `<text class="val" x="${cx}" y="${top - 6}" text-anchor="middle">${esc(compact(d.value))}</text>` : ''}
          ${i % every === 0 ? `<text class="ax" x="${cx}" y="${height - 6}" text-anchor="middle">${esc(d.label)}</text>` : ''}`;
      })
      .join('');
    host.innerHTML = `<svg viewBox="0 0 ${W} ${height}" width="${W}" height="${height}" role="img" aria-label="${esc(ariaLabel)}">
      <g class="grid">${ticks.map((t) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}</g>
      <g>${ticks.map((t) => `<text class="ax" x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${compact(t)}</text>`).join('')}</g>
      <g>${bars}</g>
    </svg>`;
    host.append(tip);
  };
  const show = (e) => {
    const hit = e.target.closest?.('.hit');
    if (!hit) return;
    const d = data[Number(hit.dataset.i)];
    const r = hit.getBoundingClientRect();
    const hr = host.getBoundingClientRect();
    tip.innerHTML = `<strong>${esc(format(d.value))}</strong>${esc(d.tip || d.label)}`;
    tip.style.left = `${r.left - hr.left + r.width / 2}px`;
    const br = hit.nextElementSibling.getBoundingClientRect();
    tip.style.top = `${Math.max(14, (br.height ? br.top : r.bottom) - hr.top)}px`;
    tip.classList.add('on');
  };
  const hide = () => tip.classList.remove('on');
  host.addEventListener('pointermove', show);
  host.addEventListener('focusin', show);
  host.addEventListener('pointerleave', hide);
  host.addEventListener('focusout', hide);
  draw();
  const ro = new ResizeObserver(() => draw());
  ro.observe(host);
  return () => ro.disconnect();
}

/** Horizontal bar list (HTML) — one series, value at the tip, optional emphasis. */
export function hbars(rows, { format = String, max } = {}) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return `<div class="hbars">${rows
    .map((r) => {
      const tag = r.href ? 'a' : r.action ? 'button' : 'div';
      const attrs = r.href ? `href="${esc(r.href)}"` : r.action ? `type="button" data-action="${esc(r.action)}"` : '';
      return `<${tag} class="hbar" ${attrs} title="${esc(`${r.label}: ${format(r.value)}`)}">
        <span>${r.swatch ? `<span class="badge" style="--c:${r.swatch};padding:0;background:none"><i></i></span> ` : ''}${esc(r.label)}</span>
        <span class="num">${esc(format(r.value))}</span>
        <span class="hbar-track"><span class="hbar-fill${r.accent ? ' accent' : ''}" style="--w:${Math.max(0, (r.value / top) * 100).toFixed(1)}%"></span></span>
      </${tag}>`;
    })
    .join('')}</div>`;
}

/** Sparkline: de-emphasis line, the latest point in the accent colour. */
export function sparkline(values) {
  if (!values.length) return '';
  const W = 160;
  const H = 32;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * (W - 6) + 3, H - 4 - (v / max) * (H - 8)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d}" fill="none" stroke="#b9b1a3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${lx}" cy="${ly}" r="4" fill="var(--chart-accent)" stroke="#fff" stroke-width="2"/>
  </svg>`;
}

/** Accessible table twin for a chart. */
export function tableView(rows, { head = ['', ''], format = String } = {}) {
  return `<div class="t-wrap"><table class="t"><thead><tr><th>${esc(head[0])}</th><th class="end">${esc(head[1])}</th></tr></thead><tbody>${rows
    .map((r) => `<tr><td>${esc(r.label)}</td><td class="end num">${esc(format(r.value))}</td></tr>`)
    .join('')}</tbody></table></div>`;
}
