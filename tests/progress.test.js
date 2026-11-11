const P = TT.progress;
const D = (s) => new Date(s + 'T12:00:00');
const fresh = () => TT.store.defaults();

test('defaults und Export/Import', () => {
  const s = fresh();
  assert.strictEqual(s.version, 1);
  assert.deepStrictEqual(s.settings, { theme: 'auto', inputMode: 'type' });
  P.record(s, { tense: 'past-simple', score: 1, ex: 'cloze', now: D('2026-11-02') });
  const back = TT.store.importText(TT.store.exportText(s));
  assert.deepStrictEqual(back, s);
});

test('Import lehnt Unsinn ab und ergänzt fehlende Felder', () => {
  assert.throws(() => TT.store.importText('kein json'), /ungültig/i);
  assert.throws(() => TT.store.importText('{"version":2}'), /Version/);
  const s = TT.store.importText('{"version":1,"history":{}}');
  assert.deepStrictEqual(s.review, []);
  assert.strictEqual(s.settings.theme, 'auto');
});

test('record begrenzt Verlauf auf 20 und zählt Tage', () => {
  const s = fresh();
  for (let i = 0; i < 25; i++) P.record(s, { tense: 'past-simple', score: 1, ex: 'cloze', now: D('2026-11-02') });
  assert.strictEqual(s.history['past-simple'].length, 20);
  assert.strictEqual(s.days['2026-11-02'], 25);
});

test('record zählt Verwechslungen', () => {
  const s = fresh();
  P.record(s, { tense: 'past-simple', score: 0, ex: 'cloze', usedTense: 'present-perfect', now: D('2026-11-02') });
  P.record(s, { tense: 'past-simple', score: 0, ex: 'cloze', usedTense: 'present-perfect', now: D('2026-11-02') });
  assert.strictEqual(s.confusions['past-simple>present-perfect'], 2);
  assert.deepStrictEqual(P.topConfusions(s, 3), [{ tense: 'past-simple', used: 'present-perfect', count: 2 }]);
});

test('mastery: neu unter 5 Antworten, sonst Durchschnitt', () => {
  const s = fresh();
  assert.deepStrictEqual(P.mastery(s, 'future-perfect'), { value: 0, count: 0, isNew: true });
  for (const score of [1, 1, 0.5, 0, 1]) P.record(s, { tense: 'future-perfect', score, ex: 'cloze', now: D('2026-11-02') });
  const m = P.mastery(s, 'future-perfect');
  assert.strictEqual(m.isNew, false);
  assert.strictEqual(m.count, 5);
  assert.ok(Math.abs(m.value - 0.7) < 1e-9);
});

test('Fehlerkiste: neuer Eintrag in Box 1, fällig nach 1 Tag', () => {
  const s = fresh();
  const e = P.addMistake(s, { tense: 'past-perfect', confusedWith: 'past-simple', ex: 'cloze', now: D('2026-11-02') });
  assert.strictEqual(e.box, 1);
  assert.deepStrictEqual(P.dueReviews(s, D('2026-11-02')), []);
  assert.strictEqual(P.dueReviews(s, D('2026-11-03')).length, 1);
});

test('Fehlerkiste: gleiches Muster wird zurückgesetzt statt doppelt angelegt', () => {
  const s = fresh();
  const e = P.addMistake(s, { tense: 'past-perfect', confusedWith: 'past-simple', ex: 'cloze', now: D('2026-11-02') });
  P.reviewAnswer(s, e.id, true, D('2026-11-03'));
  P.addMistake(s, { tense: 'past-perfect', confusedWith: 'past-simple', ex: 'cloze', now: D('2026-11-04') });
  assert.strictEqual(s.review.length, 1);
  assert.strictEqual(s.review[0].box, 1);
});

