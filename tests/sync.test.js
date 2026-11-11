const Y = TT.sync;
const P = TT.progress;

function stateWith(updatedAt, fill) {
  const s = TT.store.defaults();
  s.updatedAt = updatedAt;
  if (fill) fill(s);
  return s;
}

test('reconcile: keine Cloud-Daten -> lokalen Stand hochladen', () => {
  const r = Y.reconcile(stateWith(0), null, { baseAt: 0, dirty: false }, false, 100);
  assert.deepStrictEqual(r, { state: null, push: true });
});

test('reconcile: leeres Gerät (z. B. Handy nach Neuladen) übernimmt die Cloud', () => {
  const remote = stateWith(50, (s) => P.record(s, { tense: 'past-simple', score: 1, ex: 'cloze', now: new Date(2026, 10, 2) }));
  const local = TT.store.defaults();
  const meta = { baseAt: 0, dirty: Y.hasProgress(local) };
  const r = Y.reconcile(local, remote, meta, false, 100);
  assert.strictEqual(r.state, remote);
  assert.strictEqual(r.push, false);
});

test('reconcile: eigenes Echo ändert nichts', () => {
  const remote = stateWith(70);
  assert.deepStrictEqual(Y.reconcile(stateWith(70), remote, { baseAt: 70, dirty: false }, false, 100), { state: null, push: false });
  assert.deepStrictEqual(Y.reconcile(stateWith(80), remote, { baseAt: 70, dirty: true }, false, 100), { state: null, push: true });
});

test('reconcile: neuer Stand vom anderen Gerät wird übernommen', () => {
  const remote = stateWith(90);
  const r = Y.reconcile(stateWith(70), remote, { baseAt: 70, dirty: false }, false, 100);
  assert.strictEqual(r.state, remote);
  assert.strictEqual(r.push, false);
});

test('reconcile: beide Geräte geändert -> vereinigen und hochladen', () => {
  const local = stateWith(80, (s) => P.record(s, { tense: 'past-simple', score: 1, ex: 'cloze', now: new Date(2026, 10, 2, 9) }));
  const remote = stateWith(90, (s) => P.record(s, { tense: 'past-simple', score: 0, ex: 'identify', now: new Date(2026, 10, 2, 10) }));
  const r = Y.reconcile(local, remote, { baseAt: 70, dirty: true }, false, 100);
  assert.strictEqual(r.push, true);
  assert.strictEqual(r.state.history['past-simple'].length, 2);
  assert.ok(r.state.updatedAt > 90);
});

test('reconcile: während eines Schreibvorgangs wird vereinigt statt überschrieben', () => {
  const r = Y.reconcile(stateWith(80), stateWith(90), { baseAt: 80, dirty: false }, true, 100);
  assert.strictEqual(r.push, true);
  assert.notStrictEqual(r.state, null);
});

test('merge: Verlauf ohne Doppelte, sortiert, höchstens 20', () => {
  const a = stateWith(1, (s) => { s.history['past-simple'] = Array.from({ length: 15 }, (_, i) => ({ t: i * 2, score: 1, ex: 'cloze' })); });
  const b = stateWith(2, (s) => { s.history['past-simple'] = Array.from({ length: 15 }, (_, i) => ({ t: i * 2 + 1, score: 0, ex: 'cloze' })).concat([{ t: 28, score: 1, ex: 'cloze' }]); });
  const m = Y.merge(a, b, 0);
  const list = m.history['past-simple'];
  assert.strictEqual(list.length, 20);
  assert.strictEqual(list[0].t, 10);
  assert.strictEqual(list[19].t, 29);
  assert.strictEqual(list.filter((e) => e.t === 28).length, 1);
});

test('merge: Zähler, Tage, Geschichten nehmen das Maximum, Einstellungen vom neueren Stand', () => {
  const a = stateWith(5, (s) => {
    s.confusions['past-simple>present-perfect'] = 3;
    s.days['2026-11-02'] = 4;
    s.stories.s1 = { best: 0.9 };
    s.settings.theme = 'light';
  });
  const b = stateWith(9, (s) => {
    s.confusions['past-simple>present-perfect'] = 1;
    s.confusions['future-simple>future-progressive'] = 2;
    s.days['2026-11-03'] = 6;
    s.stories.s1 = { best: 0.5 };
    s.stories.s2 = { best: 1 };
    s.settings.theme = 'dark';
  });
  const m = Y.merge(a, b, 0);
  assert.deepStrictEqual(m.confusions, { 'past-simple>present-perfect': 3, 'future-simple>future-progressive': 2 });
  assert.deepStrictEqual(m.days, { '2026-11-02': 4, '2026-11-03': 6 });
  assert.deepStrictEqual(m.stories, { s1: { best: 0.9 }, s2: { best: 1 } });
  assert.strictEqual(m.settings.theme, 'dark');
});

test('merge: Fehlerkiste hat pro Fehlerart einen Eintrag, der neuere gewinnt', () => {
  const old = { id: 'a', tense: 'past-simple', confusedWith: 'present-perfect', ex: 'cloze', box: 1, due: 10 };
  const neu = { id: 'b', tense: 'past-simple', confusedWith: 'present-perfect', ex: 'cloze', box: 3, due: 30 };
  const other = { id: 'c', tense: 'past-perfect', confusedWith: null, ex: 'identify', box: 2, due: 20 };
  const m = Y.merge(stateWith(1, (s) => s.review.push(old, other)), stateWith(2, (s) => s.review.push(neu)), 0);
  assert.strictEqual(m.review.length, 2);
  assert.deepStrictEqual(m.review.find((r) => r.tense === 'past-simple'), neu);
});

test('merge: Ergebnis übersteht Export und Import', () => {
  const a = stateWith(1, (s) => P.addMistake(s, { tense: 'past-simple', confusedWith: null, ex: 'cloze', now: new Date(2026, 10, 2) }));
  const m = Y.merge(a, stateWith(2), 50);
  assert.deepStrictEqual(TT.store.importText(TT.store.exportText(m)), m);
});

test('hasProgress erkennt leeren Stand', () => {
  assert.strictEqual(Y.hasProgress(TT.store.defaults()), false);
  assert.strictEqual(Y.hasProgress(stateWith(0, (s) => { s.days['2026-11-02'] = 1; })), true);
});

test('Import behält den Zeitstempel', () => {
  assert.strictEqual(TT.store.importText('{"version":1,"updatedAt":123}').updatedAt, 123);
  assert.strictEqual(TT.store.importText('{"version":1,"updatedAt":"x"}').updatedAt, 0);
});

test('canon: Schlüsselreihenfolge spielt keine Rolle', () => {
  assert.strictEqual(Y.canon({ b: 1, a: [2, { d: 3, c: 4 }] }), Y.canon({ a: [2, { c: 4, d: 3 }], b: 1 }));
  assert.notStrictEqual(Y.canon({ a: [1, 2] }), Y.canon({ a: [2, 1] }));
});
