const SUB = (text, person, number) => ({ text, person, number });
const FIX = [
  { id: 'fx-ps', tense: 'present-simple', pattern: '{CLAUSE} *{EVERY}*{.}', why: 'w1', verbTypes: ['activity'] },
  { id: 'fx-mid', tense: 'present-perfect', pattern: '{CLAUSE}{.}', why: 'w2', mid: ['just'], forms: ['aff', 'q'], verbTypes: ['event'] },
  { id: 'fx-ev', tense: 'past-progressive', pattern: '{CLAUSE} *when* {EVENT:past-simple}{.}', why: 'w3', verbTypes: ['activity'] },
  { id: 'fx-fixed', tense: 'present-perfect-progressive', pattern: '{CLAUSE} *since {SINCE_SHORT}*{.}', why: 'w4',
    fixed: { subject: SUB('it', 3, 'sg'), verb: 'rain', object: '' }, forms: ['aff'] },
  { id: 'fx-flex', tense: 'present-perfect-progressive', pattern: '{CLAUSE} *for {FOR_SHORT}*{.}', why: 'w5',
    verbTypes: ['activity'], flexOnly: true, forms: ['aff'] },
];
const gen = (tense, form, seed, templates) =>
  TT.generate({ tense, form, rng: TT.util.makeRng(seed), templates: templates || FIX });
const verbsOf = (segs) => segs.filter((s) => s.t === 'verb').map((s) => s.v);

test('Aussagesatz: eine Lücke, Signalwort, Punkt, Großbuchstabe', () => {
  const s = gen('present-simple', 'aff', 1);
  assert.strictEqual(s.templateId, 'fx-ps');
  assert.strictEqual(s.form, 'aff');
  assert.deepStrictEqual(s.gaps, [s.answer]);
  assert.strictEqual(s.accept[0], s.answer);
  assert.strictEqual(s.verb.type, 'activity');
  assert.ok(s.text.endsWith('.'), s.text);
  assert.ok(/^[A-Z]/.test(s.text), s.text);
  assert.ok(!/[{}*]/.test(s.text), s.text);
  const sig = s.segments.find((x) => x.t === 'signal');
  assert.ok(TT.SLOTS.EVERY.includes(sig.v), sig.v);
  assert.strictEqual(s.why, 'w1');
});

test('Frage: zwei Lücken, Hilfsverb vorne, Fragezeichen', () => {
  const s = gen('present-simple', 'q', 2);
  assert.strictEqual(s.gaps.length, 2);
  assert.strictEqual(s.gaps.join(' '), s.answer);
  assert.ok(s.text.endsWith('?'), s.text);
  assert.strictEqual(s.segments[0].t, 'verb');
  assert.ok(/^(Do|Does)$/.test(s.segments[0].v), s.segments[0].v);
});

test('mid-Adverb teilt die Lücke', () => {
  const s = gen('present-perfect', 'aff', 3);
  assert.strictEqual(s.gaps.length, 2);
  assert.ok(/ just /.test(s.text), s.text);
  const iJust = s.segments.findIndex((x) => x.t === 'signal' && x.v === 'just');
  const iVerb = s.segments.findIndex((x) => x.t === 'verb');
  assert.ok(iVerb < iJust, 'Hilfsverb steht vor just');
});

test('Nebensatz wird eingesetzt', () => {
  const s = gen('past-progressive', 'aff', 4);
  assert.ok(/ when \S/.test(s.text), s.text);
  assert.ok(!/[{}*]/.test(s.text), s.text);
});

test('feste Vorlage', () => {
  const s = gen('present-perfect-progressive', 'aff', 5, [FIX[3]]);
  assert.ok(s.text.startsWith('It has been raining since '), s.text);
});

test('flex-Verben akzeptieren auch Present Perfect', () => {
  const s = gen('present-perfect-progressive', 'aff', 6, [FIX[4]]);
  assert.ok(s.verb.flex);
  assert.strictEqual(s.accept.length, 2);
  assert.strictEqual(s.accept[1], TT.conjugate(s.verb, s.subject, 'present-perfect', 'aff').full);
});

test('keine passende Vorlage wirft', () => {
  assert.throws(() => gen('future-perfect', 'aff', 1));
  assert.throws(() => gen('present-perfect', 'neg', 1));
});

test('renderSegments mit anderer Konjugation', () => {
  const s = gen('present-simple', 'q', 7);
  const other = TT.conjugate(s.verb, s.subject, 'past-simple', 'q');
  const segs = TT.renderSegments(s, other);
  assert.deepStrictEqual(verbsOf(segs).map((v) => v.toLowerCase()), ['did', s.verb.base]);
  assert.ok(TT.segmentsText(segs).startsWith('Did '));
});

test('keine Wiederholung in Folge', () => {
  const rng = TT.util.makeRng(8);
  const texts = [];
  for (let i = 0; i < 30; i++) texts.push(TT.generate({ tense: 'present-simple', rng, templates: FIX }).text);
  assert.strictEqual(new Set(texts).size, 30);
});

