// Unterrichtsthema „by + -ing: erklären, wie“ (StartUp 6, Unit 1, Lesson 3)
(function () {
  const N = 400;
  const rngFor = (seed) => TT.util.makeRng(seed);
  const sentenceOk = (s) => /^[A-Z]/.test(s) && /[.?!]$/.test(s) && !/\s{2}/.test(s) && !/ [.,?!]/.test(s);
  const segText = (segs) => segs.map((x) => x.v).join('');
  const L = () => TT.lesson('by-gerund');

  // Alle -ing-Formen der Wortlisten, von Hand geprüft
  const ING = {
    watch: 'watching', listen: 'listening', use: 'using', play: 'playing', read: 'reading', share: 'sharing', wait: 'waiting',
    film: 'filming', build: 'building', hire: 'hiring', post: 'posting', release: 'releasing', win: 'winning', follow: 'following',
    check: 'checking', let: 'letting', chat: 'chatting', sing: 'singing', write: 'writing', pay: 'paying', go: 'going', buy: 'buying',
    stream: 'streaming', 'binge-watch': 'binge-watching', ask: 'asking', stay: 'staying', turn: 'turning', copy: 'copying',
    practice: 'practicing', give: 'giving', enter: 'entering', know: 'knowing', lie: 'lying', pretend: 'pretending', shoot: 'shooting',
    work: 'working', stop: 'stopping', paint: 'painting', run: 'running', send: 'sending', put: 'putting', organize: 'organizing',
    offer: 'offering', make: 'making', recommend: 'recommending', subscribe: 'subscribing',
  };

  const RIGHT = new Set(Object.values(ING));
  // Steht im Text by (+ not) + eine richtige -ing-Form?
  const hasByIng = (t) => (t.match(/\b[Bb]y (?:not )?[\w-]+/g) || []).some((m) => RIGHT.has(m.split(' ').pop()));

  // Gezeigte Texte einer Aufgabe
  function shownTexts(it) {
    const out = [it.task, it.explain, it.answer, it.hint, it.shown, it.before && it.before + '___' + it.after];
    if (it.source) out.push(segText(it.source));
    if (it.sentence) out.push(segText(it.sentence));
    (it.options || []).forEach((o) => out.push(typeof o === 'string' ? o : o.label));
    (it.choices || []).forEach((c) => out.push(c));
    return out.filter(Boolean);
  }

  test('by + -ing: Thema registriert, Unit 1 Lesson 3, vier Übungsarten', () => {
    const l = L();
    assert.ok(l, 'Thema fehlt');
    assert.strictEqual(l.title, 'by + -ing: erklären, wie');
    assert.deepStrictEqual(l.book, { unit: 1, lesson: 3 });
    assert.deepStrictEqual(l.kinds, ['transform', 'cloze', 'errorspot', 'identify']);
    l.examples.forEach((e) => assert.ok(/[.?!]$/.test(e) && /\bby\b/i.test(e), e));
  });

  test('by + -ing: alle Aufgaben vollständig und in sich stimmig', () => {
    const l = L();
    const rng = rngFor(1103);
    for (const kind of l.kinds) {
      for (let i = 0; i < N; i++) {
        const it = l.make(kind, rng);
        const where = kind + ': ' + JSON.stringify(it);
        assert.strictEqual(it.kind, kind, where);
        assert.ok(it.task && it.explain, where);
        if (kind === 'transform') {
          assert.ok(it.source.length && it.label && it.input === 'sentence', where);
          assert.ok(TT.lessonCheck(it.answer, it.accept), where);
          it.accept.forEach((a) => assert.ok(sentenceOk(a) && /\b[Bb]y (not )?\S+ing\b/.test(a), where));
          assert.ok(sentenceOk(segText(it.source)), where);
        }
        if (kind === 'cloze') {
          assert.ok(TT.lessonCheck(it.answer, it.accept), where);
          assert.strictEqual(it.choices.filter((c) => TT.lessonCheck(c, it.accept)).length, 1, where);
          assert.ok(it.choices.length >= 3 && new Set(it.choices).size === it.choices.length, where);
          assert.ok(sentenceOk(it.before + it.answer + it.after), where);
          assert.ok(/\b[Bb]y (not )?$/.test(it.before), where);
          // falsche Auswahl: nie eine -ing-Form
          it.choices.filter((c) => c !== it.answer).forEach((c) => assert.ok(!RIGHT.has(c), where));
        }
        if (kind === 'errorspot') {
          assert.ok(sentenceOk(it.shown) && sentenceOk(it.answer), where);
          if (it.correct) {
            assert.deepStrictEqual(it.options, [], where);
            assert.strictEqual(it.shown, it.answer, where);
          } else {
            assert.notStrictEqual(TT.lessonNorm(it.shown), TT.lessonNorm(it.answer), where);
            assert.ok(it.options.includes(it.answer) && it.options.includes(it.shown), where);
            assert.strictEqual(new Set(it.options).size, it.options.length, where);
          }
        }
        if (kind === 'identify') {
          assert.strictEqual(it.options.filter((o) => o.correct).length, 1, where);
          assert.ok(sentenceOk(segText(it.sentence)), where);
          assert.strictEqual(new Set(it.options.map((o) => o.label)).size, it.options.length, where);
        }
      }
    }
  });

  test('by + -ing: Rechtschreibung der -ing-Formen stimmt', () => {
    const seen = new Set();
    for (const g of L()._goals) {
      for (const w of g.ways) {
        assert.ok(ING[w.v.base], 'unbekanntes Verb: ' + w.v.base);
        assert.strictEqual(TT.ingForm(w.v), ING[w.v.base], w.v.base);
        seen.add(w.v.base);
      }
    }
    // Besonderheiten kommen vor: e fällt weg, Konsonant verdoppelt, ie → y
    for (const b of ['make', 'use', 'stop', 'run', 'put', 'lie']) assert.ok(seen.has(b), b);
    const rng = rngFor(5);
    for (let i = 0; i < N; i++) {
      const it = L().make('cloze', rng);
      const base = it.hint;
      assert.strictEqual(it.answer, ING[base], JSON.stringify(it));
    }
  });

  test('by + -ing: Fehlersätze sind nie richtige Sätze, kein „through“, kein Satz ohne by', () => {
    const l = L();
    const rng = rngFor(17);
    const kinds = new Set();
    for (let i = 0; i < 2000; i++) {
      const s = l._scene(rng);
      const right = [s.full, s.fronted, s.short, ...s.fullAll, ...s.doItAll].map(TT.lessonNorm);
      for (const front of [false, true]) {
        for (const e of l._errors(s, front)) {
          assert.ok(!right.includes(TT.lessonNorm(e.text)), e.text);
          assert.ok(!/\bthrough\b/i.test(e.text), e.text);
          assert.ok(/\b(by|with)\b/i.test(e.text), e.text);
          assert.ok(sentenceOk(e.text), e.text);
          kinds.add(e.why.split(' ')[0]);
        }
      }
      // richtige Sätze enthalten by + -ing (bzw. by not + -ing) und nie with + -ing
      assert.ok(s.full.includes(' by ' + (s.neg ? 'not ' : '') + s.ing), s.full);
      assert.ok(s.fronted.startsWith('By ' + (s.neg ? 'not ' : '') + s.ing), s.fronted);
      assert.ok(!/\bwith \w+ing\b/.test(s.full), s.full);
    }
    assert.ok(kinds.has('Rechtschreibung'), 'Rechtschreibfehler kommen vor');
  });

  test('by + -ing: Fehler finden – nur die Lösung ist in den Optionen richtig', () => {
    const l = L();
    const rng = rngFor(23);
    let wrongShown = 0;
    for (let i = 0; i < 1500; i++) {
      const it = l.make('errorspot', rng);
      if (it.correct) continue;
      wrongShown++;
      for (const o of it.options) {
        if (o === it.answer) continue;
        // falsche Option: by + falsche Form oder with + -ing statt by
        assert.ok(!hasByIng(o) || /\b[Ww]ith (not )?[\w-]+ing\b/.test(o), o);
      }
    }
    assert.ok(wrongShown > 500);
  });

  test('by + -ing: Lückentext bietet genau eine richtige Form an (keine zweite -ing-Form, kein through)', () => {
    const l = L();
    const rng = rngFor(29);
    for (let i = 0; i < 1500; i++) {
      const it = l.make('cloze', rng);
      assert.strictEqual(it.choices.filter((c) => TT.lessonCheck(c, it.accept)).length, 1, JSON.stringify(it));
      assert.deepStrictEqual(it.accept, [it.answer]);
      for (const c of it.choices) assert.ok(!/through/.test(c), c);
    }
  });

  test('by + -ing: Kurzantwort, ganzer Satz, Satzanfang und Kurzformen werden akzeptiert', () => {
    const l = L();
    const rng = rngFor(31);
    let q = 0, c = 0, neg = 0;
    for (let i = 0; i < 2000; i++) {
      const it = l.make('transform', rng);
      if (/Kurzantwort/.test(it.label)) {
        q++;
        assert.ok(/^By (not )?\S+ing\b/.test(it.answer), it.answer);
        assert.ok(it.accept.length >= 4, JSON.stringify(it));
        assert.ok(TT.lessonCheck(it.answer.toLowerCase().replace(/\.$/, ''), it.accept));
        const src = segText(it.source);
        assert.ok(/^How (did|do|does) .+\? – /.test(src), src);
        assert.ok(!/^How (did|do|does) (I|we) /.test(src), src);
      } else {
        c++;
        const full = it.accept[0];
        const front = it.accept[1];
        assert.ok(TT.lessonCheck(front.replace(',', ''), it.accept), front);
        assert.ok(!TT.lessonCheck(full.replace(/ by (not )?(\S+)ing/, ' by $1$2'), it.accept), full);
      }
      if (/ by not /i.test(it.answer) || /^By not /.test(it.answer)) {
        neg++;
        assert.ok(/didn't|don't|doesn't/.test(segText(it.source)), segText(it.source));
      }
    }
    assert.ok(q > 500 && c > 500 && neg > 50, [q, c, neg].join());
    // Kurzformen im Ausgangssatz, Langformen in der Antwort: She didn't → by not
    assert.ok(TT.lessonCheck('She does it by not checking her work emails', ['She does it by not checking her work emails.']));
  });

  // Szene mit festem Ziel / Weg / Person suchen
  function findScene(pred, seed) {
    const rng = rngFor(seed);
    for (let i = 0; i < 20000; i++) {
      const s = L()._scene(rng);
      if (pred(s)) return s;
    }
    throw new Error('Szene nicht gefunden');
  }

  test('by + -ing: Kurzantwort – ganzer Satz mit Pronomen statt Nomen wird akzeptiert', () => {
    const l = L();
    const rng = rngFor(43);
    let nounSubj = 0;
    for (let i = 0; i < 3000; i++) {
      const it = l.make('transform', rng);
      if (!/Kurzantwort/.test(it.label)) continue;
      // „My sister got … by …“ und „She got … by …“ (auch mit By … am Satzanfang)
      const full = it.accept.find((a) => / by (not )?\S+ing\b/.test(a) && !/ (did|does|do) it by /.test(a));
      assert.ok(full, JSON.stringify(it));
    }
    const s = findScene((x) => x.who.text === 'my sister' && x.goal.rest === 'tickets for the premiere' && x.way.rest === 'in line for six hours', 47);
    nounSubj++;
    const accept = [s.short, ...s.fullAll, ...s.doItAll];
    for (const a of [
      'She got tickets for the premiere by waiting in line for six hours.',
      'My sister got tickets for the premiere by waiting in line for six hours.',
      'By waiting in line for six hours, she got tickets for the premiere.',
      'She did it by waiting in line for six hours.',
    ]) assert.ok(TT.lessonCheck(a, accept), a);
    // Frage an die Person: your sister, die Antwort behält her / she
    assert.strictEqual(s.question, 'How did your sister get tickets for the premiere?');
    const t = findScene((x) => x.who.text === 'my sister' && /English/.test(x.goal.rest), 53);
    assert.strictEqual(t.question, 'How did your sister improve her English?');
    assert.ok(/^My sister improved her English by /.test(t.full), t.full);
    assert.ok(nounSubj === 1);
  });

  test('by + -ing: Formulierungen aus der Durchsicht (lie about, by practice, give up, Nachbarn)', () => {
    const l = L();
    const ways = l._goals.flatMap((g) => g.ways.map((w) => w.rest));
    assert.ok(ways.includes('about having too much homework'));
    assert.ok(!ways.includes('about {pos} homework'));
    const keep = l._goals.find((g) => /kids quiet/.test(g.rest));
    assert.ok(!keep.people.some((p) => p.text === 'my parents'));
    // by practice kann ein Nomen sein → kein Fehler „by practice“
    const pr = findScene((x) => x.v.base === 'practice', 59);
    for (const front of [false, true]) {
      for (const e of l._errors(pr, front)) assert.ok(!/\b[Bb]y practice\b/.test(e.text), e.text);
    }
    const rng = rngFor(61);
    for (let i = 0; i < 3000; i++) {
      const it = l.make('cloze', rng);
      if (it.hint === 'practice') assert.ok(!it.choices.includes('practice'), JSON.stringify(it));
    }
    // Phrasal Verb: Partikel steht in der Erklärung
    const gu = findScene((x) => x.v.base === 'give' && x.neg, 67);
    const why = l._errors(gu, false).map((e) => e.why).join(' ');
    assert.ok(/by not giving up, nicht by not give up/.test(why), why);
  });

  test('by + -ing: Bedeutung von by – genau eine Option richtig, by + -ing nur bei „wie“', () => {
    const l = L();
    const rng = rngFor(37);
    const seen = new Set();
    for (let i = 0; i < 2000; i++) {
      const it = l.make('identify', rng);
      const right = it.options.find((o) => o.correct).label;
      const text = segText(it.sentence);
      if (it.task === 'Was bedeutet by in diesem Satz?') {
        seen.add(right);
        assert.strictEqual(it.options.length, 4);
        const ing = hasByIng(text);
        assert.strictEqual(ing, /^wie/.test(right), text + ' → ' + right);
      } else {
        seen.add('frage');
        assert.ok(/^How .+\?$/.test(text), text);
        assert.ok(/^By (not )?\S+ing\b/.test(right), right);
        // die einzige andere richtig gebaute Antwort nennt eine Zeit, keinen Weg
        for (const o of it.options) if (!o.correct) assert.ok(!hasByIng(o.label), o.label);
      }
    }
    assert.strictEqual(seen.size, 5, [...seen].join());
  });

  test('by + -ing: keine doppelten Leerzeichen, keine offenen Platzhalter, kein „through“ in gezeigten Texten', () => {
    const l = L();
    const rng = rngFor(41);
    for (const kind of l.kinds) {
      for (let i = 0; i < 800; i++) {
        for (const t of shownTexts(l.make(kind, rng))) {
          assert.ok(!/\{|\}|undefined|null/.test(t), t);
          assert.ok(!/\s{2}/.test(t), t);
          assert.ok(!/\bthrough\b/.test(t), t);
        }
      }
    }
  });
})();
