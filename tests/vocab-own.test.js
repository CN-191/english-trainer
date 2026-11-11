// Eigene Wörter: Speicher im Dokument „vocab-own“, eigene Kategorie mit Schalter, Planung
const OVS = TT.vocabStore;
const ODK = TT.deck;
const NOON_O = new Date(2026, 10, 11, 12, 0).getTime();
const ownEntry = (id, en) => ({ id, en, pos: 'n', level: 'OWN', de: 'x', ex: '', exDe: '', hint: '', emoji: '', exWord: '', book: null, def: '', own: true, sense: '' });
const listEntry = (id, level) => ({ id, en: id.split('-')[0], pos: 'n', level, de: 'x', ex: 'x.', exDe: 'x.', hint: '', emoji: '', exWord: '', book: null, def: '', sense: '' });

test('Eigene Wörter: Standard, alter Stand bleibt gleich, Prüfung verwirft Ungültiges', () => {
  const d = OVS.defaults();
  assert.deepStrictEqual(d.own, {});
  assert.deepStrictEqual(d.ownSet, { t: 0, on: true });
  // Stand der Vorversion (ohne eigene Wörter): alle bisherigen Felder bleiben unverändert
  const old = { cards: { 'about-adj:de': [100, 2.5, 5, 1, 0, 2, 50, 0, 3, 1] }, edits: {}, suspended: {},
    settings: { t: 3, direction: 'de', newPerDay: 50, levels: { A1: false, A2: true, B1: true, B2: true }, order: 'mixed' },
    days: { '2026-11-03': { n: 2, n2: 0, r: 1, ok: 1 } }, book: { t: 4, on: true, unit: 1, lesson: 2 } };
  const again = OVS.sanitize(JSON.parse(JSON.stringify(old)));
  for (const k of Object.keys(old)) assert.deepStrictEqual(again[k], old[k], k);
  const f = { en: 'hike', de: 'wandern', pos: 'v', hint: '', ex: '', exDe: '' };
  const s = OVS.sanitize({ ownSet: { t: 9, on: false }, own: {
    'own_abc123-w': { t: 5, c: 4, f },
    'own_gone12-w': { t: 6, c: 1, f: null },
    'about-adj': { t: 5, c: 4, f },
    'own_bad111-w': { t: 5, c: 4, f: Object.assign({}, f, { en: '  ' }) },
    'own_bad222-w': { t: 5, c: 4, f: Object.assign({}, f, { pos: 'xyz' }) },
    'own_bad333-w': { t: 5, c: 4, f: Object.assign({}, f, { de: 'x'.repeat(501) }) },
  } });
  assert.deepStrictEqual(Object.keys(s.own).sort(), ['own_abc123-w', 'own_gone12-w']);
  assert.deepStrictEqual(s.ownSet, { t: 9, on: false });
  assert.deepStrictEqual(OVS.ownRows(s), [Object.assign({ id: 'own_abc123-w' }, f)]);
});

test('Eigene Wörter: anlegen, ändern, löschen; Karten und Wörter liegen in „vocab-own“', () => {
  const v = OVS.defaults();
  const a = ODK.setOwn(v, null, { en: ' hike ', de: 'wandern', pos: 'v' }, NOON_O);
  assert.ok(/^own_[a-z0-9]{4,24}-w$/.test(a.id), a.id);
  assert.deepStrictEqual(a.docs, ['vocab-own']);
  assert.deepStrictEqual(v.own[a.id], { t: NOON_O, c: NOON_O, f: { en: 'hike', de: 'wandern', pos: 'v', hint: '', ex: '', exDe: '' } });
  assert.deepStrictEqual(OVS.sanitize(v).own[a.id], v.own[a.id], 'angelegtes Wort übersteht die Prüfung');
  ODK.setOwn(v, a.id, { en: 'hike', de: 'wandern gehen', pos: 'v' }, NOON_O + 5);
  assert.strictEqual(v.own[a.id].f.de, 'wandern gehen');
  assert.strictEqual(v.own[a.id].c, NOON_O, 'Reihenfolge bleibt beim Ändern');
  assert.strictEqual(TT.vocabLevel(a.id), 'OWN');
  assert.strictEqual(OVS.docOf('OWN', 'de'), 'vocab-own');
  const r = ODK.answer(v, ownEntry(a.id, 'hike'), 'ed', 3, NOON_O);
  assert.deepStrictEqual(r.docs, ['vocab-own', 'vocab-meta']);
  const part = OVS.part(v, 'vocab-own');
  assert.deepStrictEqual(Object.keys(part.cards), [a.id + ':ed']);
  assert.ok(part.own[a.id] && part.ownSet.on);
  assert.deepStrictEqual(OVS.part(v, 'vocab-B1-de'), { cards: {} });
  assert.deepStrictEqual(ODK.removeOwn(v, a.id, NOON_O + 9), ['vocab-own']);
  assert.deepStrictEqual(v.own[a.id], { t: NOON_O + 9, c: NOON_O, f: null });
  assert.deepStrictEqual(OVS.ownRows(v), []);
  assert.ok(v.cards[a.id + ':ed'], 'Lernstand wird nie gelöscht');
});

