// Prognose: wann sind alle Wörter eingeführt und wann sicher (Abstand ≥ 21 Tage)?
const FF = TT.fsrs;
const FVS = TT.vocabStore;
const FDK = TT.deck;
const NOON_F = new Date(2026, 10, 8, 12, 0).getTime();

function fEntry(id, level, u, l, seq) {
  return { id, en: id.split('-')[0], pos: 'n', level, de: 'x', ex: 'x.', exDe: 'x.', hint: '', emoji: '', exWord: '', book: u ? { u, l, seq } : null, def: u ? 'd' : '' };
}

function fVocab(dir, perDay) {
  const v = FVS.defaults();
  v.settings.levels = { A1: true, A2: false, B1: false, B2: false };
  v.settings.newPerDay = perDay;
  v.settings.direction = dir;
  v.book = { t: 1, on: true, unit: 1, lesson: 2 };
  return v;
}

// 5 Buchwörter bis U1·L2, 1 Buchwort später, 2 Oxford-A1-Wörter, 1 B2-Wort (aus)
const fEntries = [
  fEntry('a-n', 'SU6', 1, 1, 1), fEntry('b-n', 'SU6', 1, 1, 2), fEntry('c-n', 'SU6', 1, 2, 3), fEntry('d-n', 'SU6', 1, 2, 4),
  fEntry('e-n', 'A1', 1, 2, 5), fEntry('f-n', 'SU6', 2, 1, 6), fEntry('g-n', 'A1', 0), fEntry('h-n', 'A1', 0), fEntry('i-n', 'B2', 0),
];
const byId = (r) => Object.fromEntries(r.groups.map((g) => [g.id, g]));

test('Prognose: „sicher“ dauert nach der Einführung einige Tage (FSRS mit „Gut“)', () => {
  const r = FDK.forecastFinish(fVocab('ed', 2), fEntries, NOON_F);
  assert.ok(r.matureDays >= 7 && r.matureDays <= 30, String(r.matureDays));
});

test('Prognose: Gruppen zählen richtig, Tage nach Tageslimit, beide Richtungen einen Tag später', () => {
  const today = FDK.dayOf(NOON_F);
  let g = byId(FDK.forecastFinish(fVocab('ed', 2), fEntries, NOON_F));
  assert.deepStrictEqual([g.reached.total, g.book.total, g.all.total], [5, 6, 7]);
  // 5 Wörter, 2 pro Tag: heute 2, dann 3 → noch 2 Tage
  assert.strictEqual(g.reached.seenDay, today + 2);
  assert.strictEqual(g.reached.matureDay, today + 2 + FDK.forecastFinish(fVocab('ed', 2), fEntries, NOON_F).matureDays);
  assert.strictEqual(g.all.seenDay, today + 3);
  g = byId(FDK.forecastFinish(fVocab('both', 2), fEntries, NOON_F));
  assert.strictEqual(g.reached.seenDay, today + 3);
});

test('Prognose: niedrigeres echtes Tempo der letzten 14 Tage zählt, 0 pro Tag gibt kein Datum', () => {
  const today = FDK.dayOf(NOON_F);
  const v = fVocab('ed', 10);
  for (let d = today - 14; d < today; d++) v.days[FDK.dayKey(d)] = { n: 1, n2: 0, r: 0, ok: 0 };
  const r = FDK.forecastFinish(v, fEntries, NOON_F);
  assert.ok(r.useActual);
  assert.strictEqual(r.pace, 1);
  assert.strictEqual(byId(r).reached.seenDay, today + 5);
  const z = byId(FDK.forecastFinish(fVocab('ed', 0), fEntries, NOON_F));
  assert.strictEqual(z.reached.seenDay, null);
  assert.strictEqual(z.reached.matureDay, null);
});

test('Prognose: alles eingeführt → kein Datum mehr nötig, sichere Wörter werden gezählt', () => {
  const v = fVocab('ed', 5);
  const ripe = { due: NOON_F + 30 * 86400000, s: 40, d: 5, reps: 4, lapses: 0, state: FF.REVIEW, last: NOON_F, step: 0, ivl: 30 };
  const young = Object.assign({}, ripe, { ivl: 3, s: 3 });
  for (const id of ['a-n', 'b-n', 'c-n']) v.cards[id + ':ed'] = FVS.encode(ripe, 1);
  for (const id of ['d-n', 'e-n']) v.cards[id + ':ed'] = FVS.encode(young, 1);
  const g = byId(FDK.forecastFinish(v, fEntries, NOON_F));
  assert.strictEqual(g.reached.remaining, 0);
  assert.strictEqual(g.reached.mature, 3);
  assert.strictEqual(g.reached.seenDay, FDK.dayOf(NOON_F));
  assert.strictEqual(g.reached.matureDay, null);
});
