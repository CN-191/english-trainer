// Unterrichtsthemen in Speicher und Übungsrunden
const NOW = new Date(2026, 10, 6, 12);

test('Speicher: Verlauf und Fehlerkiste für Unterrichtsthemen bleiben erhalten', () => {
  const s = TT.store.importText(JSON.stringify({
    version: 1,
    history: { passive: [{ t: 1, score: 1, ex: 'l-cloze' }, { t: 2, score: 0, ex: 'l-Bogus!' }], 'Quatsch!': [{ t: 1, score: 1, ex: 'cloze' }] },
    review: [{ id: 'r1', tense: 'pronouns', confusedWith: null, ex: 'l-errorspot', box: 1, due: 5 }],
    confusions: { 'passive>past-simple': 2 },
  }));
  assert.deepStrictEqual(s.history.passive, [{ t: 1, score: 1, ex: 'l-cloze' }]);
  assert.strictEqual(s.history['Quatsch!'], undefined);
  assert.strictEqual(s.review.length, 1);
  assert.deepStrictEqual(s.confusions, {});
});

test('Speicher: Themen aus einer anderen App-Version bleiben erhalten, werden aber nicht abgefragt', () => {
  const st = TT.store.defaults();
  st.history['relative-clauses'] = [{ t: 1, score: 1, ex: 'l-cloze' }, { t: 2, score: 0, ex: 'l-gapfill' }];
  st.review.push({ id: 'rf', tense: 'relative-clauses', confusedWith: null, ex: 'l-cloze', box: 1, due: 5 });
  st.review.push({ id: 'rg', tense: 'passive', confusedWith: null, ex: 'l-gapfill', box: 1, due: 5 });
  const again = TT.store.importText(TT.store.exportText(st));
  assert.deepStrictEqual(again, st);
  assert.deepStrictEqual(TT.progress.dueReviews(again, NOW), []);
  assert.deepStrictEqual(TT.session.build({ mode: 'review', state: again, rng: TT.util.makeRng(4), now: NOW }), []);
  const daily = TT.session.build({ mode: 'daily', state: again, rng: TT.util.makeRng(4), now: NOW });
  assert.ok(daily.every((t) => !t.reviewId && (TT.isLesson(t.tense) || TT.TENSE_IDS.includes(t.tense))));
});

test('Fehlerkiste: ungültige Kombinationen aus Thema und Übungsart werden nicht abgespielt', () => {
  const st = TT.store.importText(JSON.stringify({
    version: 1,
    review: [
      { id: 'a', tense: 'passive', confusedWith: null, ex: 'cloze', box: 1, due: 5 },
      { id: 'b', tense: 'past-simple', confusedWith: null, ex: 'l-cloze', box: 1, due: 5 },
      { id: 'c', tense: 'pronouns', confusedWith: null, ex: 'l-cloze', box: 1, due: 6 },
      { id: 'd', tense: 'past-simple', confusedWith: null, ex: 'identify', box: 1, due: 7 },
    ],
  }));
  assert.strictEqual(st.review.length, 4); // gespeichert bleibt alles
  assert.deepStrictEqual(TT.progress.dueReviews(st, NOW).map((r) => r.id), ['c', 'd']);
  const tasks = TT.session.build({ mode: 'review', state: st, rng: TT.util.makeRng(5), now: NOW });
  assert.deepStrictEqual(tasks.map((t) => t.tense + '/' + t.ex), ['pronouns/l-cloze', 'past-simple/identify']);
});

test('Speicher: ein bestehender Stand ohne Unterrichtsthemen bleibt vollständig erhalten', () => {
  const old = TT.store.defaults();
  old.updatedAt = 1793700000000;
  old.settings = { theme: 'dark', inputMode: 'choice' };
  TT.progress.record(old, { tense: 'past-simple', score: 1, ex: 'cloze', now: NOW });
  TT.progress.record(old, { tense: 'present-perfect', score: 0, ex: 'identify', usedTense: 'past-simple', now: NOW });
  TT.progress.addMistake(old, { tense: 'present-perfect', confusedWith: 'past-simple', ex: 'identify', now: NOW });
  old.stories.s1 = { best: 0.8 };
  const again = TT.store.importText(TT.store.exportText(old));
  assert.deepStrictEqual(again, old);
});

