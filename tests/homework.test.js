// Hausaufgabenheft: Einträge, Abhaken, Löschen, Prüfung und Zusammenführen zwischen Geräten
const HWT = TT.homework;

test('Hausaufgaben: eintragen, abhaken, wieder öffnen, löschen; Liste sortiert', () => {
  const hw = HWT.defaults();
  const a = HWT.add(hw, { day: '2026-11-14', book: 'sb', page: ' 24 ', task: 'Übung 3a' }, 1000);
  const b = HWT.add(hw, { day: '2026-11-10', book: 'wb', page: '12', task: '' }, 2000);
  const c = HWT.add(hw, { day: 'kaputt', book: 'xyz', page: '', task: 'Vokabeln lernen' }, 3000);
  assert.ok(/^hw_[a-z0-9]{4,24}$/.test(a), a);
  assert.deepStrictEqual(hw.items[a].f, { day: '2026-11-14', book: 'sb', page: '24', task: 'Übung 3a', done: false });
  assert.strictEqual(hw.items[c].f.book, 'other');
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(hw.items[c].f.day));
  let l = HWT.list(hw);
  const ids = l.open.map((x) => x.id);
  assert.ok(ids.indexOf(b) < ids.indexOf(a), 'älteste Stunde zuerst');
  assert.ok(HWT.setDone(hw, a, true, 4000));
  l = HWT.list(hw);
  assert.deepStrictEqual(l.done.map((x) => x.id), [a]);
  assert.strictEqual(hw.items[a].t, 4000);
  assert.strictEqual(hw.items[a].c, 1000);
  HWT.setDone(hw, a, false, 5000);
  assert.strictEqual(HWT.list(hw).done.length, 0);
  assert.ok(HWT.remove(hw, b, 6000));
  assert.deepStrictEqual(hw.items[b], { t: 6000, c: 2000, f: null });
  assert.ok(!HWT.list(hw).open.some((x) => x.id === b));
  assert.ok(!HWT.setDone(hw, b, true, 7000), 'gelöschte Aufgabe bleibt gelöscht');
  assert.deepStrictEqual(HWT.sanitize(JSON.parse(JSON.stringify(hw))), hw, 'übersteht Speichern und Laden');
});

test('Hausaufgaben: Prüfung verwirft Ungültiges', () => {
  const f = { day: '2026-11-14', book: 'sb', page: '24', task: 'x', done: false };
  const s = HWT.sanitize({ items: {
    hw_ok1234: { t: 5, c: 4, f },
    hw_gone99: { t: 6, c: 1, f: null },
    'bad id': { t: 5, c: 4, f },
    __proto__: { t: 5, c: 4, f },
    hw_badday1: { t: 5, c: 4, f: Object.assign({}, f, { day: '14.11.2026' }) },
    hw_badbook: { t: 5, c: 4, f: Object.assign({}, f, { book: 'tb' }) },
    hw_empty11: { t: 5, c: 4, f: Object.assign({}, f, { page: ' ', task: '' }) },
    hw_long111: { t: 5, c: 4, f: Object.assign({}, f, { task: 'x'.repeat(301) }) },
    hw_notime1: { c: 4, f },
  } });
  assert.deepStrictEqual(Object.keys(s.items).sort(), ['hw_gone99', 'hw_ok1234']);
  assert.deepStrictEqual(HWT.sanitize(null), { items: {} });
});

test('Hausaufgaben: zwei Geräte – pro Aufgabe gewinnt die neuere Änderung, Löschen bleibt', () => {
  const f = (done, task) => ({ day: '2026-11-14', book: 'wb', page: '9', task, done });
  const A = { items: { hw_aaaa11: { t: 5, c: 1, f: f(true, 'a') }, hw_bbbb22: { t: 9, c: 2, f: null } } };
  const B = { items: { hw_aaaa11: { t: 3, c: 1, f: f(false, 'a') }, hw_bbbb22: { t: 4, c: 2, f: f(false, 'b') }, hw_cccc33: { t: 7, c: 3, f: f(false, 'c') } } };
  const m = HWT.merge(A, B);
  assert.deepStrictEqual(m, HWT.merge(B, A));
  assert.strictEqual(m.items.hw_aaaa11.f.done, true);
  assert.strictEqual(m.items.hw_bbbb22.f, null);
  assert.strictEqual(m.items.hw_cccc33.f.task, 'c');
  assert.deepStrictEqual(HWT.merge(m, m), m);
});
