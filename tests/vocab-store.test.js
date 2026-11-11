const VS = TT.vocabStore;
const card = (mod, reps) => [100, 2.5, 5, reps || 1, 0, 2, 50, 0, 3, mod];

test('vocabStore: Karte kodieren und dekodieren', () => {
  const c = { due: 120000, s: 2.30651, d: 5.11217071, reps: 2, lapses: 0, state: 2, last: 60000, step: 0, ivl: 3 };
  const a = VS.encode(c, 999);
  assert.deepStrictEqual(a, [2, 2.307, 5.112, 2, 0, 2, 1, 0, 3, 999]);
  assert.deepStrictEqual(VS.decode(a), { due: 120000, s: 2.307, d: 5.112, reps: 2, lapses: 0, state: 2, last: 60000, step: 0, ivl: 3 });
});

test('vocabStore: sanitize verwirft Ungültiges', () => {
  const s = VS.sanitize({
    cards: { 'about-adv:ed': card(1), 'about-adv:xx': card(1), 'Bad:ed': card(1), 'able-adj:de': [1, 2, 3], __proto__: card(1) },
    edits: {
      'about-adv': { t: 5, f: { de: 'ungefähr', hint: '', ex: 'About ten people came.', exDe: 'Ungefähr zehn Leute kamen.', emoji: '' } },
      'able-adj': { t: 5, f: { de: '', hint: '', ex: 'x', exDe: '', emoji: '' } },
      'ability-n': { t: 6, f: null },
    },
    suspended: { 'about-adv': { t: 1, on: true }, 'x-n': { t: 1, on: 'ja' } },
    settings: { t: 3, direction: 'de', newPerDay: 999999, levels: { A1: false, B2: 'x' }, order: 'mixed' },
    days: { '2026-11-03': { n: 2, r: -1 }, heute: { n: 1 } },
  });
  assert.deepStrictEqual(Object.keys(s.cards), ['about-adv:ed']);
  assert.deepStrictEqual(Object.keys(s.edits).sort(), ['ability-n', 'about-adv']);
  assert.deepStrictEqual(s.suspended, { 'about-adv': { t: 1, on: true } });
  assert.deepStrictEqual(s.settings, { t: 3, direction: 'de', newPerDay: 999999, levels: { A1: false, A2: true, B1: true, B2: true }, order: 'mixed' });
  assert.deepStrictEqual(s.days, { '2026-11-03': { n: 2, n2: 0, r: 0, ok: 0 } });
  assert.strictEqual(VS.sanitize({ settings: { newPerDay: 2.5 } }).settings.newPerDay, 20);
  assert.strictEqual(VS.sanitize({ settings: { newPerDay: -1 } }).settings.newPerDay, 20);
});

test('vocabStore: 11 Dokumente, Karten landen im Dokument ihres Niveaus und ihrer Richtung', () => {
  assert.strictEqual(VS.DOCS.length, 11);
  assert.deepStrictEqual(VS.DOCS.slice(0, 10), ['vocab-A1-ed', 'vocab-A1-de', 'vocab-A2-ed', 'vocab-A2-de', 'vocab-B1-ed', 'vocab-B1-de', 'vocab-B2-ed', 'vocab-B2-de', 'vocab-edits', 'vocab-meta']);
  assert.strictEqual(VS.cardDoc('about-adj:de'), 'vocab-B1-de');
  assert.strictEqual(VS.cardDoc('zone-n:ed'), 'vocab-B2-ed');
  const v = VS.defaults();
  v.cards['about-adj:de'] = card(1);
  v.cards['zone-n:ed'] = card(1);
  assert.deepStrictEqual(VS.part(v, 'vocab-B1-de'), { cards: { 'about-adj:de': card(1) } });
  assert.deepStrictEqual(VS.part(v, 'vocab-A1-ed'), { cards: {} });
  VS.applyPart(v, 'vocab-B1-de', { cards: { 'about-adj:de': card(7, 4) } });
  assert.deepStrictEqual(v.cards['about-adj:de'], card(7, 4));
  assert.deepStrictEqual(v.cards['zone-n:ed'], card(1));
});

test('vocabStore: Zusammenführen pro Karte, neuere Änderung gewinnt, verschiedene Karten bleiben', () => {
  const a = { cards: { 'about-adj:de': card(10, 1), 'able-adj:de': card(5, 1) } };
  const b = { cards: { 'about-adj:de': card(20, 2), 'absolute-adj:de': card(5, 1) } };
  const m = VS.mergePart('vocab-B1-de', a, b);
  assert.deepStrictEqual(m.cards['about-adj:de'], card(20, 2));
  assert.ok(m.cards['able-adj:de'] && m.cards['absolute-adj:de']);
  assert.deepStrictEqual(VS.mergePart('vocab-B1-de', b, a), m);
});

