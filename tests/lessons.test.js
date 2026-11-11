// Unterrichtsthemen: Register, Antwortprüfung und Generatoren (viele Zufallsaufgaben je Übungsart)
const N = 400;
const rngFor = (seed) => TT.util.makeRng(seed);
const sentenceOk = (s) => /^[A-Z]/.test(s) && /[.?!]$/.test(s) && !/\s{2}/.test(s) && !/ [.,?!]/.test(s);
const segText = (segs) => segs.map((x) => x.v).join('');

test('Unterricht: fünf Themen registriert, Übungsarten und Kennungen', () => {
  assert.deepStrictEqual(TT.LESSON_IDS.filter((id) => !TT.isBankLesson(id)), ['what-clauses', 'passive', 'pronouns', 'pronoun-replace', 'by-gerund']);
  assert.deepStrictEqual(TT.LESSON_EX, ['l-transform', 'l-cloze', 'l-errorspot', 'l-identify', 'l-replace', 'l-order']);
  assert.strictEqual(TT.lessonKind('l-cloze'), 'cloze');
  assert.strictEqual(TT.lessonKind('l-replace'), 'replace');
  assert.strictEqual(TT.lessonKind('cloze'), null);
  for (const L of TT.LESSONS.filter((l) => !l.bank)) {
    assert.ok(L.title && L.rule && L.tip && L.examples.length >= 2, L.id);
    const four = ['transform', 'cloze', 'errorspot', 'identify'];
    assert.deepStrictEqual(L.kinds, L.id === 'pronoun-replace' ? ['replace'] : four);
  }
  assert.strictEqual(TT.isLesson('passive'), true);
  assert.strictEqual(TT.isLesson('past-simple'), false);
});

test('Unterricht: Antwortprüfung ist tolerant bei Groß-/Kleinschreibung, Leerzeichen, Satzzeichen, Apostroph', () => {
  const accept = ['The ocean was polluted by the government.'];
  assert.ok(TT.lessonCheck('the ocean  was polluted by the government', accept));
  assert.ok(TT.lessonCheck('The Ocean was polluted by the government!', accept));
  assert.ok(!TT.lessonCheck('The ocean was pollute by the government.', accept));
  assert.ok(!TT.lessonCheck('', accept));
  assert.ok(TT.lessonCheck('I didn’t', ["I didn't"]));
});

for (const id of ['what-clauses', 'passive', 'pronouns']) {
  test('Unterricht ' + id + ': alle Aufgaben vollständig und in sich stimmig', () => {
    const L = TT.lesson(id);
    const rng = rngFor(id.length * 97);
    for (const kind of L.kinds) {
      for (let i = 0; i < N; i++) {
        const it = L.make(kind, rng);
        const where = id + '/' + kind + ': ' + JSON.stringify(it);
        assert.strictEqual(it.kind, kind, where);
        assert.ok(it.task && it.explain, where);
        if (kind === 'transform') {
          assert.ok(it.source.length && it.label && ['sentence', 'word'].includes(it.input), where);
          assert.ok(TT.lessonCheck(it.answer, it.accept), where);
          if (it.input === 'sentence') it.accept.forEach((a) => assert.ok(sentenceOk(a), where));
          assert.ok(sentenceOk(segText(it.source)), where);
        }
        if (kind === 'cloze') {
          assert.ok(TT.lessonCheck(it.answer, it.accept), where);
          assert.strictEqual(it.choices.filter((c) => TT.lessonCheck(c, it.accept)).length, 1, where);
          assert.ok(it.choices.length >= 2 && new Set(it.choices).size === it.choices.length, where);
          assert.ok(sentenceOk(it.before + it.answer + it.after), where);
        }
        if (kind === 'errorspot') {
          assert.ok(sentenceOk(it.shown) && sentenceOk(it.answer), where);
          if (it.correct) {
            assert.deepStrictEqual(it.options, [], where);
          } else {
            assert.notStrictEqual(TT.lessonNorm(it.shown), TT.lessonNorm(it.answer), where);
            assert.ok(it.options.includes(it.answer) && it.options.includes(it.shown), where);
            assert.strictEqual(new Set(it.options).size, it.options.length, where);
          }
        }
        if (kind === 'identify') {
          assert.strictEqual(it.options.filter((o) => o.correct).length, 1, where);
          assert.ok(sentenceOk(segText(it.sentence)), where);
        }
      }
    }
  });
}