test('generateTransform: gleiche Bausteine, strikte Lösung', () => {
  const rng = TT.util.makeRng(9);
  for (let i = 0; i < 20; i++) {
    const t = TT.generateTransform({ from: 'present-simple', to: 'present-perfect-progressive', rng });
    assert.strictEqual(t.source.tense, 'present-simple');
    assert.strictEqual(t.target.tense, 'present-perfect-progressive');
    assert.strictEqual(t.source.verb, t.target.verb);
    assert.strictEqual(t.source.subject, t.target.subject);
    assert.strictEqual(t.source.object, t.target.object);
    assert.strictEqual(t.target.verb.type, 'activity');
    assert.strictEqual(t.target.accept.length, 1);
    assert.ok(t.source.text.endsWith('.'));
  }
});

test('generateTransform als Frage', () => {
  const t = TT.generateTransform({ from: 'past-simple', to: 'future-perfect', form: 'q', rng: TT.util.makeRng(10) });
  assert.strictEqual(t.source.form, 'aff');
  assert.strictEqual(t.target.gaps.length, 2);
  assert.ok(t.target.text.endsWith('?'));
});

test('alsoAccept: Konjugation der genannten Zeitform kommt in accept, ohne Duplikate', () => {
  const t = { id: 'fx-also', tense: 'past-perfect', pattern: '*After* {CLAUSE}, *we had tea*{.}', why: 'w', verbTypes: ['event'],
    alsoAccept: ['past-simple', 'past-simple'], forms: ['aff', 'neg', 'q'] };
  for (const form of ['aff', 'neg', 'q']) {
    const s = TT.generateFromTemplate(t, form, TT.util.makeRng(4));
    const alt = TT.conjugate(s.verb, s.subject, 'past-simple', form).full;
    assert.strictEqual(s.accept[0], s.answer);
    assert.ok(s.accept.includes(alt), form + ': ' + s.accept.join('|'));
    assert.strictEqual(new Set(s.accept).size, s.accept.length, 'Duplikate: ' + s.accept.join('|'));
  }
});

test('alsoAccept: generateTransform (strict) fügt nichts hinzu', () => {
  const t = TT.generateTransform({ from: 'past-simple', to: 'past-perfect', rng: TT.util.makeRng(3) });
  assert.strictEqual(t.target.accept.length, 1);
});

test('alsoAccept: Progressive nur für Zustandsverben mit progressiveOk', () => {
  const mk = (verb) => ({ id: 'fx-st', tense: 'present-perfect', pattern: '{CLAUSE} *since {SINCE_LONG}*{.}', why: 'w',
    alsoAccept: ['present-perfect-progressive'], forms: ['aff'], fixed: { subject: SUB('he', 3, 'sg'), verb, object: '' } });
  const sup = TT.generateFromTemplate(mk('support'), 'aff', TT.util.makeRng(2));
  assert.ok(sup.accept.includes('has been supporting'), sup.accept.join('|'));
  const kn = TT.generateFromTemplate(mk('know'), 'aff', TT.util.makeRng(2));
  assert.ok(!kn.accept.some((a) => /been knowing/.test(a) || /ing/.test(a)), kn.accept.join('|'));
});

test('goingTo: will-Future-Vorlage akzeptiert going to und ergänzt why', () => {
  const t = { id: 'fx-gt', tense: 'future-simple', pattern: '*I think* {CLAUSE} *tomorrow*{.}', why: 'Vermutung.', forms: ['aff', 'neg', 'q'] };
  for (const form of ['aff', 'neg', 'q']) {
    const s = TT.generateFromTemplate(t, form, TT.util.makeRng(5));
    const gt = TT.goingTo(s.verb, s.subject, form).full;
    assert.strictEqual(s.accept[0], s.answer);
    assert.ok(s.accept.includes(gt), form + ': ' + s.accept.join('|'));
    assert.strictEqual(new Set(s.accept).size, s.accept.length);
    assert.strictEqual(s.why, 'Vermutung. „going to“ ist hier auch korrekt.');
  }
});

test('goingTo: noGoingTo und strict lassen accept/why unverändert', () => {
  const t = { id: 'fx-ngt', tense: 'future-simple', pattern: '*I promise* {CLAUSE}{.}', why: 'Versprechen.', forms: ['aff'], noGoingTo: true };
  const s = TT.generateFromTemplate(t, 'aff', TT.util.makeRng(5));
  assert.deepStrictEqual(s.accept, [s.answer]);
  assert.strictEqual(s.why, 'Versprechen.');
  const tr = TT.generateTransform({ from: 'present-simple', to: 'future-simple', rng: TT.util.makeRng(3) });
  assert.strictEqual(tr.target.accept.length, 1);
  assert.strictEqual(tr.target.why, '');
});

test('fromTranslation: gaps sind klein geschrieben wie bei Vorlagen', () => {
  const s = TT.fromTranslation({ id: 'x', tense: 'present-simple', de: 'd', en: '{GAP} you {GAP} it?', verb: 'know', subj: 'you', form: 'q', accept: ['do know'], note: 'n' });
  assert.deepStrictEqual(s.gaps, ['do', 'know']);
  assert.ok(s.text.startsWith('Do you'));
});
