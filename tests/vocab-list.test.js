const L = TT.VOCAB_LIST;
const byId = (id) => L.find((r) => r[0] === id);

test('Wortliste: 3774 Einträge, IDs eindeutig, Niveaus und Wortarten gültig', () => {
  assert.strictEqual(L.length, 3774);
  assert.strictEqual(new Set(L.map((r) => r[0])).size, L.length);
  const POS = ['n', 'v', 'adj', 'adv', 'prep', 'conj', 'pron', 'det', 'exclam', 'num', 'modal', 'aux', 'art', 'inf'];
  for (const [id, en, pos, level, sense] of L) {
    assert.ok(/^[a-z0-9_]+-[a-z_]+$/.test(id), id);
    assert.ok(en && typeof sense === 'string', id);
    assert.ok(['A1', 'A2', 'B1', 'B2'].includes(level), id);
    assert.ok(pos.split('/').every((p) => POS.includes(p)), id + ' ' + pos);
  }
  const count = (lv) => L.filter((r) => r[3] === lv).length;
  assert.deepStrictEqual([count('A1'), count('A2'), count('B1'), count('B2')], [1054, 982, 899, 839]);
});

test('Wortliste: Sonderfälle aus der PDF', () => {
  assert.deepStrictEqual(byId('a_an-art'), ['a_an-art', 'a, an', 'art', 'A1', '']);
  assert.deepStrictEqual(byId('about-adj'), ['about-adj', 'about', 'adj', 'B1', '']);
  assert.deepStrictEqual(byId('bank_river-n'), ['bank_river-n', 'bank', 'n', 'B1', 'river']);
  assert.deepStrictEqual(byId('double-adv'), ['double-adv', 'double', 'adv', 'B1', '']);
  assert.deepStrictEqual(byId('light_from_the_sun_a_lamp-v'), ['light_from_the_sun_a_lamp-v', 'light', 'v', 'A2', 'from the sun/a lamp']);
  assert.deepStrictEqual(byId('oclock-adv'), ['oclock-adv', "o'clock", 'adv', 'A1', '']);
  assert.deepStrictEqual(byId('produce-n'), ['produce-n', 'produce', 'n', 'B2', '']);
  assert.deepStrictEqual(byId('another-det_pron'), ['another-det_pron', 'another', 'det/pron', 'A1', '']);
  assert.deepStrictEqual(byId('wi_fi-n'), ['wi_fi-n', 'Wi-Fi', 'n', 'B1', '']);
  assert.strictEqual(byId('zone-n')[3], 'B2');
});

test('vocabLevel und Wortart-Bezeichnung', () => {
  assert.strictEqual(TT.vocabLevel('bank_river-n'), 'B1');
  assert.strictEqual(TT.vocabLevel('gibt-es-nicht'), null);
  assert.strictEqual(TT.vocabPosLabel('det/pron'), 'Begleiter / Pronomen');
  assert.strictEqual(TT.vocabPosLabel('modal'), 'Modalverb');
});