test('Passiv: be passt zu Zeitform und Zahl, 3. Form, Handelnder als Objektpronomen', () => {
  const L = TT.lesson('passive');
  const rng = rngFor(5);
  const BE = { 'present-simple': ['is', 'are'], 'past-simple': ['was', 'were'], 'present-perfect': ['has been', 'have been'], 'future-simple': ['will be', 'will be'] };
  for (let i = 0; i < N; i++) {
    const s = L._scene(rng);
    assert.strictEqual(s.be, BE[s.tense][s.thing.pl ? 1 : 0]);
    assert.ok(s.passive.includes(' ' + s.be + ' ' + s.verb.pp + ' by '), s.passive);
    assert.ok(!/ by (I|we|they|she|he)\b/.test(s.passive), s.passive);
    for (const e of L._errors(s)) {
      assert.notStrictEqual(TT.lessonNorm(e.text), TT.lessonNorm(s.passive), e.text);
      assert.notStrictEqual(TT.lessonNorm(e.text), TT.lessonNorm(s.passiveShort), e.text);
    }
  }
  let irregular = false;
  for (let i = 0; i < 300 && !irregular; i++) irregular = L._scene(rng).verb.pp === 'written';
  assert.ok(irregular, 'unregelmäßige Verben kommen vor');
});

test('Passiv: from-Fehler nur bei Verben, bei denen „from“ falsch ist', () => {
  const L = TT.lesson('passive');
  const rng = rngFor(11);
  for (let i = 0; i < N; i++) {
    const s = L._scene(rng);
    const hasFrom = L._errors(s).some((e) => / from /.test(e.text));
    if (['send', 'steal', 'take', 'choose', 'pollute', 'recycle', 'record', 'translate', 'protect'].includes(s.verb.base)) assert.ok(!hasFrom, s.verb.base);
    if (s.agent.force) assert.ok(!hasFrom, s.agent.text);
  }
});

// Alle Texte, die eine Aufgabe zeigt (ohne die Akzeptanzliste, die auch seltene richtige Fassungen enthält)
function shownTexts(it) {
  const out = [it.task, it.explain, it.answer, it.hint, it.shown, it.before && it.before + '___' + it.after];
  if (it.source) out.push(segText(it.source));
  if (it.sentence) out.push(segText(it.sentence));
  (it.options || []).forEach((o) => out.push(typeof o === 'string' ? o : o.label));
  (it.choices || []).forEach((c) => out.push(c));
  return out.filter(Boolean);
}
const sweep = (id, n, fn) => {
  const L = TT.lesson(id);
  const rng = rngFor(777);
  for (const kind of L.kinds) for (let i = 0; i < n; i++) fn(L.make(kind, rng), kind);
};

test('Unterricht: Kurzformen und Kommas zählen nicht', () => {
  assert.ok(TT.lessonCheck("I'll write the article.", ['I will write the article.']));
  assert.ok(TT.lessonCheck("We've sent the email.", ['We have sent the email.']));
  assert.ok(TT.lessonCheck("She's written the song.", ['She has written the song.']));
  assert.ok(TT.lessonCheck("The film's been made by them.", ['The film has been made by them.']));
  assert.ok(TT.lessonCheck('I did not like the ending.', ["I didn't like the ending."]));
  assert.ok(TT.lessonCheck('After the concert she went home', ['After the concert, she went home.']));
  assert.ok(TT.lessonCheck('Yesterday, we cleaned the beach with the class.', ['Yesterday we cleaned the beach with the class.']));
  assert.ok(!TT.lessonCheck("She's write the song.", ['She has written the song.']));
});

test('Passiv: kein „series“ (gleiche Form in Einzahl und Mehrzahl), kein „by me/by us“ in gezeigten Sätzen', () => {
  sweep('passive', 1500, (it) => {
    for (const t of shownTexts(it)) {
      assert.ok(!/\bseries\b/.test(t), t);
      if (t !== it.explain) assert.ok(!/\bby (me|us)\b/.test(t), t); // die Erklärung nennt „by me“ als Gegenbeispiel
    }
  });
});

