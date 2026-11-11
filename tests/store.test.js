const S = TT.store;

test('Import: settings als String wird ignoriert', () => {
  const s = S.importText('{"version":1,"settings":"xy"}');
  assert.deepStrictEqual(s.settings, { theme: 'auto', inputMode: 'type' });
});

test('Import: ungültige Einstellungswerte fallen auf Standard', () => {
  const s = S.importText('{"version":1,"settings":{"theme":"purple","inputMode":"x"}}');
  assert.strictEqual(s.settings.theme, 'auto');
  assert.strictEqual(s.settings.inputMode, 'type');
  const t = S.importText('{"version":1,"settings":{"theme":"dark","inputMode":"choice"}}');
  assert.strictEqual(t.settings.theme, 'dark');
  assert.strictEqual(t.settings.inputMode, 'choice');
});

test('Import: kaputter Verlauf stürzt nicht ab', () => {
  const s = S.importText('{"version":1,"history":{"past-simple":5,"Bogus!":[],"past-perfect":[{"t":1,"score":1,"ex":"cloze"},{"t":"x","score":1,"ex":"c"},{"t":1,"score":0.3,"ex":"c"},null]}}');
  assert.deepStrictEqual(Object.keys(s.history), ['past-perfect']);
  assert.strictEqual(s.history['past-perfect'].length, 1);
  TT.progress.record(s, { tense: 'past-simple', score: 1, ex: 'cloze', now: new Date(2026, 10, 2) });
  assert.strictEqual(s.history['past-simple'].length, 1);
});

test('Import: Verlauf auf 20 begrenzt', () => {
  const list = Array.from({ length: 30 }, (_, i) => ({ t: i, score: 1, ex: 'cloze' }));
  const s = S.importText(JSON.stringify({ version: 1, history: { 'past-simple': list } }));
  assert.strictEqual(s.history['past-simple'].length, 20);
  assert.strictEqual(s.history['past-simple'][0].t, 10);
});

test('Import: Fehlerkiste nur gültige Einträge', () => {
  const good = { id: 'r1', tense: 'past-simple', confusedWith: null, ex: 'cloze', box: 2, due: 5 };
  const bad = { id: 'r2', tense: 'Nope!', confusedWith: null, ex: 'cloze', box: 2, due: 5 };
  const bad2 = { id: 'r3', tense: 'past-simple', confusedWith: null, ex: 'cloze', box: 9, due: 5 };
  const s = S.importText(JSON.stringify({ version: 1, review: [null, good, bad, bad2, 3] }));
  assert.deepStrictEqual(s.review, [good]);
});

test('Import: Verwechslungen, Tage, Geschichten werden geprüft', () => {
  const s = S.importText(JSON.stringify({
    version: 1,
    confusions: { 'past-simple>present-perfect': 2, 'a>b': 1, 'past-simple>past-perfect': -1, 'past-simple>future-simple': 1.5 },
    days: { '2026-11-02': 3, 'heute': 1, '2026-11-01': -2 },
    stories: { s1: { best: 0.5 }, s2: { best: 7 }, s3: 4 },
  }));
  assert.deepStrictEqual(s.confusions, { 'past-simple>present-perfect': 2 });
  assert.deepStrictEqual(s.days, { '2026-11-02': 3 });
  assert.deepStrictEqual(s.stories, { s1: { best: 0.5 } });
});

test('Import: __proto__-Schlüssel verschmutzen nichts', () => {
  const s = S.importText('{"version":1,"__proto__":{"polluted":true},"settings":{"__proto__":{"polluted":true}},"days":{"__proto__":{"polluted":true}},"stories":{"__proto__":{"best":1},"constructor":{"best":1}}}');
  assert.strictEqual(({}).polluted, undefined);
  assert.strictEqual(Object.getPrototypeOf(s), Object.prototype);
  assert.strictEqual(Object.getPrototypeOf(s.settings), Object.prototype);
  assert.deepStrictEqual(s.stories, {});
});

test('Import: Array oder Nicht-Objekt wird abgelehnt', () => {
  assert.throws(() => S.importText('[]'), /ungültig/i);
  assert.throws(() => S.importText('null'), /ungültig/i);
});

test('save/load Rundlauf', () => {
  const s = S.defaults();
  TT.progress.record(s, { tense: 'past-simple', score: 1, ex: 'cloze', now: new Date(2026, 10, 2) });
  assert.strictEqual(S.save(s), true);
  assert.deepStrictEqual(S.load(), s);
});

test('Import: history.ex nur bekannte Übungsarten, Verwechslung a>a verworfen', () => {
  const h = [{ t: 1, score: 1, ex: '__proto__' }, { t: 2, score: 1, ex: 'cloze' }, { t: 3, score: 0, ex: 'constructor' }];
  const s = S.importText(JSON.stringify({ version: 1, history: { 'past-simple': h }, confusions: { 'past-simple>past-simple': 3, 'past-simple>present-perfect': 1 } }));
  assert.deepStrictEqual(s.history['past-simple'], [{ t: 2, score: 1, ex: 'cloze' }]);
  assert.deepStrictEqual(s.confusions, { 'past-simple>present-perfect': 1 });
  assert.strictEqual(({}).cloze, undefined);
  const out = TT.progress.statsByExercise(s);
  assert.deepStrictEqual(Object.keys(out), ['cloze']);
});
