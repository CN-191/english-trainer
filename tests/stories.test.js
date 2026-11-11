const SUBJ = [
  { text: 'I', person: 1, number: 'sg' }, { text: 'you', person: 2, number: 'sg' },
  { text: 'he', person: 3, number: 'sg' }, { text: 'they', person: 3, number: 'pl' },
];
const norm = (s) => TT.normalizeVariants(s)[0];
const formsOf = (verb, tense, pol) => SUBJ.map((s) => norm(TT.conjugate(verb, s, tense, pol).full));
const goingToForms = (verb, pol) => SUBJ.map((s) => norm(TT.goingTo(verb, s, pol).full));

test('mindestens 20 Geschichten, 5 pro Stufe, IDs eindeutig', () => {
  assert.ok(TT.STORIES.length >= 20, String(TT.STORIES.length));
  assert.strictEqual(new Set(TT.STORIES.map((s) => s.id)).size, TT.STORIES.length);
  for (const lvl of [1, 2, 3]) assert.ok(TT.STORIES.filter((s) => s.level === lvl).length >= 5, 'Stufe ' + lvl);
});

test('parseStory erkennt Lücken und Satzart', () => {
  const parts = TT.parseStory("He [[wait|past-perfect-progressive|had been waiting/had waited]] but [[like|present-simple|doesn't like]] it.");
  const gaps = parts.filter((p) => p.t === 'gap');
  assert.strictEqual(gaps.length, 2);
  assert.deepStrictEqual(gaps[0].accept, ['had been waiting', 'had waited']);
  assert.strictEqual(gaps[0].polarity, 'aff');
  assert.strictEqual(gaps[1].polarity, 'neg');
  assert.strictEqual(parts[0].v, 'He ');
});

test('jede Lücke ist gültig und konsistent', () => {
  const perTense = {};
  for (const st of TT.STORIES) {
    const gaps = TT.parseStory(st.text).filter((p) => p.t === 'gap');
    assert.ok(gaps.length >= 8 && gaps.length <= 15, `${st.id}: ${gaps.length} Lücken`);
    assert.ok(!/\[\[|\]\]/.test(TT.parseStory(st.text).filter((p) => p.t === 'text').map((p) => p.v).join('')), st.id + ': kaputte Lücke');
    for (const g of gaps) {
      const where = `${st.id}: ${g.verb} (${g.tense})`;
      assert.ok(TT.TENSE_IDS.includes(g.tense), where);
      const verb = TT.findVerb(g.verb);
      assert.ok(verb, where + ': Verb fehlt in verbs.js');
      assert.ok(formsOf(verb, g.tense, g.polarity).includes(norm(g.accept[0])), where + ': erste Antwort passt nicht zur Zeitform');
      for (const a of g.accept.slice(1)) {
        const ok = TT.TENSE_IDS.some((t) => formsOf(verb, t, g.polarity).includes(norm(a)))
          || (g.tense === 'future-simple' && goingToForms(verb, g.polarity).includes(norm(a)));
        assert.ok(ok, where + ': Alternative ungültig: ' + a);
      }
      perTense[g.tense] = (perTense[g.tense] || 0) + 1;
    }
  }
  for (const id of TT.TENSE_IDS) assert.ok((perTense[id] || 0) >= 5, `${id}: nur ${perTense[id] || 0} Lücken`);
});