test('Passiv: going to beim will-Future und andere Stellungen der Zeitangabe werden akzeptiert', () => {
  const L = TT.lesson('passive');
  const rng = rngFor(21);
  let gtActive = 0, gtPassive = 0, gtCloze = 0, fronted = 0, soon = 0;
  for (let i = 0; i < 4000; i++) {
    const it = L.make(i % 2 ? 'transform' : 'cloze', rng);
    if (it.kind === 'cloze') {
      if (/will-Future/.test(it.hint)) {
        assert.ok(['is', 'are'].some((b) => TT.lessonCheck(it.answer.replace(/^will be/, b + ' going to be'), it.accept)), JSON.stringify(it));
        gtCloze++;
      }
      continue;
    }
    if (!/ will /.test(it.answer)) continue;
    if (it.label === '→ Aktiv') {
      // Subjekt + will + Verb → Subjekt + am/is/are going to + Verb
      const m = it.answer.match(/^(\S+(?: \S+)*?) will (.*)$/);
      const variants = ['am', 'is', 'are'].map((b) => m[1] + ' ' + b + ' going to ' + m[2]);
      assert.ok(variants.some((v) => TT.lessonCheck(v, it.accept)), JSON.stringify(it));
      gtActive++;
    } else {
      const gt = ['is', 'are'].map((b) => it.answer.replace(' will be ', ' ' + b + ' going to be '));
      assert.ok(gt.some((v) => TT.lessonCheck(v, it.accept)), JSON.stringify(it));
      gtPassive++;
    }
    const time = ['next month', 'next year', 'next week', 'tomorrow', 'tonight', 'soon'].find((t) => it.answer.endsWith(' ' + t + '.'));
    if (time) {
      const body = it.answer.slice(0, -(time.length + 2));
      const front = TT.lessonUtil.cap(time) + ', ' + (body.startsWith('I ') ? body : body.charAt(0).toLowerCase() + body.slice(1)) + '.';
      assert.ok(TT.lessonCheck(front, it.accept), front);
      fronted++;
      if (time === 'soon') {
        const soonVar = body.replace(' will be ', ' will soon be ').replace(/ will (?!soon)/, ' will soon ') + '.';
        assert.ok(TT.lessonCheck(soonVar, it.accept), soonVar);
        soon++;
      }
    }
  }
  assert.ok(gtActive && gtPassive && gtCloze && fronted && soon, [gtActive, gtPassive, gtCloze, fronted, soon].join());
});

test('Passiv: Zeitangabe vor by … wird akzeptiert', () => {
  const L = TT.lesson('passive');
  const rng = rngFor(23);
  let n = 0;
  for (let i = 0; i < 2000; i++) {
    const s = L._scene(rng);
    if (!s.time) continue;
    const [head, tail] = s.passive.slice(0, -1).split(' by ');
    const alt = head + ' ' + s.time + ' by ' + tail.slice(0, -(s.time.length + 1)) + '.';
    assert.ok(s.passiveAll.includes(alt), alt + ' / ' + s.passive);
    n++;
  }
  assert.ok(n > 100);
});

test('Passiv: keine Vorhersagen für Diebstahl und Zerstörung, keine unpassenden Paare', () => {
  const L = TT.lesson('passive');
  const rng = rngFor(29);
  for (let i = 0; i < 3000; i++) {
    const s = L._scene(rng);
    if (['steal', 'destroy', 'break'].includes(s.verb.base)) assert.notStrictEqual(s.tense, 'future-simple', s.active);
    assert.ok(!/The earthquake destroyed the forest|The traffic polluted the (ocean|river|lake|beaches)|The band wrote the (article|book)|The city cleaned the classroom|My grandmother made the film|A small studio made the cake|wind broke the (vase|glasses)/i.test(s.active), s.active);
    if (s.verb.base === 'watch' && s.tense === 'present-simple') assert.ok(!/final episode|match/.test(s.active), s.active);
  }
});

test('What-Sätze: Lückentext in der Vergangenheit bietet keine Präsensformen an, Zeitform steht im Hinweis', () => {
  sweep('what-clauses', 1500, (it, kind) => {
    if (kind !== 'cloze') return;
    assert.ok(/ · (Simple Past|Simple Present|Passiv, Simple Past)$/.test(it.hint), it.hint);
    if (/^\w+ · Simple Past$/.test(it.hint) && !it.hint.startsWith('be ')) {
      const base = it.hint.split(' ')[0];
      for (const c of it.choices) if (c !== it.answer) assert.ok(/ing$/.test(c) || c === 'to ' + base, JSON.stringify(it));
    }
  });
});

