const VB = {
  write: { base: 'write', past: 'wrote', pp: 'written', type: 'activity', objects: [] },
  go: { base: 'go', past: 'went', pp: 'gone', type: 'event', objects: [] },
  work: { base: 'work', past: 'worked', pp: 'worked', type: 'activity', objects: [] },
  run: { base: 'run', past: 'ran', pp: 'run', type: 'activity', objects: [] },
  know: { base: 'know', past: 'knew', pp: 'known', type: 'state', objects: [] },
  wait: { base: 'wait', past: 'waited', pp: 'waited', type: 'activity', objects: [] },
  study: { base: 'study', past: 'studied', pp: 'studied', type: 'activity', objects: [] },
  stop: { base: 'stop', past: 'stopped', pp: 'stopped', type: 'event', objects: [] },
  fly: { base: 'fly', past: 'flew', pp: 'flown', type: 'activity', objects: [] },
};
const SB = {
  I: { text: 'I', person: 1, number: 'sg' },
  he: { text: 'he', person: 3, number: 'sg' },
  she: { text: 'she', person: 3, number: 'sg' },
};
const task = (verb, subj, tense, polarity) => ({
  accept: [TT.conjugate(VB[verb], SB[subj], tense, polarity).full],
  verb: VB[verb], subject: SB[subj], tense, polarity,
});

test('normalizeVariants: Groß/klein, Leerzeichen, Satzzeichen, Kurzformen', () => {
  assert.deepStrictEqual(TT.normalizeVariants("  Hasn't   BEEN working. "), ['has not been working']);
  assert.deepStrictEqual(TT.normalizeVariants("won't go"), ['will not go']);
  assert.deepStrictEqual(TT.normalizeVariants('’m working'), ['am working']);
  assert.deepStrictEqual(TT.normalizeVariants("'d left"), ['had left']);
  assert.deepStrictEqual(TT.normalizeVariants("'s been working"), ['has been working', 'is been working']);
});

test('richtige Antworten, auch mit Langform oder Subjekt', () => {
  const t = task('work', 'she', 'present-perfect-progressive', 'neg');
  assert.ok(TT.checkAnswer('has not been working', t).ok);
  assert.ok(TT.checkAnswer("HASN'T been working", t).ok);
  const t2 = task('work', 'she', 'present-perfect-progressive', 'aff');
  assert.ok(TT.checkAnswer("she's been working", t2).ok);
  assert.ok(TT.checkAnswer('She has been working', t2).ok);
});

test('leere Eingabe', () => {
  assert.strictEqual(TT.checkAnswer('  ', task('go', 'he', 'past-simple', 'aff')).kind, 'empty');
});

test('andere Zeitform wird erkannt', () => {
  const d = TT.checkAnswer('has written', task('write', 'she', 'past-simple', 'aff'));
  assert.deepStrictEqual([d.ok, d.kind, d.used], [false, 'wrong-tense', 'present-perfect']);
});

test('andere Zeitform ohne bekanntes Subjekt (Geschichten)', () => {
  const t = { accept: ['had been waiting'], verb: VB.wait, tense: 'past-perfect-progressive', polarity: 'aff' };
  const d = TT.checkAnswer('was waiting', t);
  assert.strictEqual(d.kind, 'wrong-tense');
  assert.strictEqual(d.used, 'past-progressive');
});

test('Partizip-Fehler in beide Richtungen', () => {
  const d1 = TT.checkAnswer('has went', task('go', 'he', 'present-perfect', 'aff'));
  assert.deepStrictEqual([d1.kind, d1.want, d1.expectedWord], ['participle', 'pp', 'gone']);
  const d2 = TT.checkAnswer('gone', task('go', 'he', 'past-simple', 'aff'));
  assert.deepStrictEqual([d2.kind, d2.want, d2.expectedWord], ['participle', 'past', 'went']);
  const d3 = TT.checkAnswer('is ran', task('run', 'he', 'present-progressive', 'aff'));
  assert.strictEqual(d3.kind, 'other');
});