test('Session: Unterrichts-Runde mit 10 Aufgaben aus dem gewählten Thema', () => {
  const rng = TT.util.makeRng(1);
  const tasks = TT.session.build({ mode: 'lesson', topics: ['passive'], count: 10, state: TT.store.defaults(), rng, now: NOW });
  assert.strictEqual(tasks.length, 10);
  assert.ok(tasks.every((t) => t.tense === 'passive' && TT.lessonKind(t.ex)));
  assert.ok(new Set(tasks.map((t) => t.ex)).size > 1);
  assert.throws(() => TT.session.build({ mode: 'lesson', topics: ['past-simple'], state: TT.store.defaults(), rng, now: NOW }), /Unterrichtsthema/);
});

test('Tägliches Training: mischt Zeitformen und Themen, ausgeschaltete Themen kommen nicht vor', () => {
  const rng = TT.util.makeRng(2);
  const st = TT.store.defaults();
  const seen = new Set();
  for (let i = 0; i < 40; i++) TT.session.build({ mode: 'daily', state: st, rng, now: NOW }).forEach((t) => seen.add(t.tense));
  assert.ok(TT.TENSE_IDS.some((id) => seen.has(id)) && TT.LESSON_IDS.some((id) => seen.has(id)));
  // alles aus außer zwei Themen
  TT.daily.set(st, TT.daily.topics(), false, NOW);
  TT.daily.set(st, ['past-simple', 'pronouns'], true, NOW);
  assert.deepStrictEqual(TT.daily.enabled(st), ['past-simple', 'pronouns']);
  for (let i = 0; i < 20; i++) {
    const tasks = TT.session.build({ mode: 'daily', state: st, rng, now: NOW });
    assert.strictEqual(tasks.length, 15);
    assert.ok(tasks.every((t) => ['past-simple', 'pronouns'].includes(t.tense)), JSON.stringify(tasks));
  }
});

test('Tägliches Training: alles aus → nur fällige Wiederholungen, ohne Wiederholungen leer', () => {
  const st = TT.store.defaults();
  TT.daily.set(st, TT.daily.topics(), false, NOW);
  assert.deepStrictEqual(TT.session.build({ mode: 'daily', state: st, rng: TT.util.makeRng(4), now: NOW }), []);
  // ausgeschaltetes Thema mit Fehler: Fehlerkiste bleibt
  TT.progress.addMistake(st, { tense: 'passive', confusedWith: null, ex: 'l-cloze', now: new Date(2026, 10, 1, 12) });
  const tasks = TT.session.build({ mode: 'daily', state: st, rng: TT.util.makeRng(4), now: NOW });
  assert.strictEqual(tasks.length, 1);
  assert.strictEqual(tasks[0].tense, 'passive');
});

test('Tägliches Training: Schalter werden gespeichert, geprüft und nach Zeitstempel zusammengeführt', () => {
  const st = TT.store.defaults();
  assert.ok(TT.daily.isOn(st, 'passive'));
  TT.daily.set(st, 'passive', false, new Date(5));
  assert.deepStrictEqual(st.daily, { passive: { t: 5, on: false } });
  assert.ok(!TT.daily.isOn(st, 'passive'));
  const clean = TT.store.importText(JSON.stringify(Object.assign({}, st, { daily: { passive: { t: 5, on: false }, '__proto__': { t: 1, on: true }, 'BAD ID': { t: 1, on: false }, x9: { t: 'a', on: true } } })));
  assert.deepStrictEqual(clean.daily, { passive: { t: 5, on: false } });
  const a = TT.store.defaults();
  const b = TT.store.defaults();
  a.daily = { passive: { t: 5, on: false }, pronouns: { t: 9, on: false } };
  b.daily = { passive: { t: 7, on: true } };
  const m = TT.sync.merge(a, b, 10);
  assert.deepStrictEqual(m.daily, { passive: { t: 7, on: true }, pronouns: { t: 9, on: false } });
});

