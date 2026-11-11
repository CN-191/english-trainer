// Buch-Wortschatz (StartUp 6): Speicher im Dokument „vocab-book“, Stelle im Buch, Planung
const TTF = TT.fsrs;
const VS = TT.vocabStore;
const DK = TT.deck;
const bcard = (mod, reps) => [100, 2.5, 5, reps || 1, 0, 2, 50, 0, 3, mod];
const NOON_B = new Date(2026, 10, 8, 12, 0).getTime();

// Test-Einträge: Oxford-Wörter mit/ohne Buchstelle und neue Buchwörter (Niveau SU6)
function bookEntry(id, level, u, l, seq) {
  return { id, en: id.split('-')[0], pos: 'n', level, de: 'x', ex: 'x.', exDe: 'x.', hint: '', emoji: '', exWord: '', book: u ? { u, l, seq } : null, def: u ? 'd' : '' };
}

test('Buch: Standard-Stelle, Prüfung der Stelle, alter Stand ohne Buch bleibt gleich', () => {
  assert.deepStrictEqual(VS.defaults().book, { t: 0, on: true, unit: 1, lesson: 1 });
  const s = VS.sanitize({ book: { t: 5, on: false, unit: 3, lesson: 4 } });
  assert.deepStrictEqual(s.book, { t: 5, on: false, unit: 3, lesson: 4 });
  assert.deepStrictEqual(VS.sanitize({ book: { t: -1, on: 'ja', unit: 11, lesson: 0 } }).book, VS.defaultBook());
  // ein Stand der Vorversion (ohne book) verliert nichts
  const old = { cards: { 'about-adj:de': bcard(1) }, edits: {}, suspended: { 'about-adv': { t: 1, on: true } },
    settings: { t: 3, direction: 'de', newPerDay: 50, levels: { A1: false, A2: true, B1: true, B2: true }, order: 'mixed' }, days: { '2026-11-03': { n: 2, n2: 0, r: 1, ok: 1 } } };
  const again = VS.sanitize(JSON.parse(JSON.stringify(old)));
  for (const k of Object.keys(old)) assert.deepStrictEqual(again[k], old[k], k);
});

test('Buch: Karten neuer Buchwörter liegen in „vocab-book“, Oxford-Karten bleiben in ihrem Dokument', () => {
  assert.strictEqual(VS.docOf('SU6', 'ed'), 'vocab-book');
  assert.strictEqual(VS.docOf('SU6', 'de'), 'vocab-book');
  assert.strictEqual(VS.docOf('B1', 'de'), 'vocab-B1-de');
  const v = VS.defaults();
  v.cards['about-adj:de'] = bcard(1);
  v.book = { t: 9, on: true, unit: 1, lesson: 2 };
  assert.deepStrictEqual(VS.part(v, 'vocab-book'), { cards: {}, book: { t: 9, on: true, unit: 1, lesson: 2 } });
  assert.deepStrictEqual(VS.part(v, 'vocab-B1-de'), { cards: { 'about-adj:de': bcard(1) } });
});

test('Buch: Stelle im Buch wird nach Zeitstempel zusammengeführt, Karten pro Eintrag', () => {
  const a = { cards: {}, book: { t: 5, on: true, unit: 1, lesson: 2 } };
  const b = { cards: {}, book: { t: 9, on: true, unit: 1, lesson: 3 } };
  assert.deepStrictEqual(VS.mergePart('vocab-book', a, b).book, b.book);
  assert.deepStrictEqual(VS.mergePart('vocab-book', b, a).book, b.book);
  const v = VS.defaults();
  VS.applyPart(v, 'vocab-book', { cards: {}, book: { t: 9, on: false, unit: 2, lesson: 1 } });
  assert.deepStrictEqual(v.book, { t: 9, on: false, unit: 2, lesson: 1 });
  // eine Vorversion ohne vocab-book: mergeAll mit einem Stand ohne book behält die eigene Stelle
  VS.mergeAll(v, { cards: {} });
  assert.deepStrictEqual(v.book, { t: 9, on: false, unit: 2, lesson: 1 });
});