test('vocabStore: Bearbeitungen, Aussetzen, Einstellungen, Tageszähler zusammenführen', () => {
  const ed = { t: 5, f: { de: 'ungefähr', hint: '', ex: 'About ten came.', exDe: 'Etwa zehn kamen.', emoji: '' } };
  const e = VS.mergePart('vocab-edits', { edits: { 'about-adv': ed } }, { edits: { 'about-adv': { t: 9, f: null } } });
  assert.deepStrictEqual(e.edits['about-adv'], { t: 9, f: null });
  const m = VS.mergePart('vocab-meta',
    { suspended: { 'about-adv': { t: 2, on: true } }, settings: { t: 5, newPerDay: 30 }, days: { '2026-11-03': { n: 3, r: 10, ok: 8 } } },
    { suspended: { 'about-adv': { t: 1, on: false } }, settings: { t: 4, newPerDay: 10 }, days: { '2026-11-03': { n: 5, r: 2, ok: 2 } } });
  assert.deepStrictEqual(m.suspended['about-adv'], { t: 2, on: true });
  assert.strictEqual(m.settings.newPerDay, 30);
  assert.deepStrictEqual(m.days['2026-11-03'], { n: 5, n2: 0, r: 10, ok: 8 });
});

test('vocabStore: Import führt zusammen statt zu überschreiben', () => {
  const v = VS.defaults();
  v.cards['about-adj:de'] = card(10);
  VS.mergeAll(v, { cards: { 'zone-n:ed': card(3) }, settings: { t: 99, newPerDay: 5 } });
  assert.ok(v.cards['about-adj:de'] && v.cards['zone-n:ed']);
  assert.strictEqual(v.settings.newPerDay, 5);
});

const canonOf = (v) => JSON.stringify(v, (k, val) => (val && typeof val === 'object' && !Array.isArray(val)
  ? Object.fromEntries(Object.keys(val).sort().map((key) => [key, val[key]])) : val));

test('vocabStore: Grenzen gegen kaputte Uhren und Riesenwerte', () => {
  const s = VS.sanitize({
    cards: { 'about-adv:ed': [100, 2.5, 5, 1, 0, 2, 50, 0, 3, 1e300], 'able-adj:ed': [100, 1e9, 5, 1, 0, 2, 50, 0, 3, 5], 'ability-n:ed': card(5) },
    settings: { t: 1e300, newPerDay: 5 },
    edits: { 'about-adv': { t: 1e300, f: null } },
    suspended: { 'about-adv': { t: -1, on: true } },
  });
  assert.deepStrictEqual(Object.keys(s.cards), ['ability-n:ed']);
  assert.strictEqual(s.settings.t, 0);
  assert.strictEqual(s.settings.newPerDay, 5);
  assert.deepStrictEqual(s.edits, {});
  assert.deepStrictEqual(s.suspended, {});
});

test('vocabStore: __proto__ aus JSON, Zusammenführen idempotent und vertauschbar', () => {
  const s = VS.sanitize(JSON.parse('{"cards":{"__proto__":[1,1,1,1,0,2,1,0,1,1],"about-adv:ed":[1,1,1,1,0,2,1,0,1,1]},"days":{"__proto__":{"n":1}}}'));
  assert.deepStrictEqual(Object.keys(s.cards), ['about-adv:ed']);
  assert.deepStrictEqual(s.days, {});
  assert.strictEqual(({}).n, undefined);
  const ed = (t, de) => ({ t, f: de === null ? null : { de, hint: '', ex: 'About ten came.', exDe: 'Etwa zehn kamen.', emoji: '' } });
  const a = { edits: { 'about-adv': ed(5, 'ungefähr'), 'able-adj': ed(3, 'fähig') } };
  const b = { edits: { 'about-adv': ed(5, 'etwa'), 'ability-n': ed(1, null) } };
  const m = VS.mergePart('vocab-edits', a, b);
  assert.strictEqual(canonOf(m), canonOf(VS.mergePart('vocab-edits', b, a)));
  assert.strictEqual(canonOf(VS.mergePart('vocab-edits', m, m)), canonOf(m));
  const x = { settings: { t: 4, newPerDay: 10 }, days: { '2026-11-03': { n: 1 } } };
  const y = { settings: { t: 4, newPerDay: 30 }, days: { '2026-11-02': { r: 2 } } };
  assert.strictEqual(canonOf(VS.mergePart('vocab-meta', x, y)), canonOf(VS.mergePart('vocab-meta', y, x)));
});
