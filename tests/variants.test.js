const P = (text, person, number) => ({ text, person, number });
const tpl = (tense, verb, subject, form) => ({
  id: 'v-' + tense, tense, pattern: '{CLAUSE}{.}', why: 'x',
  fixed: { subject, verb, object: '' }, forms: [form || 'aff'],
});
const sent = (tense, verb, subject, form) =>
  TT.generateFromTemplate(tpl(tense, verb, subject, form), form || 'aff', TT.util.makeRng(1));
const HE = P('he', 3, 'sg');
const I = P('I', 1, 'sg');
const fulls = (opts) => opts.map((o) => o.conj.full);

test('Fehlervarianten für unregelmäßiges Verb im Present Perfect', () => {
  const s = sent('present-perfect', 'write', HE);
  const opts = TT.errorOptions(s);
  const byKind = (k) => opts.filter((o) => o.kind === k).map((o) => o.conj.full);
  assert.deepStrictEqual(byKind('participle'), ['has wrote']);
  assert.deepStrictEqual(byKind('agreement'), ['have written']);
  assert.deepStrictEqual(byKind('wrong-tense').sort(), ['has been writing', 'wrote']);
  assert.deepStrictEqual(byKind('stative'), []);
});

test('Simple Past: 3. Form statt 2. Form', () => {
  const s = sent('past-simple', 'go', HE);
  assert.ok(fulls(TT.errorOptions(s)).includes('gone'));
});

test('Zustandsverb: kein Progressive als Zeitform-Verwechslung, aber stative-Fehler', () => {
  const s = sent('present-simple', 'know', I);
  const opts = TT.errorOptions(s);
  assert.deepStrictEqual(opts.filter((o) => o.kind === 'stative').map((o) => o.conj.full), ['am knowing']);
  assert.ok(!opts.some((o) => o.kind === 'wrong-tense' && /ing/.test(o.conj.full)));
  assert.ok(opts.some((o) => o.kind === 'agreement' && o.conj.full === 'knows'));
});

test('flex-Verb: akzeptierte Alternative ist kein Fehler', () => {
  const s = sent('present-perfect-progressive', 'live', HE);
  const all = fulls(TT.errorOptions(s));
  assert.ok(!all.includes('has lived'));
  assert.ok(all.includes('is living'));
});

test('keine Fehlervariante ist eine akzeptierte Antwort', () => {
  for (const [tense, verb, subj] of [['past-perfect', 'leave', I], ['future-simple', 'buy', HE], ['present-simple', 'watch', HE]]) {
    const s = sent(tense, verb, subj);
    const acc = s.accept.map((a) => TT.normalizeVariants(a)[0]);
    for (const o of TT.errorOptions(s)) assert.ok(!acc.includes(TT.normalizeVariants(o.conj.full)[0]), `${tense}: ${o.conj.full}`);
  }
});

test('makeError liefert eine der Optionen', () => {
  const s = sent('present-perfect', 'write', HE);
  const e = TT.makeError(s, TT.util.makeRng(3));
  assert.ok(fulls(TT.errorOptions(s)).includes(e.conj.full));
});

test('makeChoices: 4 verschiedene Optionen, genau eine richtig', () => {
  const rng = TT.util.makeRng(4);
  for (const [tense, verb, subj, form] of [['present-perfect', 'write', HE, 'aff'], ['past-progressive', 'cook', I, 'q'], ['future-perfect', 'finish', HE, 'neg']]) {
    const s = sent(tense, verb, subj, form);
    const ch = TT.makeChoices(s, rng);
    assert.strictEqual(ch.length, 4, tense);
    assert.strictEqual(ch.filter((c) => c.correct).length, 1, tense);
    assert.strictEqual(new Set(fulls(ch)).size, 4, tense);
    assert.strictEqual(ch.find((c) => c.correct).conj.full, s.answer, tense);
    if (form === 'q') assert.ok(ch.every((c) => c.label.includes(' … ')), tense);
  }
});

test('gapParts folgt der Satzstruktur', () => {
  const s = sent('present-simple', 'watch', HE, 'q');
  assert.deepStrictEqual(TT.gapParts(s, TT.conjugate(s.verb, s.subject, 'past-simple', 'q')).map((x) => x.toLowerCase()), ['did', 'watch']);
});

const PPF_ALSO = { id: 'v-also', tense: 'past-perfect', pattern: '{CLAUSE}{.}', why: 'x', alsoAccept: ['past-simple'], forms: ['aff', 'neg', 'q'] };
const sentAlso = (verb, subject, form) =>
  TT.generateFromTemplate(Object.assign({}, PPF_ALSO, { fixed: { subject, verb, object: '' } }), form, TT.util.makeRng(1));

test('alsoAccept: Simple Past wird nie als Fehler oder falsche Antwort angeboten', () => {
  for (const verb of ['go', 'order', 'write']) {
    for (const form of ['aff', 'neg', 'q']) {
      const s = sentAlso(verb, HE, form);
      const alt = TT.conjugate(s.verb, s.subject, 'past-simple', form).full;
      assert.ok(s.accept.includes(alt));
      assert.ok(!fulls(TT.errorOptions(s)).includes(alt), verb + '/' + form);
      for (let i = 0; i < 20; i++) {
        const ch = TT.makeChoices(s, TT.util.makeRng(i));
        const acc = s.accept.map((a) => TT.normalizeVariants(a)[0]);
        for (const c of ch.filter((x) => !x.correct)) assert.ok(!acc.includes(TT.normalizeVariants(c.conj.full)[0]), c.conj.full);
      }
    }
  }
});

test('progressiveOk-Zustandsverb (support) bekommt keinen stative-Fehler, know weiterhin', () => {
  const sup = sent('present-simple', 'support', HE);
  assert.ok(sup.verb.progressiveOk);
  assert.deepStrictEqual(TT.errorOptions(sup).filter((o) => o.kind === 'stative'), []);
  const know = sent('present-simple', 'know', HE);
  assert.strictEqual(TT.errorOptions(know).filter((o) => o.kind === 'stative').length, 1);
});

test('Auswahl-Labels enthalten keine leeren Teile', () => {
  const s = sent('present-simple', 'work', HE, 'q');
  for (const c of TT.makeChoices(s, TT.util.makeRng(3))) {
    assert.ok(!/^ …|… $|…\s*…/.test(c.label), c.label);
    assert.ok(c.label.trim().length > 0);
  }
});
