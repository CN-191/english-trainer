const TYPES = ['activity', 'event', 'state'];

test('Verben: eindeutig, vollständig, Mindestanzahlen', () => {
  const seen = new Set();
  for (const v of TT.VERBS) {
    assert.ok(!seen.has(v.base), 'doppelt: ' + v.base);
    seen.add(v.base);
    for (const k of ['base', 'past', 'pp', 'de']) assert.ok(v[k], `${v.base}: ${k} fehlt`);
    assert.ok(TYPES.includes(v.type), v.base);
    assert.ok(Array.isArray(v.objects), v.base);
    if (!v.lexiconOnly) assert.ok(v.objects.length >= 1, `${v.base}: braucht mindestens ein Objekt`);
    if (v.flex) assert.strictEqual(v.type, 'activity', `${v.base}: flex nur bei activity`);
    assert.notStrictEqual(v.base, 'be');
  }
  const count = (t) => TT.VERBS.filter((v) => !v.lexiconOnly && v.type === t).length;
  assert.ok(count('activity') >= 55, 'activity: ' + count('activity'));
  assert.ok(count('event') >= 40, 'event: ' + count('event'));
  assert.ok(count('state') >= 20, 'state: ' + count('state'));
});

test('Objekte ohne Possessivbegleiter', () => {
  for (const v of TT.VERBS) for (const o of v.objects) {
    assert.ok(!/\b(his|her|my|your|our|their)\b/.test(o), `${v.base}: ${o}`);
  }
});

test('jedes Verb lässt sich in allen Formen konjugieren', () => {
  const subj = { text: 'he', person: 3, number: 'sg' };
  for (const v of TT.VERBS) for (const p of ['aff', 'neg', 'q']) {
    const all = TT.allForms(v, subj, p);
    for (const id of TT.TENSE_IDS) assert.ok(!/undefined/.test(all[id].full), `${v.base} ${id} ${p}`);
  }
});

test('findVerb', () => {
  assert.strictEqual(TT.findVerb('write').pp, 'written');
  assert.strictEqual(TT.findVerb('nope'), undefined);
});

test('Subjekte: mindestens 40, eindeutig, gültig', () => {
  assert.ok(TT.SUBJECTS.length >= 40, String(TT.SUBJECTS.length));
  const seen = new Set();
  for (const s of TT.SUBJECTS) {
    assert.ok(!seen.has(s.text.toLowerCase()), 'doppelt: ' + s.text);
    seen.add(s.text.toLowerCase());
    assert.ok([1, 2, 3].includes(s.person) && ['sg', 'pl'].includes(s.number), s.text);
  }
  assert.strictEqual(TT.findSubject('My Sister').number, 'sg');
});

test('Slots sind befüllt', () => {
  for (const [name, list] of Object.entries(TT.SLOTS)) assert.ok(list.length >= 3, name);
});

test('Nebensatz-Bausteine verwenden bekannte Verben', () => {
  for (const key of ['events', 'actions', 'conditions']) {
    assert.ok(TT.SECONDARY[key].length >= 6, key);
    for (const s of TT.SECONDARY[key]) assert.ok(TT.findVerb(s.verb), `${key}: ${s.verb}`);
  }
});

test('Einordnung und Formen kritischer Verben', () => {
  const v = (b) => TT.findVerb(b);
  assert.strictEqual(v('recognise').type, 'event');
  assert.strictEqual(v('agree').type, 'event');
  assert.strictEqual(v('deserve'), undefined);
  for (const b of ['owe', 'adore', 'support']) assert.strictEqual(v(b).type, 'state', b);
  assert.ok(v('return').de.includes('zurückkehren'));
  const ing = { travel: 'travelling', forget: 'forgetting', begin: 'beginning', prefer: 'preferring', lie: 'lying', queue: 'queuing', swim: 'swimming', shop: 'shopping', visit: 'visiting', open: 'opening' };
  for (const [b, f] of Object.entries(ing)) assert.strictEqual(TT.ingForm(v(b)), f, b);
  const s = { tidy: 'tidies', have: 'has', do: 'does', go: 'goes', watch: 'watches', fix: 'fixes', carry: 'carries', fly: 'flies' };
  for (const [b, f] of Object.entries(s)) assert.strictEqual(TT.sForm(v(b)), f, b);
});
