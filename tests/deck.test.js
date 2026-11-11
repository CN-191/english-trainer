const D = TT.deck;
const FS = TT.fsrs;
const MINUTE = 60000;

// Test-Einträge aus der echten Wortliste (Inhalte sind für die Planung egal)
function entriesOf(n, level) {
  return TT.VOCAB_LIST.filter((r) => !level || r[3] === level).slice(0, n)
    .map(([id, en, pos, lv]) => ({ id, en, pos, level: lv, de: 'x', ex: en + '.', exDe: 'x.', hint: '', emoji: '', exWord: '' }));
}
function deck(settings) {
  const v = TT.vocabStore.defaults();
  Object.assign(v.settings, settings || {});
  return v;
}
const NOON = new Date(2026, 10, 3, 12, 0).getTime();

test('Lerntag beginnt um 4 Uhr und ist sommerzeitfest', () => {
  assert.strictEqual(D.dayOf(new Date(2026, 10, 3, 3, 59).getTime()) + 1, D.dayOf(new Date(2026, 10, 3, 4, 0).getTime()));
  assert.strictEqual(D.dayStart(D.dayOf(NOON)), new Date(2026, 10, 3, 4, 0).getTime());
  assert.strictEqual(D.dayOf(new Date(2026, 2, 29, 12).getTime()) - D.dayOf(new Date(2026, 2, 28, 12).getTime()), 1);
  assert.strictEqual(D.dayKey(D.dayOf(NOON)), '2026-11-03');
});

test('Planung: Tageslimit pro Wort, bei „Beide“ zuerst EN→DE', () => {
  const v = deck({ newPerDay: 3 });
  const p = D.plan(v, entriesOf(10), NOON);
  assert.strictEqual(p.counts.fresh, 3);
  assert.ok(p.fresh.every((x) => x.dir === 'ed'));
  assert.strictEqual(D.plan(deck({ newPerDay: 0 }), entriesOf(10), NOON).counts.fresh, 0);
  assert.strictEqual(D.plan(deck({ newPerDay: 999999 }), entriesOf(10), NOON).counts.fresh, 10);
  assert.ok(D.plan(deck({ direction: 'de', newPerDay: 2 }), entriesOf(10), NOON).fresh.every((x) => x.dir === 'de'));
});

test('Planung: neue Wörter zählen gegen das Limit, Geschwister warten bis morgen', () => {
  const es = entriesOf(5);
  const v = deck({ newPerDay: 2 });
  D.answer(v, es[0], 'ed', 3, NOON);
  const p = D.plan(v, es, NOON + MINUTE);
  assert.strictEqual(p.counts.fresh, 1);
  assert.ok(!p.fresh.some((x) => x.entry.id === es[0].id));
  const tomorrow = NOON + 86400000;
  const q = D.plan(v, es, tomorrow);
  assert.ok(q.fresh.some((x) => x.entry.id === es[0].id && x.dir === 'de'));
});

test('Planung: Niveau-Filter, Aussetzen, Reihenfolge nach Niveau oder gemischt', () => {
  const es = entriesOf(40, 'B2').concat(entriesOf(40, 'A1'));
  const byLevel = D.plan(deck({ newPerDay: 10 }), es, NOON);
  assert.ok(byLevel.fresh.every((x) => x.entry.level === 'A1'));
  const onlyB2 = D.plan(deck({ newPerDay: 10, levels: { A1: false, A2: true, B1: true, B2: true } }), es, NOON);
  assert.ok(onlyB2.fresh.every((x) => x.entry.level === 'B2'));
  const mixed = D.plan(deck({ newPerDay: 30, order: 'mixed' }), es, NOON);
  assert.ok(mixed.fresh.some((x) => x.entry.level === 'A1') && mixed.fresh.some((x) => x.entry.level === 'B2'));
  assert.deepStrictEqual(D.plan(deck({ newPerDay: 30, order: 'mixed' }), es, NOON).fresh.map((x) => x.entry.id), mixed.fresh.map((x) => x.entry.id));
  const v = deck({ newPerDay: 10 });
  D.setSuspended(v, byLevel.fresh[0].entry.id, true, NOON);
  assert.ok(!D.plan(v, es, NOON).fresh.some((x) => x.entry.id === byLevel.fresh[0].entry.id));
});

test('Lernrunde: Nochmal kommt nach 1 Min wieder, Gut nach 10 Min, dann Wiederholung am nächsten Tag', () => {
  const es = entriesOf(1);
  const v = deck({ newPerDay: 1, direction: 'ed' });
  let r = D.pick(v, es, NOON, 0);
  assert.strictEqual(r.item.entry.id, es[0].id);
  D.answer(v, es[0], 'ed', FS.AGAIN, NOON);
  r = D.pick(v, es, NOON + 30000, 1);
  assert.strictEqual(r.item.card.state, FS.LEARNING); // vorgezogen, sonst ist nichts übrig
  D.answer(v, es[0], 'ed', FS.GOOD, NOON + MINUTE);
  D.answer(v, es[0], 'ed', FS.GOOD, NOON + 11 * MINUTE);
  assert.strictEqual(D.cardOf(v, es[0].id, 'ed').state, FS.REVIEW);
  assert.strictEqual(D.pick(v, es, NOON + 12 * MINUTE, 3).item, null);
  const p = D.plan(v, es, NOON + 12 * MINUTE);
  assert.ok(p.nextDue >= D.dayStart(D.dayOf(NOON) + 1));
});

