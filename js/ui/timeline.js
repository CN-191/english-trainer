(function (TT) {
  'use strict';

  const W = 320;
  const H = 64;
  const Y = 34;
  const PAD = 14;
  const x = (p) => Math.round((PAD + (p / 100) * (W - 2 * PAD)) * 10) / 10;

  function timelineSvg(id) {
    const t = TT.tense(id);
    const tl = t.timeline;
    const p = [];
    p.push(`<line class="axis" x1="${x(0)}" y1="${Y}" x2="${x(100)}" y2="${Y}" stroke-width="2"/>`);
    p.push(`<path class="axis" d="M${x(100) - 6} ${Y - 5} L${x(100)} ${Y} L${x(100) - 6} ${Y + 5}" fill="none" stroke-width="2"/>`);
    p.push(`<text class="axis-label" x="${x(0)}" y="${H - 4}">Vergangenheit</text>`);
    p.push(`<text class="axis-label" x="${x(100)}" y="${H - 4}" text-anchor="end">Zukunft</text>`);
    p.push(`<line class="now" x1="${x(50)}" y1="${Y - 16}" x2="${x(50)}" y2="${Y + 10}" stroke-width="2"/>`);
    p.push(`<text class="now-label" x="${x(50)}" y="${Y - 20}" text-anchor="middle">jetzt</text>`);
    if (tl.ref !== undefined) {
      p.push(`<line class="ref" x1="${x(tl.ref)}" y1="${Y - 14}" x2="${x(tl.ref)}" y2="${Y + 10}" stroke-width="1.5"/>`);
    }
    if (tl.habit) {
      for (let q = 6; q <= 94; q += 11) p.push(`<circle cx="${x(q)}" cy="${Y}" r="4" fill="currentColor"/>`);
    }
    for (const [a, b] of tl.bars || []) {
      p.push(`<rect x="${x(a)}" y="${Y - 5}" width="${x(b) - x(a)}" height="10" rx="5" fill="currentColor" opacity="0.85"/>`);
    }
    for (const q of tl.dots || []) {
      p.push(`<circle cx="${x(q)}" cy="${Y}" r="6" fill="currentColor" stroke="var(--card)" stroke-width="2"/>`);
    }
    if (tl.arc) {
      const [a, b] = tl.arc;
      p.push(`<path d="M${x(a)} ${Y - 8} Q ${(x(a) + x(b)) / 2} ${Y - 26} ${x(b)} ${Y - 8}" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"/>`);
    }
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Zeitstrahl ${t.name}">${p.join('')}</svg>`;
  }

  TT.timelineSvg = timelineSvg;
  TT.timeline = (id) => TT.h('div.tl.row-' + TT.tense(id).row, { html: timelineSvg(id) });
})(globalThis.TT = globalThis.TT || {});