test('What-Sätze: weitere richtige Fassungen werden akzeptiert', () => {
  const L = TT.lesson('what-clauses');
  const acc = (s) => L._accepted(s);
  const rng = rngFor(31);
  let most = 0, by = 0, mixed = 0;
  for (let i = 0; i < 3000; i++) {
    const s = L._scene(rng);
    const a = acc(s);
    assert.ok(a.includes(s.cleft) && (!s.cleftPl || a.includes(s.cleftPl)));
    if (s.most && s.role === 'subj') {
      assert.ok(a.includes(s.cleft.replace(/^What (\S+) (.*?) most /, 'What most $1 $2 ')), s.cleft);
      assert.ok(a.includes(s.cleft.replace(' most ', ' the most ')), s.cleft);
      most++;
    }
    if (s.most && s.role === 'obj') {
      assert.ok(a.includes(s.cleft.replace(' ' + s.verbForm + ' most ', ' most ' + s.verbForm + ' ')), s.cleft);
      most++;
    }
    if (s.passiveClause) {
      assert.ok(a.includes(s.cleft.replace('What was ' + s.verb.pp, 'What was ' + s.verb.pp + ' by ' + s.cause)), s.cleft);
      by++;
    }
    if (s.tense === 'past' && s.type !== 'passive') {
      assert.ok(a.includes(s.cleft.replace(new RegExp(' was ' + s.focus.text + '\\.$'), ' is ' + s.focus.text + '.')), s.cleft);
      mixed++;
    }
    for (const e of L._errors(s)) for (const x of a) assert.notStrictEqual(TT.lessonNorm(e.text), TT.lessonNorm(x), e.text);
    if (s.role === 'obj' && s.type !== 'passive' && s.most) {
      const doErr = L._errors(s).find((e) => /^What (did|does|do) /.test(e.text));
      assert.ok(/ most (was|is) /.test(doErr.text), doErr.text);
    }
    if (s.type === 'passive') {
      assert.ok(!/(earthquake|flood) destroyed the forest|traffic polluted the (ocean|river|beaches)|heat damaged the old church/.test(s.cause + ' ' + s.verb.past + ' ' + s.thing.text));
    }
  }
  assert.ok(most && by && mixed);
});

test('What-Sätze: Hinweis zu Mehrzahl passt zur Zeitform', () => {
  const L = TT.lesson('what-clauses');
  const rng = rngFor(37);
  for (let i = 0; i < 1500; i++) {
    const it = L.make('transform', rng);
    if (!/Bei Mehrzahl/.test(it.explain)) continue;
    const present = / is /.test(it.answer) && !/ was /.test(it.answer);
    assert.ok(present ? /is und are/.test(it.explain) : /was und were/.test(it.explain), it.answer + ' ' + it.explain);
  }
});

test('Pronomen: mindestens 3 Auswahlmöglichkeiten, keine Selbstbezüge, natürliche Verbindungen mit and', () => {
  sweep('pronouns', 1500, (it, kind) => {
    for (const t of shownTexts(it)) {
      assert.ok(!/als nach einer/.test(t), t);
      assert.ok(!/We watched the match with (me|us)\b/.test(t), t);
      assert.ok(!/Tom invited Tom|Lisa sat next to Lisa/.test(t), t);
      assert.ok(!/ and (they|we|them|us)\b/.test(t), t);
      assert.ok(!/\{[so]\}/.test(t), t);
      assert.ok(!/The teacher gave (Mr\. Brown|my grandmother|the actors|my parents)|help (Mr\. Brown|my grandmother|the actors|my parents) with/.test(t), t);
    }
    if (kind === 'cloze') {
      assert.ok(it.choices.length >= 3, JSON.stringify(it));
    }
  });
});

test('What-Sätze: Bauart, Rolle von what, keine Frage-Wortstellung, was/were bei Mehrzahl', () => {
  const L = TT.lesson('what-clauses');
  const rng = rngFor(3);
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const s = L._scene(rng);
    seen.add(s.type + '/' + (s.variant || s.role));
    assert.ok(s.cleft.startsWith(s.clause + ' '), s.cleft);
    assert.ok(!/^What (did|does|do) /.test(s.cleft), s.cleft);
    assert.ok(!/ it (was|is) /.test(s.cleft), s.cleft);
    if (s.role === 'obj') assert.ok(!/^What (was|is|amazed|impressed)/.test(s.clause) || s.type === 'passive', s.clause);
    if (s.cleftPl) assert.ok(/ (were|are) /.test(s.cleftPl) && s.focus.pl, s.cleftPl);
    for (const e of L._errors(s)) {
      assert.notStrictEqual(TT.lessonNorm(e.text), TT.lessonNorm(s.cleft), e.text);
      if (s.cleftPl) assert.notStrictEqual(TT.lessonNorm(e.text), TT.lessonNorm(s.cleftPl), e.text);
    }
  }
  for (const k of ['subj/subj', 'obj/obj', 'passive/subj', 'passive/obj', 'passive/passive']) assert.ok(seen.has(k), k);
});