test('Lernstand bleibt: ein Stand der Vorversion (ohne daily, mit Themen) kommt unverändert durch sanitize', () => {
  const old = {
    version: 1, updatedAt: 123, settings: { theme: 'dark', inputMode: 'choice' },
    history: { 'past-simple': [{ t: 1, score: 1, ex: 'cloze' }], 'what-clauses': [{ t: 2, score: 0.5, ex: 'l-transform' }], 'future-topic': [{ t: 3, score: 0, ex: 'l-newkind' }] },
    confusions: { 'past-simple>present-perfect': 2 },
    review: [{ id: 'r1', tense: 'passive', confusedWith: null, ex: 'l-cloze', box: 2, due: 99 }],
    days: { '2026-11-01': 4 }, stories: { s1: { best: 0.5 } },
  };
  const again = TT.store.importText(JSON.stringify(old));
  for (const k of Object.keys(old)) assert.deepStrictEqual(again[k], old[k], k);
  assert.deepStrictEqual(again.daily, {});
});

test('Session: Fehler aus Unterrichtsthemen kommen mit derselben Übungsart wieder', () => {
  const st = TT.store.defaults();
  TT.progress.addMistake(st, { tense: 'what-clauses', confusedWith: null, ex: 'l-transform', now: new Date(2026, 10, 1, 12) });
  const tasks = TT.session.build({ mode: 'review', state: st, rng: TT.util.makeRng(3), now: NOW });
  assert.strictEqual(tasks.length, 1);
  assert.strictEqual(tasks[0].ex, 'l-transform');
  assert.strictEqual(tasks[0].tense, 'what-clauses');
});

test('Pronomen einsetzen: nur l-replace wird abgefragt und geübt', () => {
  const st = TT.store.defaults();
  st.review.push({ id: 'a', tense: 'pronoun-replace', confusedWith: null, ex: 'l-replace', box: 1, due: 0 },
    { id: 'b', tense: 'pronoun-replace', confusedWith: null, ex: 'l-cloze', box: 1, due: 0 },
    { id: 'c', tense: 'pronouns', confusedWith: null, ex: 'l-replace', box: 1, due: 0 });
  assert.deepStrictEqual(TT.progress.dueReviews(st, NOW).map((r) => r.id), ['a']);
  const tasks = TT.session.build({ mode: 'lesson', topics: ['pronoun-replace'], count: 10, state: st, rng: TT.util.makeRng(4), now: NOW });
  assert.strictEqual(tasks.length, 10);
  assert.ok(tasks.every((t) => t.ex === 'l-replace' && t.tense === 'pronoun-replace'));
  const again = TT.store.importText(TT.store.exportText(st));
  assert.strictEqual(again.review.length, 3);
});

test('Tägliches Training: freie Plätze je zur Hälfte Zeitformen und Themen', () => {
  const rng = TT.util.makeRng(9);
  const st = TT.store.defaults();
  const tasks = TT.session.build({ mode: 'daily', state: st, rng, now: NOW });
  assert.strictEqual(tasks.length, 15);
  assert.strictEqual(tasks.filter((t) => TT.TENSE_IDS.includes(t.tense)).length, 8);
  assert.strictEqual(tasks.filter((t) => TT.isLesson(t.tense)).length, 7);
  // nur Themen an → alle Plätze Themen
  TT.daily.set(st, TT.TENSE_IDS, false, NOW);
  assert.ok(TT.session.build({ mode: 'daily', state: st, rng, now: NOW }).every((t) => TT.isLesson(t.tense)));
});