test('Fehlerkiste: Boxen 1→2→3→4→gelöscht mit 3, 7, 14 Tagen', () => {
  const s = fresh();
  const e = P.addMistake(s, { tense: 'past-perfect', confusedWith: null, ex: 'identify', now: D('2026-11-02') });
  P.reviewAnswer(s, e.id, true, D('2026-11-03'));
  assert.strictEqual(s.review[0].box, 2);
  assert.strictEqual(P.dayKey(new Date(s.review[0].due)), '2026-11-06');
  P.reviewAnswer(s, e.id, true, D('2026-11-06'));
  assert.strictEqual(P.dayKey(new Date(s.review[0].due)), '2026-11-13');
  P.reviewAnswer(s, e.id, true, D('2026-11-13'));
  assert.strictEqual(s.review[0].box, 4);
  assert.strictEqual(P.dayKey(new Date(s.review[0].due)), '2026-11-27');
  P.reviewAnswer(s, e.id, true, D('2026-11-27'));
  assert.strictEqual(s.review.length, 0);
});

test('Fehlerkiste: falsche Wiederholung setzt auf Box 1 zurück', () => {
  const s = fresh();
  const e = P.addMistake(s, { tense: 'past-perfect', confusedWith: null, ex: 'cloze', now: D('2026-11-02') });
  P.reviewAnswer(s, e.id, true, D('2026-11-03'));
  P.reviewAnswer(s, e.id, false, D('2026-11-06'));
  assert.strictEqual(s.review[0].box, 1);
  assert.strictEqual(P.dayKey(new Date(s.review[0].due)), '2026-11-07');
});

test('Serie zählt aufeinanderfolgende Tage bis heute oder gestern', () => {
  const s = fresh();
  s.days = { '2026-10-30': 3, '2026-10-31': 5, '2026-11-01': 2 };
  assert.strictEqual(P.streak(s, D('2026-11-01')), 3);
  assert.strictEqual(P.streak(s, D('2026-11-02')), 3);
  assert.strictEqual(P.streak(s, D('2026-11-03')), 0);
});

test('Statistik pro Übungsart und letzte Tage', () => {
  const s = fresh();
  P.record(s, { tense: 'past-simple', score: 1, ex: 'cloze', now: D('2026-11-02') });
  P.record(s, { tense: 'future-simple', score: 0, ex: 'cloze', now: D('2026-11-02') });
  P.record(s, { tense: 'future-simple', score: 1, ex: 'identify', now: D('2026-11-01') });
  assert.deepStrictEqual(P.statsByExercise(s), { cloze: { count: 2, avg: 0.5 }, identify: { count: 1, avg: 1 } });
  assert.deepStrictEqual(P.lastDays(s, D('2026-11-02'), 3), [
    { key: '2026-10-31', count: 0 }, { key: '2026-11-01', count: 1 }, { key: '2026-11-02', count: 2 },
  ]);
});

test('Sommerzeit: Fehlerkiste fällig am nächsten Kalendertag', () => {
  const s = fresh();
  const e = P.addMistake(s, { tense: 'past-simple', confusedWith: null, ex: 'cloze', now: new Date(2027, 2, 27, 23, 30) });
  assert.strictEqual(P.dayKey(new Date(e.due)), '2027-03-28');
});

test('Sommerzeit: Serie zählt keinen Tag doppelt', () => {
  const s = fresh();
  s.days = { '2026-10-24': 1, '2026-10-25': 1 };
  assert.strictEqual(P.streak(s, new Date(2026, 9, 25, 23, 30)), 2);
});

test('Sommerzeit: lastDays liefert jeden Kalendertag einmal', () => {
  const s = fresh();
  const keys = P.lastDays(s, new Date(2026, 9, 26, 0, 30), 3).map((d) => d.key);
  assert.deepStrictEqual(keys, ['2026-10-24', '2026-10-25', '2026-10-26']);
});

test('statsByExercise: __proto__ als Übungsart verschmutzt nichts', () => {
  const s = fresh();
  s.history['past-simple'] = [{ t: 1, score: 1, ex: '__proto__' }];
  const out = P.statsByExercise(s);
  assert.strictEqual(Object.getPrototypeOf(out), Object.prototype);
  assert.strictEqual(({}).count, undefined);
});