test('regelmäßig gebildetes unregelmäßiges Verb', () => {
  const d = TT.checkAnswer('writed', task('write', 'I', 'past-simple', 'aff'));
  assert.deepStrictEqual([d.kind, d.expectedWord], ['regularized', 'wrote']);
});

test('Kongruenz', () => {
  assert.strictEqual(TT.checkAnswer('have worked', task('work', 'he', 'present-perfect', 'aff')).kind, 'agreement');
  assert.strictEqual(TT.checkAnswer("don't work", task('work', 'he', 'present-simple', 'neg')).kind, 'agreement');
  assert.strictEqual(TT.checkAnswer('work', task('work', 'he', 'present-simple', 'aff')).kind, 'agreement');
  assert.strictEqual(TT.checkAnswer('is working', task('work', 'I', 'present-progressive', 'aff')).kind, 'agreement');
});

test('Schreibweise von ing- und s-Form', () => {
  assert.strictEqual(TT.checkAnswer('is runing', task('run', 'he', 'present-progressive', 'aff')).kind, 'spelling');
  assert.strictEqual(TT.checkAnswer('studys', task('study', 'he', 'present-simple', 'aff')).kind, 'spelling');
});

test('Zustandsverb in -ing-Form', () => {
  assert.strictEqual(TT.checkAnswer('am knowing', task('know', 'I', 'present-simple', 'aff')).kind, 'stative');
});

test('Zustandsverb-Hinweis nicht, wenn die Lösung selbst -ing hat (was having)', () => {
  const have = { base: 'have', past: 'had', pp: 'had', type: 'state', objects: [] };
  const t = { accept: ['was having'], verb: have, subject: SB.she, tense: 'past-progressive', polarity: 'aff' };
  assert.notStrictEqual(TT.checkAnswer('is having', t).kind, 'stative');
});

test('Unsinn ergibt other', () => {
  assert.strictEqual(TT.checkAnswer('banana', task('go', 'he', 'past-simple', 'aff')).kind, 'other');
});

test('Alternativen in accept werden akzeptiert', () => {
  const t = { accept: ['have lived', 'have been living'], verb: { base: 'live', past: 'lived', pp: 'lived', type: 'activity', objects: [] }, subject: SB.I, tense: 'present-perfect', polarity: 'aff' };
  assert.ok(TT.checkAnswer("I've been living", t).ok);
});

test('Tippfehler bei regelmäßigen Verben sind Schreibfehler, nicht „unregelmäßig“', () => {
  assert.strictEqual(TT.checkAnswer('studyed', task('study', 'I', 'past-simple', 'aff')).kind, 'spelling');
  assert.strictEqual(TT.checkAnswer('stoped', task('stop', 'I', 'past-simple', 'aff')).kind, 'spelling');
});

test('übergeneralisierte unregelmäßige Verben (runned, flied)', () => {
  assert.strictEqual(TT.checkAnswer('runned', task('run', 'I', 'past-simple', 'aff')).kind, 'regularized');
  assert.strictEqual(TT.checkAnswer('flied', task('fly', 'I', 'past-simple', 'aff')).kind, 'regularized');
});

test('anderes Verb auf -ing ist kein Schreibfehler', () => {
  assert.strictEqual(TT.checkAnswer('is eating', task('run', 'he', 'present-progressive', 'aff')).kind, 'other');
});

test('explain nennt beide Zeitformen und escaped Eingaben', () => {
  const t = task('write', 'she', 'past-simple', 'aff');
  const txt = TT.explain({ ok: false, kind: 'wrong-tense', used: 'present-perfect' }, t);
  assert.ok(txt.includes('Present Perfect') && txt.includes('Simple Past'), txt);
  const txt2 = TT.explain({ ok: false, kind: 'spelling', expectedWord: 'wrote', got: '<x>' }, t);
  assert.ok(txt2.includes('&lt;x&gt;'), txt2);
  for (const kind of ['participle', 'regularized', 'agreement', 'stative', 'empty', 'other']) {
    assert.ok(TT.explain({ ok: false, kind, want: 'pp', expectedWord: 'a', got: 'b' }, t).length > 5, kind);
  }
});

