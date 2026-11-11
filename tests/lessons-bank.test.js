// Grammatik-Themen „Typische Fehler für Deutsche“: Aufgabensammlungen vollständig und in sich stimmig
const BANK_IDS = [
  'for-since', 'no-will-time-clause', 'mustnt-dont-have-to', 'first-conditional', 'second-conditional', 'third-conditional', 'wish-past',
  'to-purpose', 'gerund-after-prep', 'want-sb-to', 'be-used-to', 'have-sth-done', 'reporting-verbs',
  'adverb-frequency', 'word-order', 'indirect-questions', 'phrasal-verb-pronoun', 'countable', 'adverbs-ly', 'articles', 'verb-prep', 'despite',
];

test('Grammatik-Themen: alle 22 Themen registriert, IDs eindeutig, Kategorien in Ordnung', () => {
  const ids = TT.bankLessons().map((l) => l.id);
  assert.deepStrictEqual(ids.slice().sort(), BANK_IDS.slice().sort());
  assert.strictEqual(new Set(TT.LESSON_IDS).size, TT.LESSON_IDS.length);
  for (const c of TT.GRAMMAR_CATS) assert.ok(TT.bankLessons(c.id).length > 0, c.id);
  // keine Kollision mit Zeitformen
  for (const id of ids) assert.ok(!TT.TENSE_IDS.includes(id), id);
});

for (const id of BANK_IDS) {
  test('Grammatik-Thema ' + id + ': Inhalte gültig', () => {
    const L = TT.lesson(id);
    assert.ok(L && L.bank, id + ' fehlt');
    const errors = TT.bankUtil.validate(L.def);
    assert.deepStrictEqual(errors, [], errors.join('\n'));
  });

  test('Grammatik-Thema ' + id + ': erzeugte Aufgaben passen zu den Übungsansichten', () => {
    const L = TT.lesson(id);
    const rng = TT.util.makeRng(id.length * 31 + 7);
    for (const kind of L.kinds) {
      for (let i = 0; i < 120; i++) {
        const it = L.make(kind, rng);
        const where = id + '/' + kind + ': ' + JSON.stringify(it);
        assert.strictEqual(it.kind, kind, where);
        assert.ok(it.task && it.explain, where);
        if (kind === 'cloze') {
          assert.ok(TT.lessonCheck(it.answer, it.accept), where);
          assert.strictEqual(it.choices.filter((c) => TT.lessonCheck(c, it.accept)).length, 1, where);
        }
        if (kind === 'errorspot') {
          if (it.correct) assert.deepStrictEqual(it.options, [], where);
          else assert.ok(it.options.includes(it.answer) && it.options.includes(it.shown), where);
        }
        if (kind === 'transform') assert.ok(it.source.length && it.label && TT.lessonCheck(it.answer, it.accept), where);
        if (kind === 'order') {
          assert.ok(TT.lessonCheck(it.answer, it.accept), where);
          assert.ok(it.chunks.length >= 3, where);
        }
      }
    }
    assert.ok(L.example(rng));
  });
}

test('Grammatik-Themen: Prüfung findet typische Fehler in einer Definition', () => {
  const def = {
    id: 'demo-x', cat: 'zeit', level: 'B1', refs: ['B1-02'], title: 'T', rule: 'R', tip: 'T',
    mistakes: [['a.', 'b.'], ['c.', 'd.']], examples: ['A.', 'B.', 'C.'],
    cloze: [{ s: 'I have lived here ___ 2016.', a: ['since'], w: ['since'], e: 'x' }],
    errorspot: [{ r: 'I like it.', w: 'I like it.', e: 'x' }],
    transform: [{ s: 'I like it.', l: '→', a: ['I like it.'], e: 'x' }],
  };
  const errors = TT.bankUtil.validate(def).join('\n');
  assert.ok(/Falschantwort „since“ wird akzeptiert/.test(errors), errors);
  assert.ok(/falscher Satz gleich dem richtigen/.test(errors), errors);
  assert.ok(/Ausgangssatz ist schon eine Lösung/.test(errors), errors);
  assert.ok(/zu wenige cloze/.test(errors), errors);
});

test('Antwortprüfung: \'d je Stelle als had oder would gelesen', () => {
  const C = TT.lessonCheck;
  assert.ok(C("If I'd known, I'd have come.", ['If I had known, I would have come.']));
  assert.ok(C('If I had known, I would have come.', ["If I'd known, I'd have come."]));
  assert.ok(C("I'd never seen it before.", ['I had never seen it before.']));
  assert.ok(C("I'd help you if I could.", ['I would help you if I could.']));
  assert.ok(C("You'd better go.", ['You had better go.']));
  assert.ok(C("I'd rather stay.", ['I would rather stay.']));
  assert.ok(!C('I wish I would known.', ["I wish I'd known."]));
  assert.ok(!C('If I would have known, I would have come.', ["If I'd known, I'd have come."]));
  assert.ok(C('I cannot come.', ["I can't come."]));
});
