const V = {
  work: { base: 'work', past: 'worked', pp: 'worked', type: 'activity', objects: [] },
  write: { base: 'write', past: 'wrote', pp: 'written', type: 'activity', objects: [] },
  go: { base: 'go', past: 'went', pp: 'gone', type: 'event', objects: [] },
  study: { base: 'study', past: 'studied', pp: 'studied', type: 'activity', objects: [] },
  watch: { base: 'watch', past: 'watched', pp: 'watched', type: 'activity', objects: [] },
  have: { base: 'have', past: 'had', pp: 'had', type: 'state', objects: [] },
  make: { base: 'make', past: 'made', pp: 'made', type: 'activity', objects: [] },
  lie: { base: 'lie', past: 'lay', pp: 'lain', type: 'activity', objects: [] },
  see: { base: 'see', past: 'saw', pp: 'seen', type: 'event', objects: [] },
  stop: { base: 'stop', past: 'stopped', pp: 'stopped', type: 'event', objects: [] },
  swim: { base: 'swim', past: 'swam', pp: 'swum', type: 'activity', objects: [] },
  play: { base: 'play', past: 'played', pp: 'played', type: 'activity', objects: [] },
  fix: { base: 'fix', past: 'fixed', pp: 'fixed', type: 'event', objects: [] },
  begin: { base: 'begin', past: 'began', pp: 'begun', ing: 'beginning', type: 'event', objects: [] },
  travel: { base: 'travel', past: 'travelled', pp: 'travelled', ing: 'travelling', type: 'activity', objects: [] },
  visit: { base: 'visit', past: 'visited', pp: 'visited', type: 'event', objects: [] },
  open: { base: 'open', past: 'opened', pp: 'opened', type: 'event', objects: [] },
  cook: { base: 'cook', past: 'cooked', pp: 'cooked', type: 'activity', objects: [] },
  quit: { base: 'quit', past: 'quit', pp: 'quit', type: 'event', objects: [] },
  quiz: { base: 'quiz', past: 'quizzed', pp: 'quizzed', type: 'activity', objects: [] },
};
const S = {
  I: { text: 'I', person: 1, number: 'sg' },
  you: { text: 'you', person: 2, number: 'sg' },
  he: { text: 'he', person: 3, number: 'sg' },
  she: { text: 'my sister', person: 3, number: 'sg' },
  we: { text: 'we', person: 1, number: 'pl' },
  they: { text: 'the kids', person: 3, number: 'pl' },
};
const c = (v, s, t, p) => TT.conjugate(V[v], S[s], t, p);

test('s-Formen', () => {
  const exp = { work: 'works', go: 'goes', study: 'studies', watch: 'watches', play: 'plays', fix: 'fixes', have: 'has' };
  for (const [v, s] of Object.entries(exp)) assert.strictEqual(TT.sForm(V[v]), s, v);
});

test('ing-Formen', () => {
  const exp = { make: 'making', lie: 'lying', see: 'seeing', stop: 'stopping', swim: 'swimming', play: 'playing',
    begin: 'beginning', travel: 'travelling', visit: 'visiting', open: 'opening', cook: 'cooking', fix: 'fixing', write: 'writing',
    quit: 'quitting', quiz: 'quizzing' };
  for (const [v, s] of Object.entries(exp)) assert.strictEqual(TT.ingForm(V[v]), s, v);
});

test('Simple Present: bejaht, verneint, Frage', () => {
  assert.strictEqual(c('work', 'he', 'present-simple', 'aff').full, 'works');
  assert.strictEqual(c('work', 'they', 'present-simple', 'aff').full, 'work');
  assert.strictEqual(c('work', 'he', 'present-simple', 'neg').full, "doesn't work");
  assert.strictEqual(c('work', 'I', 'present-simple', 'neg').full, "don't work");
  assert.deepStrictEqual(c('work', 'she', 'present-simple', 'q'), { full: 'does work', aux: 'does', rest: 'work' });
});

test('Present Progressive: am/is/are', () => {
  assert.strictEqual(c('work', 'I', 'present-progressive', 'aff').full, 'am working');
  assert.strictEqual(c('work', 'she', 'present-progressive', 'aff').full, 'is working');
  assert.strictEqual(c('work', 'you', 'present-progressive', 'aff').full, 'are working');
  assert.strictEqual(c('work', 'I', 'present-progressive', 'neg').full, 'am not working');
  assert.strictEqual(c('work', 'they', 'present-progressive', 'neg').full, "aren't working");
  assert.deepStrictEqual(c('work', 'I', 'present-progressive', 'q'), { full: 'am working', aux: 'am', rest: 'working' });
});

test('Present Perfect (Progressive): have/has', () => {
  assert.strictEqual(c('write', 'she', 'present-perfect', 'aff').full, 'has written');
  assert.strictEqual(c('write', 'we', 'present-perfect', 'neg').full, "haven't written");
  assert.strictEqual(c('write', 'he', 'present-perfect-progressive', 'aff').full, 'has been writing');
  assert.deepStrictEqual(c('write', 'you', 'present-perfect-progressive', 'q'), { full: 'have been writing', aux: 'have', rest: 'been writing' });
});

