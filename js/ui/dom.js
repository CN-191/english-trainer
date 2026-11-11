(function (TT) {
  'use strict';

  function append(el, children) {
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
  }

  function h(tag, attrs, ...children) {
    const [name, ...classes] = tag.split('.');
    const el = document.createElement(name || 'div');
    if (classes.length) el.className = classes.join(' ');
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    append(el, children);
    return el;
  }

  const SVG = (inner) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  const ICONS = {
    start: SVG('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>'),
    ueben: SVG('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
    grammatik: SVG('<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5V4.5"/>'),
    statistik: SVG('<path d="M5 20V11"/><path d="M12 20V4"/><path d="M19 20v-6"/>'),
    gear: SVG('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
    close: SVG('<path d="M6 6l12 12M18 6 6 18"/>'),
    vokabeln: SVG('<rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>'),
    undo: SVG('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  };

  const COL_SHORT = { simple: 'Simple', progressive: 'Progr.', perfect: 'Perfect', 'perfect-progressive': 'Perf. Progr.' };

  const ui = (TT.ui = TT.ui || {});

  ui.plural = (n, singular, plural) => n + ' ' + (n === 1 ? singular : plural);

  ui.icon = (name) => h('span', { html: ICONS[name], 'aria-hidden': 'true' });

  ui.page = (...children) => h('main.page', null, children);

  ui.header = (title, o = {}) =>
    h('header.page-header', null,
      o.back ? h('a.back-link', { href: o.back }, '‹ ' + (o.backLabel || 'Zurück')) : null,
      h('div.page-header-row', null, h('h1', null, title), o.right || null),
      o.subtitle ? h('p.page-subtitle', null, o.subtitle) : null);

  ui.group = (title, children, o = {}) =>
    h('section.group', null,
      title ? h('h2.group-title', null, title) : null,
      h('div.group-body' + (o.plain ? '.plain' : ''), null, children),
      o.footer ? h('p.group-footer', null, o.footer) : null);

  ui.row = (o) => {
    const tag = (o.href ? 'a.row' : o.onclick ? 'button.row' : 'div.row') + (o.danger ? '.danger' : '');
    return h(tag, { href: o.href, onclick: o.onclick, type: o.onclick && !o.href ? 'button' : null, disabled: o.disabled },
      o.lead || null,
      h('span.row-main', null, h('span.row-title', null, o.title), o.subtitle ? h('span.row-sub', null, o.subtitle) : null),
      o.right !== undefined && o.right !== null ? h('span.row-right', null, o.right) : null,
      (o.href || o.onclick) && !o.noChevron ? h('span.chevron', { 'aria-hidden': 'true' }, '›') : null);
  };

  ui.button = (label, o = {}) =>
    h('button.btn.btn-' + (o.kind || 'primary') + (o.small ? '.btn-small' : ''), { type: 'button', onclick: o.onclick, disabled: o.disabled }, label);

  ui.segmented = (options, value, onchange) => {
    const el = h('div.seg', { role: 'radiogroup' });
    const buttons = options.map(([val, label]) => {
      const b = h('button.seg-item', { type: 'button', role: 'radio', 'data-value': String(val) }, label);
      b.addEventListener('click', () => {
        set(val);
        onchange(val);
      });
      el.appendChild(b);
      return b;
    });
    function set(v) {
      for (const b of buttons) {
        const on = b.dataset.value === String(v);
        b.classList.toggle('active', on);
        b.setAttribute('aria-checked', String(on));
      }
    }
    set(value);
    return el;
  };

  ui.toggle = (checked, onchange, label) => {
    const input = h('input.switch', { type: 'checkbox', role: 'switch', 'aria-label': label });
    input.checked = !!checked;
    input.addEventListener('change', () => onchange(input.checked));
    return input;
  };

  ui.bar = (value) => h('div.bar', null, h('div.bar-fill', { style: { width: Math.round(Math.max(0, Math.min(1, value)) * 100) + '%' } }));

  ui.toast = (msg) => {
    const el = h('div.toast', { role: 'status' }, msg);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  };

  // Zweistufige Bestätigung ohne confirm() (im Artifact-Frame evtl. blockiert):
  // 1. Tippen ändert den Text in die Frage, 2. Tippen (innerhalb von 4 s) führt aus.
  // o.before(): false bricht ab · o.needed(): false führt sofort aus · o.onArm(): nach dem ersten Tippen
  // · o.swapText: false lässt den Text unverändert (z. B. Icon-Buttons)
  ui.confirmTap = (button, question, onConfirm, o = {}) => {
    const labelEl = o.swapText === false ? null : button.querySelector('.row-title') || button;
    const original = labelEl ? labelEl.textContent : '';
    let timer = null;
    const reset = () => {
      clearTimeout(timer);
      timer = null;
      button.classList.remove('confirming');
      if (labelEl) labelEl.textContent = original;
    };
    button.addEventListener('click', () => {
      if (o.before && o.before() === false) return;
      if (timer) {
        reset();
        onConfirm();
        return;
      }
      if (o.needed && !o.needed()) {
        onConfirm();
        return;
      }
      button.classList.add('confirming');
      if (labelEl) labelEl.textContent = question;
      if (o.onArm) o.onArm();
      timer = setTimeout(reset, 4000);
    });
    return button;
  };

  ui.tenseGrid = (tileFn) => {
    const grid = h('div.tgrid');
    grid.appendChild(h('div'));
    for (const c of TT.COLS) grid.appendChild(h('div.tgrid-colhead', null, COL_SHORT[c]));
    for (const r of TT.ROWS) {
      grid.appendChild(h('div.tgrid-rowhead.row-' + r, null, TT.ROW_LABELS[r]));
      for (const c of TT.COLS) {
        const t = TT.TENSES.find((x) => x.row === r && x.col === c);
        const o = tileFn(t) || {};
        grid.appendChild(
          h('button.tile.row-' + r + (o.selected ? '.selected' : '') + (o.cls ? '.' + o.cls : ''),
            { type: 'button', onclick: o.onclick, disabled: o.disabled, 'data-tense': t.id, 'aria-pressed': o.selected === undefined ? null : String(!!o.selected) },
            h('span', null, t.name), o.sub ? h('span.tile-sub', null, o.sub) : null, o.extra || null));
      }
    }
    return grid;
  };

  ui.sentence = (segments, o = {}) => {
    const p = h('p.sentence');
    for (const s of segments) {
      if (s.t === 'signal' && o.signals) p.appendChild(h('span.signal', null, s.v));
      else if (s.t === 'verb' && o.verbs === 'mark') p.appendChild(h('span.verb', null, s.v));
      else p.appendChild(document.createTextNode(s.v));
    }
    return p;
  };

  TT.h = h;
  TT.screens = TT.screens || {};
})(globalThis.TT = globalThis.TT || {});
