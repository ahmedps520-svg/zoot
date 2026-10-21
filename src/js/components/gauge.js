/**
 * Draggable mood meter, drawn after statement S04 «عدّاد المزاج».
 * Value 0–100 maps the needle across a 180° dial (left → right).
 */
const CX = 200;
const CY = 215;
const R = 150;

const polar = (deg, r = R) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
};
const arc = (from, to, r = R) => {
  const [x1, y1] = polar(from, r);
  const [x2, y2] = polar(to, r);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};

export function createGauge(host, { value = 90, segments, onChange } = {}) {
  const colors = segments || ['#1f4bff', '#22d3ee', '#ffd21f', '#e5197f'];
  const step = 180 / colors.length;
  const segs = colors
    .map((c, i) => {
      const from = 180 - i * step - (i ? 0.6 : 0);
      const to = 180 - (i + 1) * step + (i < colors.length - 1 ? 0.6 : 0);
      return `<path d="${arc(from, to)}" stroke="#0d0d0d" stroke-width="58" fill="none"/><path d="${arc(from - 0.9, to + 0.9)}" stroke="${c}" stroke-width="48" fill="none"/>`;
    })
    .join('');
  const ticks = Array.from({ length: 31 }, (_, i) => {
    const d = 180 - i * 6;
    const [x1, y1] = polar(d, R - 40);
    const [x2, y2] = polar(d, R - (i % 5 ? 48 : 56));
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#0d0d0d" stroke-width="${i % 5 ? 2 : 3.5}" stroke-linecap="round"/>`;
  }).join('');
  host.innerHTML = `
    <svg viewBox="0 0 400 250" aria-hidden="true">
      <g>${segs}</g>
      <g opacity=".8">${ticks}</g>
      <g class="g-needle" style="transform-origin:${CX}px ${CY}px">
        <path d="M${CX - 7} ${CY} L${CX} ${CY - R + 52} L${CX + 7} ${CY} Z" fill="#0d0d0d"/>
      </g>
      <circle cx="${CX}" cy="${CY}" r="19" fill="#f2ebdf" stroke="#0d0d0d" stroke-width="6"/>
      <circle cx="${CX}" cy="${CY}" r="5" fill="#e5197f"/>
    </svg>`;
  const needle = host.querySelector('.g-needle');
  const svg = host.querySelector('svg');
  let v = value;

  const set = (next, emit = true) => {
    v = Math.max(0, Math.min(100, next));
    needle.style.transform = `rotate(${(v / 100) * 180 - 90}deg)`;
    host.setAttribute('aria-valuenow', String(Math.round(v)));
    if (emit) onChange?.(v);
  };

  const fromPointer = (e) => {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 400 - CX;
    const y = CY - ((e.clientY - r.top) / r.height) * 250;
    let deg = (Math.atan2(Math.max(y, -40), x) * 180) / Math.PI;
    if (deg < 0) deg = x < 0 ? 180 : 0;
    set(((180 - deg) / 180) * 100);
  };

  let dragging = false;
  host.addEventListener('pointerdown', (e) => {
    dragging = true;
    host.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  host.addEventListener('pointermove', (e) => dragging && fromPointer(e));
  const stop = () => (dragging = false);
  host.addEventListener('pointerup', stop);
  host.addEventListener('pointercancel', stop);
  host.addEventListener('keydown', (e) => {
    const map = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 17, PageDown: -17 };
    if (e.key in map) set(v + map[e.key]);
    else if (e.key === 'Home') set(0);
    else if (e.key === 'End') set(100);
    else return;
    e.preventDefault();
  });

  set(v, false);
  return { set, get value() { return v; } };
}
