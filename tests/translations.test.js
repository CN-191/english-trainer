const subjOf = (e) => TT.findSubject(e.subj) || { text: e.subj, person: e.person, number: e.number };
const norm = (s) => TT.normalizeVariants(s)[0];

test('mindestens 150 Einträge, mindestens 10 pro Zeitform, IDs eindeutig', () => {
  assert.ok(TT.TRANSLATIONS.length >= 150, String(TT.TRANSLATIONS.length));
  assert.strictEqual(new Set(TT.TRANSLATIONS.map((e) => e.id)).size, TT.TRANSLATIONS.length);
  for (const id of TT.TENSE_IDS) {
    const n = TT.TRANSLATIONS.filter((e) => e.tense === id).length;
    assert.ok(n >= 10, `${id}: ${n}`);
  }
});

test('Einträge sind vollständig und konsistent', () => {
  for (const e of TT.TRANSLATIONS) {
    const where = e.id;
    assert.ok(e.de && e.note && e.note.length > 15, where);
    assert.ok(['aff', 'neg', 'q'].includes(e.form), where);
    const verb = TT.findVerb(e.verb);
    assert.ok(verb, where + ': Verb fehlt in verbs.js: ' + e.verb);
    if (!TT.findSubject(e.subj)) assert.ok([1, 2, 3].includes(e.person) && ['sg', 'pl'].includes(e.number), where + ': person/number fehlt');
    const gaps = e.en.split('{GAP}').length - 1;
    assert.ok(gaps === 1 || gaps === 2, where);
    if (e.form === 'q') assert.strictEqual(gaps, 2, where + ': Fragen brauchen 2 Lücken');
    if (gaps === 2) assert.ok(e.accept[0].split(' ').length >= 2, where);
    assert.ok(!e.accept.some((a) => /'s\b/.test(a)), where);
    const canonical = TT.conjugate(verb, subjOf(e), e.tense, e.form).full;
    assert.strictEqual(norm(e.accept[0]), norm(canonical), where + ': accept[0] ≠ ' + canonical);
    for (const a of e.accept.slice(1)) {
      const ok = TT.TENSE_IDS.some((t) => norm(TT.conjugate(verb, subjOf(e), t, e.form).full) === norm(a))
        || (e.tense === 'future-simple' && norm(TT.goingTo(verb, subjOf(e), e.form).full) === norm(a));
      assert.ok(ok, where + ': Alternative ist keine gültige Form: ' + a);
    }
  }
});

test('fromTranslation baut einen prüfbaren Satz', () => {
  const e = TT.TRANSLATIONS.find((x) => x.form === 'q');
  const s = TT.fromTranslation(e);
  assert.strictEqual(s.segments.filter((x) => x.t === 'verb').length, 2);
  assert.ok(!TT.segmentsText(s.segments).includes('{GAP}'));
  assert.ok(TT.checkAnswer(e.accept[0], { accept: s.accept, verb: s.verb, subject: s.subject, tense: s.tense, polarity: s.form }).ok);
  const ch = TT.makeChoices(s, TT.util.makeRng(1));
  assert.strictEqual(ch.length, 4);
  assert.strictEqual(ch.filter((c) => c.correct).length, 1);
});
