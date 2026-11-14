// Stunden: Anlegen, Ändern, Löschen, Prüfung, Zusammenführen und Bearbeiten als Text
const LL = TT.lessonLog;

test('Stunden: anlegen, ändern, löschen; Liste neueste zuerst', () => {
  const log = LL.defaults();
  const a = LL.add(log, { day: '2026-11-12', title: 'Lesson 4' }, 1000);
  const b = LL.add(log, { day: '2026-11-14', title: ' Lesson 5 ', words: [{ en: 'hedge', de: 'Hecke' }, { en: '', de: 'x' }] }, 2000);
  assert.ok(/^ls_[a-z0-9]{4,24}$/.test(a), a);
  assert.strictEqual(LL.get(log, b).title, 'Lesson 5');
  assert.deepStrictEqual(LL.get(log, b).words, [{ en: 'hedge', de: 'Hecke' }]);
  assert.deepStrictEqual(LL.list(log).map((x) => x.id), [b, a]);
  assert.ok(LL.update(log, a, { notes: 'meine Notiz', day: '2026-11-15' }, 3000));
  assert.strictEqual(log.items[a].t, 3000);
  assert.strictEqual(log.items[a].c, 1000);
  assert.strictEqual(LL.get(log, a).title, 'Lesson 4', 'andere Felder bleiben');
  assert.deepStrictEqual(LL.list(log).map((x) => x.id), [a, b]);
  assert.ok(!LL.update(log, a, { day: 'kaputt' }, 3500), 'ungültiges Datum wird abgelehnt');
  assert.ok(LL.remove(log, b, 4000));
  assert.deepStrictEqual(log.items[b], { t: 4000, c: 2000, f: null });
  assert.strictEqual(LL.get(log, b), null);
  assert.ok(!LL.update(log, b, { title: 'x' }, 5000), 'gelöschte Stunde bleibt gelöscht');
  assert.deepStrictEqual(LL.sanitize(JSON.parse(JSON.stringify(log))), log, 'übersteht Speichern und Laden');
});

test('Stunden: Prüfung verwirft Ungültiges, Zusammenführen nimmt die neuere Fassung', () => {
  const f = { day: '2026-11-14', title: 'x' };
  const s = LL.sanitize({ items: {
    ls_ok1234: { t: 5, c: 4, f },
    ls_gone99: { t: 6, c: 1, f: null },
    'bad id': { t: 5, c: 4, f },
    __proto__: { t: 5, c: 4, f },
    ls_badday1: { t: 5, c: 4, f: { day: '14.11.2026' } },
    ls_badtime: { t: 'x', c: 4, f },
  } });
  assert.deepStrictEqual(Object.keys(s.items).sort(), ['ls_gone99', 'ls_ok1234']);
  assert.deepStrictEqual(s.items.ls_ok1234.f.teacher, []);
  const hw = LL.sanitize({ items: { ls_hw1234: { t: 1, c: 1, f: { day: '2026-11-14', homework: [{ book: 'tb', page: '9', task: '' }, { book: 'wb', page: '', task: '' }] } } } });
  assert.deepStrictEqual(hw.items.ls_hw1234.f.homework, [{ book: 'other', page: '9', task: '' }]);

  const A = { items: { ls_aaaa11: { t: 10, c: 1, f: { day: '2026-11-14', title: 'alt' } } } };
  const B = { items: { ls_aaaa11: { t: 20, c: 1, f: { day: '2026-11-14', title: 'neu' } }, ls_bbbb22: { t: 5, c: 5, f: null } } };
  const m = LL.merge(A, B);
  assert.strictEqual(m.items.ls_aaaa11.f.title, 'neu');
  assert.strictEqual(m.items.ls_bbbb22.f, null);
  assert.deepStrictEqual(LL.merge(B, A), m, 'Reihenfolge egal');
});

test('Stunden: Abschnitte als Text bearbeiten', () => {
  const mistakes = [
    { said: 'more informations', fix: 'more information', why: 'information is uncountable – no plural' },
    { said: 'childs', fix: 'children', why: '' },
    { said: 'I watched it before', fix: 'I have watched it before', why: 'no point in time → present perfect — always' },
  ];
  assert.deepStrictEqual(LL.parseMistakes(LL.mistakeText(mistakes)), mistakes);
  assert.deepStrictEqual(LL.parseMistakes('- he want to -> he wants to | 3rd person -s'), [{ said: 'he want to', fix: 'he wants to', why: '3rd person -s' }]);

  const words = [{ en: 'to apply mulch', de: 'Mulch ausbringen' }, { en: 'well-known', de: 'bekannt' }];
  assert.deepStrictEqual(LL.parseWords(LL.wordText(words)), words);
  assert.deepStrictEqual(LL.parseWords('hedge = Hecke\nnur Englisch\ntidbit: Häppchen'), [{ en: 'hedge', de: 'Hecke' }, { en: 'tidbit', de: 'Häppchen' }]);

  const hw = [{ book: 'wb', page: '9–10', task: '' }, { book: 'sb', page: '15', task: 'Write a blog post' }, { book: 'other', page: '', task: 'Prepare a presentation' }];
  assert.deepStrictEqual(LL.parseHomework(LL.homeworkText(hw)), hw);
  assert.deepStrictEqual(LL.parseHomework('sb S. 20: Ex. 3'), [{ book: 'sb', page: '20', task: 'Ex. 3' }]);

  assert.deepStrictEqual(LL.parseList('- one\n\n2. two\n• three'), ['one', 'two', 'three']);
});

test('Stunden: erkennt Aufgaben, die schon im Hausaufgabenheft stehen', () => {
  const hw = TT.homework.defaults();
  TT.homework.add(hw, { day: '2026-11-14', book: 'wb', page: '9-10', task: '' }, 1000);
  TT.homework.add(hw, { day: '2026-11-14', book: 'other', page: '', task: 'Prepare a presentation' }, 1001);
  assert.ok(LL.inHomework(hw, '2026-11-14', { book: 'wb', page: '9–10', task: '' }));
  assert.ok(LL.inHomework(hw, '2026-11-14', { book: 'other', page: '', task: 'prepare a  presentation' }));
  assert.ok(!LL.inHomework(hw, '2026-11-13', { book: 'wb', page: '9–10', task: '' }), 'andere Stunde');
  assert.ok(!LL.inHomework(hw, '2026-11-14', { book: 'sb', page: '15', task: '' }));
});
