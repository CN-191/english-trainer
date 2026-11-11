const { util } = TT;

test('makeRng ist deterministisch', () => {
  const a = util.makeRng(42), b = util.makeRng(42);
  for (let i = 0; i < 5; i++) assert.strictEqual(a(), b());
});

test('makeRng liefert Werte in [0,1)', () => {
  const r = util.makeRng(1);
  for (let i = 0; i < 1000; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
});

test('shuffle verändert das Original nicht und behält alle Elemente', () => {
  const src = [1, 2, 3, 4, 5];
  const out = util.shuffle(src, util.makeRng(3));
  assert.deepStrictEqual(src, [1, 2, 3, 4, 5]);
  assert.deepStrictEqual(out.slice().sort(), [1, 2, 3, 4, 5]);
});

test('weightedPick wählt nie Gewicht 0', () => {
  const r = util.makeRng(7);
  for (let i = 0; i < 200; i++) {
    assert.strictEqual(util.weightedPick(['a', 'b'], (x) => (x === 'a' ? 0 : 1), r), 'b');
  }
});

test('weightedPick bevorzugt höheres Gewicht', () => {
  const r = util.makeRng(9);
  let heavy = 0;
  for (let i = 0; i < 1000; i++) if (util.weightedPick(['x', 'y'], (v) => (v === 'x' ? 9 : 1), r) === 'x') heavy++;
  assert.ok(heavy > 800, `x gewählt: ${heavy}`);
});

test('escapeHtml und capitalize', () => {
  assert.strictEqual(util.escapeHtml('<b>"x" & \'y\''), '&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;');
  assert.strictEqual(util.capitalize('my sister'), 'My sister');
  assert.strictEqual(util.capitalize(''), '');
});