test('Past-Formen', () => {
  assert.strictEqual(c('write', 'she', 'past-simple', 'aff').full, 'wrote');
  assert.strictEqual(c('write', 'she', 'past-simple', 'neg').full, "didn't write");
  assert.deepStrictEqual(c('go', 'they', 'past-simple', 'q'), { full: 'did go', aux: 'did', rest: 'go' });
  assert.strictEqual(c('write', 'I', 'past-progressive', 'aff').full, 'was writing');
  assert.strictEqual(c('write', 'you', 'past-progressive', 'aff').full, 'were writing');
  assert.strictEqual(c('write', 'they', 'past-progressive', 'neg').full, "weren't writing");
  assert.strictEqual(c('write', 'he', 'past-perfect', 'aff').full, 'had written');
  assert.strictEqual(c('write', 'he', 'past-perfect', 'neg').full, "hadn't written");
  assert.strictEqual(c('write', 'we', 'past-perfect-progressive', 'aff').full, 'had been writing');
});

test('Future-Formen', () => {
  assert.strictEqual(c('write', 'she', 'future-simple', 'aff').full, 'will write');
  assert.strictEqual(c('write', 'she', 'future-simple', 'neg').full, "won't write");
  assert.strictEqual(c('write', 'I', 'future-progressive', 'aff').full, 'will be writing');
  assert.strictEqual(c('write', 'they', 'future-perfect', 'aff').full, 'will have written');
  assert.deepStrictEqual(c('write', 'you', 'future-perfect', 'q'), { full: 'will have written', aux: 'will', rest: 'have written' });
  assert.strictEqual(c('write', 'he', 'future-perfect-progressive', 'neg').full, "won't have been writing");
});

test('Verneinung: aux und rest', () => {
  assert.deepStrictEqual(c('work', 'I', 'present-progressive', 'neg'), { full: 'am not working', aux: 'am not', rest: 'working' });
  assert.deepStrictEqual(c('work', 'he', 'present-simple', 'neg'), { full: "doesn't work", aux: "doesn't", rest: 'work' });
  assert.deepStrictEqual(c('write', 'they', 'future-perfect', 'neg'), { full: "won't have written", aux: "won't", rest: 'have written' });
});

test('Frage im Plural', () => {
  assert.deepStrictEqual(c('work', 'they', 'present-simple', 'q'), { full: 'do work', aux: 'do', rest: 'work' });
  assert.deepStrictEqual(c('write', 'we', 'past-progressive', 'q'), { full: 'were writing', aux: 'were', rest: 'writing' });
});

test('aff: aux ist null, rest = full', () => {
  assert.deepStrictEqual(c('go', 'he', 'present-perfect', 'aff'), { full: 'has gone', aux: null, rest: 'has gone' });
});

test('allForms liefert alle 12 Zeitformen', () => {
  const all = TT.allForms(V.go, S.he, 'aff');
  assert.deepStrictEqual(Object.keys(all), TT.TENSE_IDS);
  assert.strictEqual(all['past-perfect'].full, 'had gone');
});

test('unbekannte Zeitform oder Satzart wirft', () => {
  assert.throws(() => c('go', 'he', 'past-continuous', 'aff'), /Unbekannte Zeitform/);
  assert.throws(() => c('go', 'he', 'past-simple', 'question'), /Unbekannte Satzart/);
  assert.throws(() => TT.conjugate({ base: 'be', past: 'was', pp: 'been', type: 'state', objects: [] }, S.he, 'past-simple', 'aff'), /nicht unterstützt/);
});

test('goingTo: bejaht, verneint, Frage', () => {
  assert.deepStrictEqual(TT.goingTo(VB_GT.work, SB_GT.he, 'aff'), { full: 'is going to work', aux: null, rest: 'is going to work' });
  assert.deepStrictEqual(TT.goingTo(VB_GT.work, SB_GT.I, 'aff'), { full: 'am going to work', aux: null, rest: 'am going to work' });
  assert.strictEqual(TT.goingTo(VB_GT.work, SB_GT.they, 'aff').full, 'are going to work');
  assert.deepStrictEqual(TT.goingTo(VB_GT.work, SB_GT.he, 'neg'), { full: "isn't going to work", aux: "isn't", rest: 'going to work' });
  assert.deepStrictEqual(TT.goingTo(VB_GT.work, SB_GT.I, 'neg'), { full: 'am not going to work', aux: 'am not', rest: 'going to work' });
  assert.strictEqual(TT.goingTo(VB_GT.work, SB_GT.they, 'neg').full, "aren't going to work");
  assert.deepStrictEqual(TT.goingTo(VB_GT.work, SB_GT.they, 'q'), { full: 'are going to work', aux: 'are', rest: 'going to work' });
  assert.throws(() => TT.goingTo({ base: 'be', past: 'was', pp: 'been', type: 'state', objects: [] }, SB_GT.he, 'aff'), /nicht unterstützt/);
  assert.throws(() => TT.goingTo(VB_GT.work, SB_GT.he, 'question'), /Unbekannte Satzart/);
});
const VB_GT = { work: { base: 'work', past: 'worked', pp: 'worked', type: 'activity', objects: [] } };
const SB_GT = { I: { text: 'I', person: 1, number: 'sg' }, he: { text: 'he', person: 3, number: 'sg' }, they: { text: 'they', person: 3, number: 'pl' } };
