test('genau 12 Zeitformen mit eindeutiger Rasterposition', () => {
  assert.strictEqual(TT.TENSES.length, 12);
  assert.strictEqual(TT.TENSE_IDS.length, 12);
  const pos = new Set(TT.TENSES.map((t) => t.row + '/' + t.col));
  assert.strictEqual(pos.size, 12);
});

test('Raster-Reihenfolge ist zeilenweise', () => {
  assert.deepStrictEqual(TT.TENSE_IDS.slice(0, 4), ['present-simple', 'present-progressive', 'present-perfect', 'present-perfect-progressive']);
  assert.strictEqual(TT.TENSE_IDS[11], 'future-perfect-progressive');
});

test('Verwechslungspartner und Kontraste verweisen auf gültige IDs', () => {
  for (const t of TT.TENSES) {
    assert.ok(t.confusions.length >= 2, t.id);
    for (const c of t.confusions) {
      assert.ok(TT.TENSE_IDS.includes(c), `${t.id} → ${c}`);
      assert.notStrictEqual(c, t.id);
      assert.ok(t.contrasts[c], `Kontrasttext fehlt: ${t.id} ↔ ${c}`);
    }
  }
});

test('Pflichtfelder sind befüllt', () => {
  for (const t of TT.TENSES) {
    for (const k of ['aff', 'neg', 'q']) {
      assert.ok(t.formula[k], `${t.id} formula.${k}`);
      assert.ok(t.examples[k], `${t.id} examples.${k}`);
    }
    assert.ok(t.usage.length > 40, t.id);
    assert.ok(t.signals.length >= 3, t.id);
  }
});

test('tense() wirft bei unbekannter ID', () => {
  assert.strictEqual(TT.tense('past-perfect').name, 'Past Perfect');
  assert.throws(() => TT.tense('nope'));
});

test('hint liefert drei Stufen', () => {
  assert.strictEqual(TT.hint('past-perfect', 1), 'Zeitebene: Vergangenheit');
  assert.strictEqual(TT.hint('past-perfect', 2), 'Zeitform: Past Perfect');
  assert.strictEqual(TT.hint('past-perfect', 3), 'Bauplan: had + 3. Form');
});

test('Vergleiche verweisen auf gültige IDs', () => {
  assert.ok(TT.COMPARISONS.length >= 5);
  for (const c of TT.COMPARISONS) {
    assert.ok(TT.TENSE_IDS.includes(c.a) && TT.TENSE_IDS.includes(c.b), c.title);
  }
});

test('hint Stufe 3 nutzt die gewünschte Satzart', () => {
  assert.strictEqual(TT.hint('past-simple', 3, 'neg'), 'Bauplan: ' + TT.tense('past-simple').formula.neg);
  assert.strictEqual(TT.hint('past-simple', 3, 'q'), 'Bauplan: ' + TT.tense('past-simple').formula.q);
  assert.strictEqual(TT.hint('past-simple', 3), 'Bauplan: ' + TT.tense('past-simple').formula.aff);
});