test('Buch: aktiv bis einschließlich der Stelle, neue Wörter aus dem Buch zuerst und in Buchreihenfolge', () => {
  const entries = [
    bookEntry('alpha-n', 'A1', 0), bookEntry('beta-n', 'B2', 1, 3, 4), bookEntry('gamma-n', 'SU6', 1, 1, 1),
    bookEntry('delta-n', 'SU6', 1, 2, 2), bookEntry('eps-n', 'SU6', 2, 1, 5), bookEntry('zeta-n', 'A1', 1, 1, 0),
  ];
  const v = VS.defaults();
  v.settings.levels = { A1: true, A2: false, B1: false, B2: false };
  v.settings.newPerDay = 10;
  v.settings.direction = 'ed';
  v.book = { t: 1, on: true, unit: 1, lesson: 2 };
  const fresh = DK.plan(v, entries, NOON_B).fresh.map((x) => x.entry.id);
  assert.deepStrictEqual(fresh, ['zeta-n', 'gamma-n', 'delta-n', 'alpha-n']);
  assert.ok(DK.inBook(v, entries[3]) && !DK.inBook(v, entries[1]) && !DK.inBook(v, entries[4]));
  v.book = { t: 2, on: false, unit: 1, lesson: 2 };
  assert.deepStrictEqual(DK.plan(v, entries, NOON_B).fresh.map((x) => x.entry.id).sort(), ['alpha-n', 'zeta-n']);
  v.book = { t: 3, on: true, unit: 2, lesson: 4 };
  assert.strictEqual(DK.plan(v, entries, NOON_B).fresh.length, 6);
});

test('Buch: Bewertung einer neuen Buchkarte landet in „vocab-book“, Statistik zählt Buchwörter', () => {
  const e = bookEntry('gamma-n', 'SU6', 1, 1, 0);
  const v = VS.defaults();
  const r = DK.answer(v, e, 'ed', 3, NOON_B);
  assert.deepStrictEqual(r.docs, ['vocab-book', 'vocab-meta']);
  assert.deepStrictEqual(DK.setBook(v, { lesson: 3 }, NOON_B), ['vocab-book']);
  assert.deepStrictEqual(v.book, { t: NOON_B, on: true, unit: 1, lesson: 3 });
  const st = DK.stats(v, [e, bookEntry('alpha-n', 'A1', 0), bookEntry('eps-n', 'SU6', 2, 1, 1)], NOON_B);
  assert.deepStrictEqual(st.book, { learned: 0, total: 2, reached: 1, reachedLearned: 0 });
  assert.strictEqual(st.levels.SU6.total, 2);
});

test('Buch: Reihenfolge „Nach Niveau“ ist eindeutig (SU6 zuletzt), egal in welcher Reihenfolge die Einträge kommen', () => {
  const entries = [bookEntry('b2word-n', 'B2', 0), bookEntry('su_one-n', 'SU6', 1, 1, 0), bookEntry('a1word-n', 'A1', 0),
    bookEntry('su_two-n', 'SU6', 1, 2, 1), bookEntry('b1word-n', 'B1', 0), bookEntry('a2word-n', 'A2', 0)];
  const a = DK.newOrder(entries, 'level').map((e) => e.level);
  assert.deepStrictEqual(a, ['A1', 'A2', 'B1', 'B2', 'SU6', 'SU6']);
  const b = DK.newOrder(entries.slice().reverse(), 'level').map((e) => e.id);
  assert.deepStrictEqual(b, DK.newOrder(entries, 'level').map((e) => e.id));
});

test('Buch: begonnene Buchwörter werden weiter wiederholt, auch wenn das Buch aus ist', () => {
  const e = bookEntry('gamma-n', 'SU6', 1, 1, 0);
  const v = VS.defaults();
  v.settings.direction = 'ed';
  // gelernte Karte, seit gestern fällig
  v.cards['gamma-n:ed'] = VS.encode({ due: NOON_B - 86400000, s: 3, d: 5, reps: 3, lapses: 0, state: TTF.REVIEW, last: NOON_B - 4 * 86400000, step: 0, ivl: 3 }, 1);
  v.book = { t: 1, on: false, unit: 1, lesson: 1 };
  const p = DK.plan(v, [e], NOON_B);
  assert.strictEqual(p.counts.review, 1);
  assert.strictEqual(p.counts.fresh, 0);
  v.suspended['gamma-n'] = { t: 2, on: true };
  assert.strictEqual(DK.plan(v, [e], NOON_B).counts.review, 0);
});