test('Lernrunde: jede 4. Karte neu, wenn Wiederholungen und neue anstehen', () => {
  const es = entriesOf(20);
  const v = deck({ newPerDay: 20, direction: 'ed' });
  const yesterday = NOON - 86400000;
  for (const e of es.slice(0, 10)) D.markKnown(v, e, yesterday - 40 * 86400000);
  const kinds = [0, 1, 2, 3].map((shown) => (D.pick(v, es, NOON, shown).item.card.state === FS.NEW ? 'neu' : 'alt'));
  assert.deepStrictEqual(kinds, ['alt', 'alt', 'alt', 'neu']);
});

test('Tageszähler, Rückgängig, Schon bekannt', () => {
  const es = entriesOf(3);
  const v = deck({ newPerDay: 5 });
  const r = D.answer(v, es[0], 'ed', FS.GOOD, NOON);
  assert.deepStrictEqual(r.docs, [TT.vocabStore.docOf(es[0].level, 'ed'), 'vocab-meta']);
  assert.strictEqual(v.days['2026-11-03'].n, 1);
  const docs = D.undo(v, r.undo, NOON + 1000);
  assert.deepStrictEqual(docs, r.docs);
  assert.strictEqual(D.cardOf(v, es[0].id, 'ed').state, FS.NEW);
  assert.strictEqual(v.days['2026-11-03'].n, 0);
  assert.strictEqual(TT.vocabStore.modOf(v.cards[es[0].id + ':ed']), NOON + 1000);
  D.markKnown(v, es[1], NOON);
  assert.strictEqual(D.cardOf(v, es[1].id, 'ed').state, FS.REVIEW);
  assert.strictEqual(D.cardOf(v, es[1].id, 'de').state, FS.REVIEW);
  assert.strictEqual(D.status(v, es[1].id), 'learned');
  assert.strictEqual(D.status(v, es[2].id), 'new');
});

test('Bearbeiten, Original wiederherstellen, Statistik', () => {
  const es = entriesOf(3, 'A1');
  const v = deck();
  D.setEdit(v, es[0].id, { de: ' neu ', hint: '', ex: 'New text.', exDe: 'Neuer Text.', emoji: '🙂' }, NOON);
  assert.strictEqual(D.view(v, es[0]).de, 'neu');
  assert.ok(D.isEdited(v, es[0].id));
  D.restoreEdit(v, es[0].id, NOON + 1);
  assert.strictEqual(D.view(v, es[0]).de, 'x');
  D.markKnown(v, es[1], NOON - 10 * 86400000);
  const s = D.stats(v, es, NOON);
  assert.deepStrictEqual(s.levels.A1, { learned: 1, total: 3 });
  assert.strictEqual(s.forecast.reduce((a, b) => a + b, 0), 2);
  // Prognose zählt nur aktive Wörter in den gewählten Richtungen (wie „fällig“ in der Übersicht)
  const sum = (x) => x.forecast.reduce((p, q) => p + q, 0);
  v.settings.direction = 'ed';
  assert.strictEqual(sum(D.stats(v, es, NOON)), 1);
  v.settings.direction = 'both';
  D.setSuspended(v, es[1].id, true, NOON);
  assert.strictEqual(sum(D.stats(v, es, NOON)), 0);
  D.setSuspended(v, es[1].id, false, NOON + 1);
  assert.strictEqual(sum(D.stats(v, es, NOON)), 2);
  assert.strictEqual(s.retention, null);
  assert.strictEqual(D.preview(v, es[2], 'ed', NOON).length, 4);
  assert.deepStrictEqual(D.preview(v, es[2], 'ed', NOON).slice(0, 3), ['1 Min', '6 Min', '10 Min']);
});

test('Lerntag an Sommerzeit-Tagen und Tageslimit mit Kommazahl', () => {
  for (const [y, m, d] of [[2026, 2, 29], [2026, 9, 25], [2026, 2, 28], [2026, 9, 26]]) {
    const day = D.dayOf(new Date(y, m, d, 12).getTime());
    assert.strictEqual(D.dayOf(D.dayStart(day)), day, 'Tagesbeginn ' + d + '.' + (m + 1) + '.');
    assert.strictEqual(D.dayOf(new Date(y, m, d, 4, 30).getTime()), day, '4:30 Uhr am ' + d + '.' + (m + 1) + '.');
    assert.strictEqual(D.dayOf(new Date(y, m, d, 3, 30).getTime()), day - 1, '3:30 Uhr am ' + d + '.' + (m + 1) + '.');
  }
  assert.strictEqual(D.plan(deck({ newPerDay: 2.5 }), entriesOf(10), NOON).counts.fresh, 2);
});
