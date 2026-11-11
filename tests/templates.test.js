const FORMS = ['aff', 'neg', 'q'];
const DURATION = /\{FOR_|\{SINCE_|for ages|for hours|for over|for twelve|for exactly|all day|all morning|all night/;

test('mindestens 10 Vorlagen pro Zeitform, IDs eindeutig', () => {
  const ids = new Set();
  for (const t of TT.TEMPLATES) {
    assert.ok(!ids.has(t.id), 'doppelt: ' + t.id);
    ids.add(t.id);
  }
  for (const id of TT.TENSE_IDS) {
    const n = TT.TEMPLATES.filter((t) => t.tense === id).length;
    assert.ok(n >= 10, `${id}: nur ${n} Vorlagen`);
  }
});

test('Vorlagen sind formal gültig', () => {
  for (const t of TT.TEMPLATES) {
    assert.ok(TT.TENSE_IDS.includes(t.tense), t.id);
    assert.strictEqual((t.pattern.match(/\{CLAUSE\}/g) || []).length, 1, t.id);
    assert.ok(t.why && t.why.length > 10, t.id);
    const forms = t.forms || FORMS;
    assert.ok(forms.every((f) => FORMS.includes(f)), t.id);
    if (t.mid) assert.ok(!forms.includes('neg'), t.id + ': mid nur mit aff/q');
    if (!/\{\.\}/.test(t.pattern)) assert.ok(!forms.includes('q'), t.id + ': Frage braucht {.}');
    const fixedVerb = t.fixed && t.fixed.verb;
    if (fixedVerb) assert.ok(TT.findVerb(fixedVerb), t.id + ': ' + fixedVerb);
    const types = t.verbTypes || ['activity', 'event'];
    if (!fixedVerb && /progressive/.test(t.tense)) assert.ok(!types.includes('state'), t.id);
    if (!fixedVerb && DURATION.test(t.pattern)) assert.ok(!types.includes('event'), t.id + ': Ereignisverb mit Zeitdauer');
  }
});

test('jede Vorlage erzeugt saubere Sätze in allen ihren Satzarten', () => {
  const rng = TT.util.makeRng(2026);
  for (const t of TT.TEMPLATES) {
    for (const form of t.forms || FORMS) {
      for (let i = 0; i < 15; i++) {
        const s = TT.generateFromTemplate(t, form, rng);
        const where = `${t.id}/${form}: ${s.text}`;
        assert.ok(!/[{}*]/.test(s.text), where);
        assert.ok(!/ {2}/.test(s.text), where);
        assert.ok(/^[A-Z]/.test(s.text), where);
        assert.ok(!/[.!?] [a-z]/.test(s.text), where + ' (Kleinbuchstabe nach Satzende)');
        assert.strictEqual(s.gaps.join(' '), s.answer, where);
        if (form === 'q') assert.ok(s.text.endsWith('?'), where);
        if (/progressive/.test(t.tense)) assert.notStrictEqual(s.verb.type, 'state', where);
      }
    }
  }
});

test('alsoAccept: gültige Zeitform-IDs, nie die eigene', () => {
  for (const t of TT.TEMPLATES) {
    for (const id of t.alsoAccept || []) {
      assert.ok(TT.TENSE_IDS.includes(id), t.id + ': ' + id);
      assert.notStrictEqual(id, t.tense, t.id);
      assert.ok(/Auch|auch/.test(t.why), t.id + ': why muss die Alternative erwähnen');
    }
  }
});

test('Regression: Auswahl/Fehlervarianten enthalten nie eine akzeptierte Antwort', () => {
  const norm = (x) => TT.normalizeVariants(x)[0];
  for (const tense of TT.TENSE_IDS) {
    const pool = TT.TEMPLATES.filter((t) => t.tense === tense);
    for (const form of ['aff', 'neg', 'q']) {
      if (!pool.some((t) => (t.forms || FORMS).includes(form))) continue;
      for (let seed = 1; seed <= 30; seed++) {
        const s = TT.generate({ tense, form, rng: TT.util.makeRng(seed) });
        const acc = s.accept.map(norm);
        const where = `${s.templateId}/${form}: ${s.text}`;
        const ch = TT.makeChoices(s, TT.util.makeRng(seed));
        assert.strictEqual(ch.length, 4, where);
        assert.strictEqual(ch.filter((c) => c.correct).length, 1, where);
        assert.strictEqual(new Set(ch.map((c) => norm(c.conj.full))).size, 4, where);
        for (const c of ch.filter((x) => !x.correct)) assert.ok(!acc.includes(norm(c.conj.full)), where + ' → ' + c.conj.full);
        for (const o of TT.errorOptions(s)) assert.ok(!acc.includes(norm(o.conj.full)), where + ' → ' + o.conj.full);
      }
    }
  }
});

test('progressiveOk-Verben: nur mit akzeptierter Progressive-Form oder noProgressiveOk', () => {
  const PROG = {
    'present-simple': 'present-progressive', 'past-simple': 'past-progressive', 'present-perfect': 'present-perfect-progressive',
    'past-perfect': 'past-perfect-progressive', 'future-simple': 'future-progressive', 'future-perfect': 'future-perfect-progressive',
  };
  for (const id of ['ps-state-now', 'ps-state-days', 'pst-back-then', 'pst-years-ago']) {
    assert.ok(TT.TEMPLATES.find((t) => t.id === id).noProgressiveOk, id);
  }
  const rng = TT.util.makeRng(77);
  for (const t of TT.TEMPLATES) {
    for (const form of t.forms || FORMS) {
      for (let i = 0; i < 60; i++) {
        const s = TT.generateFromTemplate(t, form, rng);
        if (t.noProgressiveOk) assert.ok(!s.verb.progressiveOk, t.id + ': ' + s.text);
        if (s.verb.type === 'state' && s.verb.progressiveOk && PROG[t.tense] && !t.noProgressiveOk) {
          const prog = TT.conjugate(s.verb, s.subject, PROG[t.tense], form).full;
          assert.ok(s.accept.includes(prog), `${t.id}: ${s.text} (${prog} fehlt in accept)`);
        }
      }
    }
  }
});

test('prog-currently akzeptiert Simple Present', () => {
  assert.deepStrictEqual(TT.TEMPLATES.find((t) => t.id === 'prog-currently').alsoAccept, ['present-simple']);
});

test('noGoingTo: nur bei will-Future-Vorlagen', () => {
  const flagged = TT.TEMPLATES.filter((t) => t.noGoingTo);
  assert.ok(flagged.length >= 3);
  for (const t of flagged) assert.strictEqual(t.tense, 'future-simple', t.id);
  for (const id of ['fut-promise', 'fut-dont-worry', 'fut-phone']) assert.ok(flagged.some((t) => t.id === id), id);
});
