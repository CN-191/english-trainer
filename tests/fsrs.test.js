const F = TT.fsrs;
// Wie in den Referenztests (ts-fsrs FSRS-6.test.ts, py-fsrs test_basic.py): ohne Fuzz, max. 36500 Tage
const REF = { maxInterval: 36500, fuzz: false };
const T0 = Date.UTC(2022, 11, 29, 12, 30);
const DAY = 86400000;

test('FSRS: Abstände wie in der Referenz (13 Bewertungen)', () => {
  let c = F.newCard();
  let now = T0;
  const ivls = [];
  for (const g of [3, 3, 3, 3, 3, 3, 1, 1, 3, 3, 3, 3, 3]) {
    c = F.next(c, g, now, REF);
    ivls.push(c.ivl);
    now = c.state === F.REVIEW ? now + c.ivl * DAY : c.due;
  }
  assert.deepStrictEqual(ivls, [0, 2, 11, 46, 163, 498, 0, 0, 2, 4, 7, 12, 21]);
});

test('FSRS: Gedächtniszustand wie in der Referenz (Kurzzeit)', () => {
  let c = F.newCard();
  let now = T0;
  const gaps = [0, 0, 1, 3, 8, 21];
  [1, 3, 3, 3, 3, 3].forEach((g, i) => {
    now += gaps[i] * DAY;
    c = F.next(c, g, now, REF);
  });
  assert.ok(Math.abs(c.s - 53.62691) < 1e-4, 'Stabilität ' + c.s);
  assert.ok(Math.abs(c.d - 6.3574867) < 1e-4, 'Schwierigkeit ' + c.d);
});

test('FSRS: erste Bewertung einer neuen Karte wie in der Referenz', () => {
  const r = [1, 2, 3, 4].map((g) => F.next(F.newCard(), g, T0, REF));
  assert.deepStrictEqual(r.map((c) => c.s), [0.212, 1.2931, 2.3065, 8.2956]);
  assert.deepStrictEqual(r.map((c) => c.d), [6.4133, 5.11217071, 2.11810397, 1]);
  assert.deepStrictEqual(r.map((c) => c.ivl), [0, 0, 0, 8]);
  assert.deepStrictEqual(r.map((c) => c.state), [F.LEARNING, F.LEARNING, F.LEARNING, F.REVIEW]);
});

test('FSRS: Lernschritte 1 Min / 10 Min, Schwer auf Schritt 1 wiederholt den Schritt', () => {
  const MIN = 60000;
  const a = F.next(F.newCard(), 1, T0, REF);
  assert.strictEqual(a.due - T0, 1 * MIN);
  const h = F.next(F.newCard(), 2, T0, REF);
  assert.strictEqual(h.due - T0, 5.5 * MIN);
  const g = F.next(F.newCard(), 3, T0, REF);
  assert.strictEqual(g.step, 1);
  assert.strictEqual(g.due - T0, 10 * MIN);
  const h2 = F.next(g, 2, g.due, REF);
  assert.strictEqual(h2.step, 1);
  assert.strictEqual(h2.due - g.due, 10 * MIN);
  const grad = F.next(g, 3, g.due, REF);
  assert.strictEqual(grad.state, F.REVIEW);
});

test('FSRS: Vergessen in der Wiederholung -> neu lernen (10 Min), Vergessen-Zähler steigt', () => {
  let c = F.next(F.newCard(), 4, T0, REF);
  const later = T0 + c.ivl * DAY;
  const again = F.next(c, 1, later, REF);
  assert.strictEqual(again.state, F.RELEARNING);
  assert.strictEqual(again.lapses, 1);
  assert.strictEqual(again.due - later, 10 * 60000);
  const back = F.next(again, 3, again.due, REF);
  assert.strictEqual(back.state, F.REVIEW);
});

test('FSRS: Abstände Schwer < Gut < Einfach in der Wiederholung, Höchstabstand greift', () => {
  const c = F.next(F.newCard(), 4, T0, REF);
  const later = T0 + c.ivl * DAY;
  const [h, g, e] = [2, 3, 4].map((x) => F.next(c, x, later, REF).ivl);
  assert.ok(h < g && g < e, [h, g, e].join(' '));
  let x = c;
  let now = later;
  for (let i = 0; i < 12; i++) {
    x = F.next(x, 4, now, { fuzz: false, maxInterval: 365 });
    now += x.ivl * DAY;
  }
  assert.strictEqual(x.ivl, 365);
});

test('FSRS: Fuzz bleibt im Bereich und ist bei gleichem Startwert gleich', () => {
  const c = Object.assign(F.newCard(), { state: F.REVIEW, s: 30, d: 5, reps: 3, last: Date.UTC(2022, 0, 1), ivl: 30 });
  const now = Date.UTC(2022, 0, 31);
  const plain = F.next(c, 3, now, { fuzz: false }).ivl;
  const { lo, hi } = F.fuzzRange(plain, 30, 365);
  for (let i = 0; i < 20; i++) {
    const v = F.next(c, 3, now, { fuzz: true }, 'karte' + i).ivl;
    assert.ok(v >= lo && v <= hi, v + ' nicht in ' + lo + '..' + hi);
  }
  assert.strictEqual(F.next(c, 3, now, {}, 'x').ivl, F.next(c, 3, now, {}, 'x').ivl);
});

test('FSRS: Karte wird nicht verändert, Abstands-Text', () => {
  const c = F.newCard();
  const copy = JSON.stringify(c);
  const n = F.next(c, 3, T0, REF);
  assert.strictEqual(JSON.stringify(c), copy);
  assert.strictEqual(F.formatInterval(n, T0), '10 Min');
  assert.strictEqual(F.formatInterval({ state: F.REVIEW, ivl: 4 }, T0), '4 T');
  assert.strictEqual(F.formatInterval({ state: F.REVIEW, ivl: 90 }, T0), '3 Mon');
  assert.strictEqual(F.formatInterval({ state: F.REVIEW, ivl: 365 }, T0), '1 J');
});

test('FSRS: Fuzz nutzt den gekappten Abstand, verschiedene Karten streuen', () => {
  const mature = Object.assign(F.newCard(), { state: F.REVIEW, s: 3000, d: 5, reps: 9, last: Date.UTC(2022, 0, 1), ivl: 365 });
  const now = Date.UTC(2023, 0, 1);
  const { lo } = F.fuzzRange(365, 365, 365);
  const vals = new Set();
  for (let i = 0; i < 30; i++) {
    const v = F.next(mature, 3, now, { fuzz: true, maxInterval: 365 }, 'k' + i).ivl;
    assert.ok(v >= lo && v <= 365, String(v));
    vals.add(v);
  }
  assert.ok(lo >= 340, 'Untergrenze ' + lo);
  const young = Object.assign(F.newCard(), { state: F.REVIEW, s: 30, d: 5, reps: 3, last: Date.UTC(2022, 0, 1), ivl: 30 });
  const spread = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => F.next(young, 3, Date.UTC(2022, 0, 31), {}, 'c' + i).ivl));
  assert.ok(spread.size >= 2, 'Fuzz streut nicht');
});

test('FSRS: interval akzeptiert unvollständige Parameter', () => {
  assert.strictEqual(F.interval({}, 10), 10);
  assert.strictEqual(F.interval({ retention: 0.9 }, 8.2956), 8);
});
