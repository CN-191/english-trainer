const NOW = new Date('2026-11-02T12:00:00');
const EARLIER = new Date('2026-10-20T12:00:00');
const rng = () => TT.util.makeRng(5);

test('weight: neu 2, perfekt 1, schlecht 3', () => {
  const s = TT.store.defaults();
  assert.strictEqual(TT.session.weight(s, 'past-simple'), 2);
  for (let i = 0; i < 5; i++) TT.progress.record(s, { tense: 'past-simple', score: 1, ex: 'cloze', now: NOW });
  for (let i = 0; i < 5; i++) TT.progress.record(s, { tense: 'past-perfect', score: 0, ex: 'cloze', now: NOW });
  assert.strictEqual(TT.session.weight(s, 'past-simple'), 1);
  assert.strictEqual(TT.session.weight(s, 'past-perfect'), 3);
});

test('daily: 15 Aufgaben, höchstens 5 Wiederholungen', () => {
  const s = TT.store.defaults();
  for (let i = 0; i < 7; i++) TT.progress.addMistake(s, { tense: TT.TENSE_IDS[i], confusedWith: null, ex: 'translate', now: EARLIER });
  const tasks = TT.session.build({ mode: 'daily', state: s, now: NOW, rng: rng() });
  assert.strictEqual(tasks.length, 15);
  const reviews = tasks.filter((t) => t.reviewId);
  assert.strictEqual(reviews.length, 5);
  assert.ok(reviews.every((t) => t.ex === 'cloze'), 'translate-Wiederholung wird als Lückentext geübt');
  assert.ok(tasks.every((t) => (TT.session.EXERCISES.includes(t.ex) && TT.TENSE_IDS.includes(t.tense)) ||
    (TT.isLesson(t.tense) && TT.lesson(t.tense).kinds.includes(TT.lessonKind(t.ex)))));
});

test('free: nur gewählte Zeitformen und Übungen', () => {
  const tasks = TT.session.build({ mode: 'free', state: TT.store.defaults(), rng: rng(), tenses: ['past-perfect', 'past-simple'], exercises: ['identify'], count: 20 });
  assert.strictEqual(tasks.length, 20);
  assert.ok(tasks.every((t) => t.ex === 'identify' && ['past-perfect', 'past-simple'].includes(t.tense)));
});

test('free: leere Listen bedeuten alle', () => {
  const tasks = TT.session.build({ mode: 'free', state: TT.store.defaults(), rng: rng(), tenses: [], exercises: [], count: 10 });
  assert.strictEqual(tasks.length, 10);
});

test('duel: nur das Paar, passende Übungen, Paar am Task', () => {
  const pair = ['present-perfect', 'past-simple'];
  const tasks = TT.session.build({ mode: 'duel', state: TT.store.defaults(), rng: rng(), tenses: pair });
  assert.strictEqual(tasks.length, 16);
  assert.ok(tasks.every((t) => pair.includes(t.tense) && ['cloze', 'identify', 'errorspot'].includes(t.ex)));
  assert.deepStrictEqual(tasks[0].duel, pair);
});

test('review: alle fälligen, älteste zuerst', () => {
  const s = TT.store.defaults();
  TT.progress.addMistake(s, { tense: 'past-perfect', confusedWith: 'past-simple', ex: 'identify', now: EARLIER });
  TT.progress.addMistake(s, { tense: 'future-perfect', confusedWith: null, ex: 'story', now: NOW });
  const tasks = TT.session.build({ mode: 'review', state: s, now: NOW });
  assert.deepStrictEqual(tasks.map((t) => [t.tense, t.ex, t.confusedWith]), [['past-perfect', 'identify', 'past-simple']]);
});

test('insertRepeat fügt 3–5 Positionen später ein', () => {
  const tasks = Array.from({ length: 10 }, (_, i) => ({ ex: 'cloze', tense: TT.TENSE_IDS[i] }));
  const original = Object.assign({ reviewId: 'r1' }, tasks[2]);
  const pos = TT.session.insertRepeat(tasks, 2, original, rng());
  assert.ok(pos >= 5 && pos <= 7, String(pos));
  assert.strictEqual(tasks.length, 11);
  assert.strictEqual(tasks[pos].repeat, true);
  assert.strictEqual(tasks[pos].reviewId, undefined);
  const end = TT.session.insertRepeat(tasks, 10, tasks[10], rng());
  assert.strictEqual(end, 11);
});

test('unbekannter Modus wirft', () => {
  assert.throws(() => TT.session.build({ mode: 'nope', state: TT.store.defaults() }), /Unbekannter Modus/);
});

test('duel: ungültige Paare werfen', () => {
  const invalid = [undefined, [], ['past-simple'], ['past-simple', 'past-simple'], ['past-simple', 'nope']];
  for (const tenses of invalid) {
    assert.throws(() => TT.session.build({ mode: 'duel', state: TT.store.defaults(), rng: rng(), tenses }), /zwei verschiedene Zeitformen/);
  }
});

test('duel: beide Zeitformen gleich oft', () => {
  const pair = ['present-perfect', 'past-simple'];
  const tasks = TT.session.build({ mode: 'duel', state: TT.store.defaults(), rng: rng(), tenses: pair, count: 16 });
  assert.strictEqual(tasks.filter((t) => t.tense === pair[0]).length, 8);
  assert.strictEqual(tasks.filter((t) => t.tense === pair[1]).length, 8);
});
