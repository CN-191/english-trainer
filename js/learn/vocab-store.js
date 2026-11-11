(function (TT) {
  'use strict';

  // Lernstand der Vokabeln: FSRS-Zustand pro Karte, eigene Bearbeitungen, ausgesetzte Wörter,
  // Einstellungen und Tageszähler. In der Cloud auf 10 Dokumente verteilt (je Niveau und Richtung
  // eins für die Karten, dazu Bearbeitungen und „meta“). Zusammenführung pro Eintrag: der neuere gewinnt.
  // Dazu „vocab-book“: Karten der neuen Buchwörter (Niveau SU6, beide Richtungen) und die Stelle im Buch.
  // Ältere App-Versionen kennen dieses Dokument nicht und lassen es deshalb unangetastet.

  const KEY = (TT.storageNs || '') + 'tenseTrainer.vocab.v1';
  const LEVELS = ['A1', 'A2', 'B1', 'B2'];
  const DIRS = ['ed', 'de'];
  const DOCS = [];
  for (const lv of LEVELS) for (const d of DIRS) DOCS.push('vocab-' + lv + '-' + d);
  DOCS.push('vocab-edits', 'vocab-meta', 'vocab-book');
  const BOOK_DOC = 'vocab-book';
  const BOOK_LEVEL = 'SU6';
  const BOOK_UNITS = 10;
  const BOOK_LESSONS = 4;
  const EDIT_FIELDS = ['de', 'hint', 'ex', 'exDe', 'emoji'];
  const MIN = 60000;
  const CARD_KEY = /^[a-z0-9_]+-[a-z_]+:(ed|de)$/;
  const ENTRY_ID = /^[a-z0-9_]+-[a-z_]+$/;
  const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
  const BAD_KEYS = ['__proto__', 'constructor', 'prototype'];
  const MAX_T = 4e12; // Zeitstempel-Obergrenze (Jahr 2096): eine falsch gehende Uhr darf keinen Eintrag für immer festschreiben
  const MAX_DAYS = 36500;

  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
  const isCount = (v) => Number.isInteger(v) && v >= 0;
  const isTime = (v) => isNum(v) && v >= 0 && v <= MAX_T;
  const okKey = (k) => !BAD_KEYS.includes(k);
  const r3 = (x) => Math.round(x * 1000) / 1000;

  function defaultSettings() {
    return { t: 0, direction: 'both', newPerDay: 20, levels: { A1: true, A2: true, B1: true, B2: true }, order: 'level' };
  }

  // Stelle im Buch StartUp 6 (einschließlich): Wörter bis hier werden eingeplant
  function defaultBook() {
    return { t: 0, on: true, unit: 1, lesson: 1 };
  }

  function defaults() {
    return { cards: {}, edits: {}, suspended: {}, settings: defaultSettings(), days: {}, book: defaultBook() };
  }

  // Karte kompakt: [fällig(Min), Stabilität, Schwierigkeit, Wiederholungen, Vergessen, Status,
  // zuletzt(Min), Lernschritt, Abstand(Tage), geändert(ms)]. „geändert“ entscheidet beim Zusammenführen.
  function encode(c, mod) {
    return [Math.round(c.due / MIN), r3(c.s), r3(c.d), c.reps, c.lapses, c.state, Math.round(c.last / MIN), c.step, c.ivl, mod];
  }

  function decode(a) {
    return { due: a[0] * MIN, s: a[1], d: a[2], reps: a[3], lapses: a[4], state: a[5], last: a[6] * MIN, step: a[7], ivl: a[8] };
  }

  const modOf = (a) => a[9];

  function validCard(a) {
    return Array.isArray(a) && a.length === 10 && a.every(isNum) && [0, 1, 2, 3].includes(a[5]) &&
      a[0] >= 0 && a[0] <= MAX_T / MIN && a[6] >= 0 && a[6] <= MAX_T / MIN && isTime(a[9]) &&
      a[1] >= 0 && a[1] <= MAX_DAYS && a[2] >= 0 && a[2] <= 10 &&
      isCount(a[3]) && isCount(a[4]) && isCount(a[7]) && isCount(a[8]) && a[8] <= MAX_DAYS;
  }

  function sanitize(obj) {
    const out = defaults();
    const src = isObj(obj) ? obj : {};
    if (isObj(src.cards)) {
      for (const k of Object.keys(src.cards)) if (okKey(k) && CARD_KEY.test(k) && validCard(src.cards[k])) out.cards[k] = src.cards[k].slice();
    }
    if (isObj(src.edits)) {
      for (const k of Object.keys(src.edits)) {
        const e = src.edits[k];
        if (!okKey(k) || !ENTRY_ID.test(k) || !isObj(e) || !isTime(e.t)) continue;
        if (e.f === null) {
          out.edits[k] = { t: e.t, f: null };
          continue;
        }
        if (!isObj(e.f) || !EDIT_FIELDS.every((n) => typeof e.f[n] === 'string' && e.f[n].length <= 500)) continue;
        if (!e.f.de.trim() || !e.f.ex.trim()) continue;
        const f = {};
        for (const n of EDIT_FIELDS) f[n] = e.f[n];
        out.edits[k] = { t: e.t, f };
      }
    }
    if (isObj(src.suspended)) {
      for (const k of Object.keys(src.suspended)) {
        const s = src.suspended[k];
        if (okKey(k) && ENTRY_ID.test(k) && isObj(s) && isTime(s.t) && typeof s.on === 'boolean') out.suspended[k] = { t: s.t, on: s.on };
      }
    }
    const st = isObj(src.settings) ? src.settings : {};
    if (isTime(st.t)) out.settings.t = st.t;
    if (['both', 'ed', 'de'].includes(st.direction)) out.settings.direction = st.direction;
    if (isCount(st.newPerDay) && st.newPerDay <= 1e9) out.settings.newPerDay = st.newPerDay;
    if (isObj(st.levels)) for (const lv of LEVELS) if (typeof st.levels[lv] === 'boolean') out.settings.levels[lv] = st.levels[lv];
    if (['level', 'mixed'].includes(st.order)) out.settings.order = st.order;
    if (isObj(src.days)) {
      for (const k of Object.keys(src.days)) {
        const d = src.days[k];
        if (!okKey(k) || !DAY_KEY.test(k) || !isObj(d)) continue;
        out.days[k] = { n: isCount(d.n) ? d.n : 0, n2: isCount(d.n2) ? d.n2 : 0, r: isCount(d.r) ? d.r : 0, ok: isCount(d.ok) ? d.ok : 0 };
      }
    }
    const b = isObj(src.book) ? src.book : {};
    if (isTime(b.t)) out.book.t = b.t;
    if (typeof b.on === 'boolean') out.book.on = b.on;
    if (Number.isInteger(b.unit) && b.unit >= 1 && b.unit <= BOOK_UNITS) out.book.unit = b.unit;
    if (Number.isInteger(b.lesson) && b.lesson >= 1 && b.lesson <= BOOK_LESSONS) out.book.lesson = b.lesson;
    return out;
  }

  const docOf = (level, dir) => (level === BOOK_LEVEL ? BOOK_DOC : 'vocab-' + level + '-' + dir);

  // Dokument, in dem eine Karte liegt (über das Niveau laut Wortliste), sonst null.
  function cardDoc(cardKey) {
    const [id, dir] = cardKey.split(':');
    const lv = TT.vocabLevel(id);
    return lv ? docOf(lv, dir) : null;
  }

  // Der Teil des Stands, der in Dokument `name` gehört.
  function part(vocab, name) {
    if (name === 'vocab-edits') return { edits: vocab.edits };
    if (name === 'vocab-meta') return { suspended: vocab.suspended, settings: vocab.settings, days: vocab.days };
    const cards = {};
    for (const k of Object.keys(vocab.cards)) if (cardDoc(k) === name) cards[k] = vocab.cards[k];
    return name === BOOK_DOC ? { cards, book: vocab.book } : { cards };
  }

  // Ersetzt den Teil `name` im Stand durch obj (wird vorher geprüft).
  function applyPart(vocab, name, obj) {
    const clean = sanitize(obj);
    if (name === 'vocab-edits') {
      vocab.edits = clean.edits;
    } else if (name === 'vocab-meta') {
      vocab.suspended = clean.suspended;
      vocab.settings = clean.settings;
      vocab.days = clean.days;
    } else {
      for (const k of Object.keys(vocab.cards)) if (cardDoc(k) === name) delete vocab.cards[k];
      for (const k of Object.keys(clean.cards)) if (cardDoc(k) === name) vocab.cards[k] = clean.cards[k];
      if (name === BOOK_DOC) vocab.book = clean.book;
    }
  }

  // Pro Schlüssel gewinnt der neuere Wert; bei Gleichstand entscheidet der Inhalt (gleiches Ergebnis auf allen Geräten).
  function pickNewer(a, b, time) {
    const out = Object.assign({}, a);
    for (const k of Object.keys(b)) {
      if (!(k in out)) out[k] = b[k];
      else if (time(b[k]) > time(out[k])) out[k] = b[k];
      else if (time(b[k]) === time(out[k]) && JSON.stringify(b[k]) > JSON.stringify(out[k])) out[k] = b[k];
    }
    return out;
  }

  function mergeDays(a, b) {
    const out = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const x = a[k] || {};
      const y = b[k] || {};
      out[k] = { n: Math.max(x.n || 0, y.n || 0), n2: Math.max(x.n2 || 0, y.n2 || 0), r: Math.max(x.r || 0, y.r || 0), ok: Math.max(x.ok || 0, y.ok || 0) };
    }
    return out;
  }

  // Zwei Stände eines Dokuments zusammenführen (Reihenfolge egal, mehrfach anwendbar).
  function mergePart(name, a, b) {
    const A = sanitize(a);
    const B = sanitize(b);
    if (name === 'vocab-edits') return { edits: pickNewer(A.edits, B.edits, (e) => e.t) };
    if (name === 'vocab-meta') {
      const settings = B.settings.t > A.settings.t || (B.settings.t === A.settings.t && JSON.stringify(B.settings) > JSON.stringify(A.settings)) ? B.settings : A.settings;
      return { suspended: pickNewer(A.suspended, B.suspended, (e) => e.t), settings, days: mergeDays(A.days, B.days) };
    }
    const cards = pickNewer(A.cards, B.cards, modOf);
    if (name !== BOOK_DOC) return { cards };
    const book = B.book.t > A.book.t || (B.book.t === A.book.t && JSON.stringify(B.book) > JSON.stringify(A.book)) ? B.book : A.book;
    return { cards, book };
  }

  // Importierten Stand (z. B. aus dem Fortschritts-Code) mit dem aktuellen zusammenführen.
  function mergeAll(vocab, imported) {
    const other = sanitize(imported);
    for (const name of DOCS) applyPart(vocab, name, mergePart(name, part(vocab, name), part(other, name)));
  }

  function load() {
    try {
      const raw = globalThis.localStorage.getItem(KEY);
      return raw ? sanitize(JSON.parse(raw)) : defaults();
    } catch (e) {
      return defaults();
    }
  }

  function save(vocab) {
    try {
      globalThis.localStorage.setItem(KEY, JSON.stringify(vocab));
      return true;
    } catch (e) {
      return false;
    }
  }

  TT.vocabStore = {
    KEY, LEVELS, DIRS, DOCS, EDIT_FIELDS, BOOK_DOC, BOOK_LEVEL, BOOK_UNITS, BOOK_LESSONS,
    defaults, defaultBook, sanitize, encode, decode, modOf, docOf, cardDoc, part, applyPart, mergePart, mergeAll, load, save,
  };
})(globalThis.TT = globalThis.TT || {});