test('Pronomen: richtige Form je Rolle, Satzanfang groß, Klassiker „Me and my friends“', () => {
  const L = TT.lesson('pronouns');
  const rng = rngFor(9);
  for (let i = 0; i < N; i++) {
    const s = L._scene(rng);
    assert.ok(s.t.role === 's' ? ['I', 'he', 'she', 'we', 'they'].includes(s.right) : ['me', 'him', 'her', 'us', 'them'].includes(s.right));
    assert.ok(/^[A-Z]/.test(s.ok.text) && /^[A-Z]/.test(s.bad.text), s.ok.text);
    assert.ok(!/ We watched the match with us/.test(s.ok.text), s.ok.text);
  }
  let classic = false;
  for (let i = 0; i < 200 && !classic; i++) classic = L.make('errorspot', rng).shown.startsWith('Me and my friends');
  assert.ok(classic);
});

test('Pronomen einsetzen: jede Lücke hat ein gültiges Pronomen, Sätze stimmig, niemand doppelt', () => {
  const L = TT.lesson('pronoun-replace');
  const rng = rngFor(808);
  const SUBJ = ['I', 'he', 'she', 'it', 'we', 'they'];
  const OBJ = ['me', 'him', 'her', 'it', 'us', 'them'];
  const seenGaps = new Set();
  for (let i = 0; i < 3000; i++) {
    const it = L.make('replace', rng);
    const where = JSON.stringify(it);
    assert.strictEqual(it.kind, 'replace', where);
    assert.ok(it.task && it.explain, where);
    const marks = it.source.filter((x) => x.t === 'mark').length;
    const holes = it.target.filter((x) => x.t === 'gap').length;
    assert.ok(marks >= 1 && marks <= 3 && marks === holes && holes === it.gaps.length, where);
    seenGaps.add(holes);
    assert.ok(sentenceOk(segText(it.source)), where);
    assert.ok(sentenceOk(it.answer), where);
    it.gaps.forEach((g) => {
      assert.ok(TT.lessonCheck(g.answer, g.accept), where);
      assert.ok(g.accept.every((a) => SUBJ.includes(a) || OBJ.includes(a)), where);
    });
    // höchstens einmal „… and I/me“, und keine Person zweimal (Tom and Lisa … with Lisa)
    const src = segText(it.source);
    assert.ok((src.match(/ and (I|me)\b/g) || []).length <= 1, src);
    assert.ok(!/\bLisa\b.*\bLisa\b|\bTom\b.*\bTom\b|\bfriends\b.*\bfriends\b/.test(src), src);
    // my dad gehört zu my parents; kein „I … my dad and me“; nach dem Alter der eigenen Familie fragt man nicht
    assert.ok(!(/\bmy dad\b/i.test(src) && /\bmy parents\b/i.test(src)), src);
    assert.ok(!/^I need to call .* and me\b/.test(src), src);
    assert.ok(!/^How old (is|are) my (sister|brother|grandma|uncle|parents)\b/.test(src), src);
    assert.ok(/^[A-Z]/.test(it.explain), it.explain);
  }
  assert.deepStrictEqual([...seenGaps].sort(), [1, 2, 3]);
});

test('Pronomen einsetzen: Sachen, Nichtzählbares, Paare und „… and I/me“ bekommen das richtige Pronomen', () => {
  const L = TT.lesson('pronoun-replace');
  const rng = rngFor(42);
  const want = { 'the news': 'it', 'the money': 'it', 'the music': 'it', 'my glasses': 'them', 'the scissors': 'them', 'the songs': 'them' };
  const seen = {};
  for (let i = 0; i < 4000; i++) {
    const s = L._scene(rng);
    for (const p of s.parts) {
      if (want[p.words]) {
        assert.strictEqual(p.pron, p.role === 's' && want[p.words] === 'them' ? 'they' : want[p.words], p.words);
        seen[p.words] = true;
      }
      if (/ and I$/.test(p.words)) { assert.strictEqual(p.role, 's'); assert.strictEqual(p.pron, 'we'); }
      if (/ and me$/.test(p.words)) { assert.notStrictEqual(p.role, 's'); assert.strictEqual(p.pron, 'us'); }
      if (p.role === 's') assert.ok(['he', 'she', 'it', 'we', 'they'].includes(p.pron), p.pron);
      else assert.ok(['him', 'her', 'it', 'us', 'them'].includes(p.pron), p.pron);
    }
    if (/^How old (is|are) /.test(s.sourceText)) assert.ok(/^How old (is (he|she)|are they)\?$/.test(s.answer), s.answer);
  }
  assert.deepStrictEqual(Object.keys(want).filter((k) => !seen[k]), []);
  assert.ok(L.example(rng).includes(' → '));
});