test('Eigene Wörter: Zusammenführen pro Wort (neuere Änderung gewinnt, Löschen bleibt), Schalter nach Zeit', () => {
  const f = (de) => ({ en: 'hike', de, pos: 'v', hint: '', ex: '', exDe: '' });
  const A = { cards: {}, own: { 'own_aaaa11-w': { t: 5, c: 1, f: f('alt') }, 'own_bbbb22-w': { t: 9, c: 2, f: null } }, ownSet: { t: 3, on: false } };
  const B = { cards: {}, own: { 'own_aaaa11-w': { t: 7, c: 1, f: f('neu') }, 'own_bbbb22-w': { t: 4, c: 2, f: f('x') }, 'own_cccc33-w': { t: 1, c: 3, f: f('c') } }, ownSet: { t: 2, on: true } };
  const m = OVS.mergePart('vocab-own', A, B);
  assert.deepStrictEqual(m, OVS.mergePart('vocab-own', B, A));
  assert.strictEqual(m.own['own_aaaa11-w'].f.de, 'neu');
  assert.strictEqual(m.own['own_bbbb22-w'].f, null);
  assert.ok(m.own['own_cccc33-w']);
  assert.deepStrictEqual(m.ownSet, { t: 3, on: false });
  // Import (Fortschritts-Code) nimmt eigene Wörter mit
  const v = OVS.defaults();
  OVS.mergeAll(v, { own: B.own, ownSet: { t: 8, on: false } });
  assert.strictEqual(Object.keys(v.own).length, 3);
  assert.deepStrictEqual(v.ownSet, { t: 8, on: false });
});

test('Eigene Wörter: kommen zuerst dran, eigener Schalter unabhängig von den Niveaus', () => {
  const entries = [listEntry('alpha-n', 'A1'), listEntry('beta-n', 'B2'), ownEntry('own_zzzz11-w', 'first'), ownEntry('own_aaaa22-w', 'second')];
  const v = OVS.defaults();
  v.settings.levels = { A1: true, A2: false, B1: false, B2: false };
  v.settings.direction = 'ed';
  v.settings.newPerDay = 10;
  v.book.on = false;
  assert.deepStrictEqual(ODK.plan(v, entries, NOON_O).fresh.map((x) => x.entry.id), ['own_zzzz11-w', 'own_aaaa22-w', 'alpha-n']);
  // alle Niveaus aus: eigene Wörter laufen weiter
  v.settings.levels.A1 = false;
  assert.deepStrictEqual(ODK.plan(v, entries, NOON_O).fresh.map((x) => x.entry.id), ['own_zzzz11-w', 'own_aaaa22-w']);
  // Kategorie aus: weder neu noch Wiederholung
  v.cards['own_zzzz11-w:ed'] = OVS.encode({ due: NOON_O - 86400000, s: 3, d: 5, reps: 3, lapses: 0, state: TT.fsrs.REVIEW, last: NOON_O - 4 * 86400000, step: 0, ivl: 3 }, 1);
  assert.strictEqual(ODK.plan(v, entries, NOON_O).counts.review, 1);
  assert.deepStrictEqual(ODK.setOwnOn(v, false, NOON_O), ['vocab-own']);
  const p = ODK.plan(v, entries, NOON_O);
  assert.deepStrictEqual([p.counts.review, p.counts.fresh], [0, 0]);
  const st = ODK.stats(v, entries, NOON_O);
  assert.deepStrictEqual(st.levels.OWN, { learned: 1, total: 2 });
});

test('Eigene Wörter: Wortliste nimmt sie auf und bleibt dieselbe Liste, solange sich nichts ändert', () => {
  const before = TT.vocabEntries();
  const n = before.length;
  TT.setOwnVocab([{ id: 'own_test11-w', en: 'hike', de: 'wandern', pos: 'v', hint: '', ex: '', exDe: '' }]);
  const withOwn = TT.vocabEntries();
  assert.strictEqual(withOwn.length, n + 1);
  const e = TT.vocabEntry('own_test11-w');
  assert.ok(e.own && e.level === 'OWN' && e.en === 'hike' && e.book === null);
  TT.setOwnVocab([{ id: 'own_test11-w', en: 'hike', de: 'wandern', pos: 'v', hint: '', ex: '', exDe: '' }]);
  assert.strictEqual(TT.vocabEntries(), withOwn, 'gleiche Liste bei gleichem Inhalt');
  TT.setOwnVocab([]);
  assert.strictEqual(TT.vocabEntries().length, n);
  assert.strictEqual(TT.vocabEntry('own_test11-w'), null);
  assert.strictEqual(TT.vocabPosLabel(''), '');
});
