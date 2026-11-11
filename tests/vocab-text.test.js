const X = TT.vocabText;
const hit = (text, en, exWord) => {
  const r = X.find(text, { en, exWord: exWord || '' });
  return r ? text.slice(r.start, r.end) : null;
};

test('Lernwort im Satz: Grundform und regelmäßige Formen', () => {
  assert.strictEqual(hit('Money is a constant worry for them.', 'worry'), 'worry');
  assert.strictEqual(hit('She worried about the test.', 'worry'), 'worried');
  assert.strictEqual(hit('He stopped the car.', 'stop'), 'stopped');
  assert.strictEqual(hit('We are making progress.', 'make'), 'making');
  assert.strictEqual(hit('The cities are big.', 'city'), 'cities');
  assert.strictEqual(hit('This box is bigger.', 'big'), 'bigger');
});

test('Lernwort im Satz: unregelmäßige Formen', () => {
  assert.strictEqual(hit('We went home early.', 'go'), 'went');
  assert.strictEqual(hit('The children are playing.', 'child'), 'children');
  assert.strictEqual(hit('Her English is better now.', 'good'), 'better');
  assert.strictEqual(hit('I was tired.', 'be'), 'was');
  assert.strictEqual(hit('He has written a letter.', 'write'), 'written');
});

test('Lernwort im Satz: Wortgruppen, Alternativen, Groß-/Kleinschreibung, Wortgrenzen', () => {
  assert.strictEqual(hit('According to the map, we are close.', 'according to'), 'According to');
  assert.strictEqual(hit('I used to live here.', 'used to'), 'used to');
  assert.strictEqual(hit('She ate an apple.', 'a, an'), 'an');
  assert.strictEqual(hit("It's five o'clock.", "o'clock"), "o'clock");
  assert.strictEqual(hit('The cat sat on the mat.', 'at'), null);
  assert.strictEqual(hit('Our Wi-Fi is slow.', 'Wi-Fi'), 'Wi-Fi');
});

test('exWord überschreibt die Suche, split liefert Teile', () => {
  assert.strictEqual(hit('He lay down.', 'lie', 'lay'), 'lay');
  assert.deepStrictEqual(X.split('We went home.', { en: 'go', exWord: '' }), [
    { t: 'text', v: 'We ' }, { t: 'word', v: 'went' }, { t: 'text', v: ' home.' },
  ]);
  assert.deepStrictEqual(X.split('Nothing here.', { en: 'go', exWord: '' }), [{ t: 'text', v: 'Nothing here.' }]);
});

test('Kurze Wörter und Großschreibung: keine falschen Treffer', () => {
  assert.strictEqual(hit('I bought bread and an apple.', 'a, an'), 'an');
  assert.strictEqual(hit('He went to bed early.', 'be'), null);
  assert.strictEqual(hit('She is being silly.', 'be'), 'is');
  assert.strictEqual(hit('He goes home and keeps going.', 'go'), 'goes');
  assert.strictEqual(hit('She has a car.', 'have'), 'has');
  assert.strictEqual(hit('He has to work today.', 'have to'), 'has to');
  assert.strictEqual(hit('You may go. We met in May.', 'May'), 'May');
  assert.strictEqual(hit('I think so.', 'I'), 'I');
});