test('progressiveOk-Verb wird nie als stative diagnostiziert', () => {
  const sup = Object.assign({}, VB.know, { base: 'support', past: 'supported', pp: 'supported', progressiveOk: true });
  const tk = {
    accept: [TT.conjugate(sup, SB.she, 'present-simple', 'aff').full],
    verb: sup, subject: SB.she, tense: 'present-simple', polarity: 'aff',
  };
  const r = TT.checkAnswer('is supporting', tk);
  assert.strictEqual(r.ok, false);
  assert.notStrictEqual(r.kind, 'stative');
  const k = TT.checkAnswer('is knowing', task('know', 'she', 'present-simple', 'aff'));
  assert.strictEqual(k.kind, 'stative');
});

test('going to bei einer will-Aufgabe: kind going-to samt Erklärung', () => {
  const t = task('work', 'he', 'future-simple', 'aff');
  const r = TT.checkAnswer('is going to work', t);
  assert.deepStrictEqual(r, { ok: false, kind: 'going-to' });
  assert.strictEqual(TT.explain(r, t), '„going to“ passt hier nicht – bei Angeboten, Versprechen, Bitten und spontanen Entscheidungen steht „will“.');
  assert.strictEqual(TT.checkAnswer("isn't going to work", task('work', 'he', 'future-simple', 'neg')).kind, 'going-to');
  assert.notStrictEqual(TT.checkAnswer('is going to work', task('work', 'he', 'past-simple', 'aff')).kind, 'going-to');
});

test('Polarität: richtige Zeitform, aber falsche Satzart', () => {
  const neg = task('work', 'she', 'present-simple', 'neg');
  const r = TT.checkAnswer('works', neg);
  assert.strictEqual(r.kind, 'polarity');
  assert.strictEqual(TT.explain(r, neg), 'Richtige Zeitform – aber hier ist die verneinte Form gefragt.');
  const aff = task('work', 'she', 'present-simple', 'aff');
  const r2 = TT.checkAnswer("doesn't work", aff);
  assert.strictEqual(r2.kind, 'polarity');
  assert.strictEqual(TT.explain(r2, aff), 'Richtige Zeitform – aber hier ist die bejahte Form gefragt.');
});

test('Transform (strict): going to bekommt die will-Erklärung', () => {
  const t = Object.assign(task('write', 'he', 'future-simple', 'aff'), { strict: true });
  const r = TT.checkAnswer('is going to write', t);
  assert.strictEqual(r.kind, 'going-to');
  assert.strictEqual(TT.explain(r, t), 'Gefragt ist das will-Future: will + Grundform.');
});

test('Geschichten: going to akzeptiert → Kongruenz statt going-to', () => {
  const t = { accept: ['will get', 'is going to get'], verb: { base: 'get', past: 'got', pp: 'got', type: 'activity', objects: [] },
    tense: 'future-simple', polarity: 'aff' };
  assert.ok(TT.checkAnswer('is going to get', t).ok);
  const r = TT.checkAnswer('are going to get', t);
  assert.strictEqual(r.kind, 'agreement');
});

test('Kurzformen ohne Apostroph und BrE-Schreibweisen', () => {
  assert.deepStrictEqual(TT.normalizeVariants('doesnt work'), ['does not work']);
  assert.deepStrictEqual(TT.normalizeVariants('havent seen'), ['have not seen']);
  assert.deepStrictEqual(TT.normalizeVariants('wont go'), ['will not go']);
  assert.ok(TT.checkAnswer('doesnt work', task('work', 'she', 'present-simple', 'neg')).ok);
  assert.deepStrictEqual(TT.normalizeVariants('has learnt'), ['has learned']);
  assert.deepStrictEqual(TT.normalizeVariants('is queueing'), ['is queuing']);
});
