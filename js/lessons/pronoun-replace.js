(function (TT) {
  'use strict';

  const { pick } = TT.util;
  const { cap } = TT.lessonUtil;

  // „Pronomen einsetzen“ (nach dem Übungstyp von test-english.com, A1 Object pronouns, Exercise 2, mit eigenen Sätzen):
  // Im Satz sind ein bis drei Satzglieder markiert; jedes wird durch das passende Subjekt- oder Objektpronomen
  // ersetzt und getippt. Personen und Dinge (it/they/them), Paare mit „I/me“, Fragen und Aufforderungen.

  // Personen: s/o = Text als Subjekt/Objekt, sp/op = Pronomen, pl = Mehrzahl,
  // ids = wer gemeint ist (niemand doppelt im Satz), me = schließt den Sprecher ein, young = Kind/Jugendlicher,
  // fam = eigene Familie (nach deren Alter fragt man nicht)
  const P = (s, o, sp, op, pl, ids, extra) => Object.assign({ person: true, s, o: o || s, sp, op, pl, ids, me: false, young: false, fam: false }, extra);
  const PEOPLE = [
    P('Emma', null, 'she', 'her', false, ['emma'], { young: true }),
    P('Lisa', null, 'she', 'her', false, ['lisa'], { young: true }),
    P('Tom', null, 'he', 'him', false, ['tom'], { young: true }),
    P('Ben', null, 'he', 'him', false, ['ben'], { young: true }),
    P('my sister', null, 'she', 'her', false, ['sister'], { young: true, fam: true }),
    P('my brother', null, 'he', 'him', false, ['brother'], { young: true, fam: true }),
    P('my grandma', null, 'she', 'her', false, ['grandma'], { fam: true }),
    P('my uncle', null, 'he', 'him', false, ['uncle'], { fam: true }),
    P('Mr. Brown', null, 'he', 'him', false, ['brown']),
    P('Mrs. Lopez', null, 'she', 'her', false, ['lopez']),
    P('my parents', null, 'they', 'them', true, ['parents', 'dad'], { fam: true }), // my dad gehört zu my parents
    P('Tom and Lisa', null, 'they', 'them', true, ['tom', 'lisa'], { young: true }),
    P('the kids', null, 'they', 'them', true, ['kids'], { young: true }),
    P('my friends', null, 'they', 'them', true, ['friends'], { young: true }),
    P('the neighbors', null, 'they', 'them', true, ['neighbors']),
    P('my dad and I', 'my dad and me', 'we', 'us', true, ['dad'], { me: true }),
    P('my friends and I', 'my friends and me', 'we', 'us', true, ['friends'], { me: true, young: true }),
    P('Lisa and I', 'Lisa and me', 'we', 'us', true, ['lisa'], { me: true, young: true }),
  ];

  // Dinge: note = sg (Einzahl), pl (Mehrzahl), unc (nicht zählbar → it), pair (gibt es nur in der Mehrzahl → them),
  // news (sieht aus wie Mehrzahl, ist aber Einzahl → it)
  const D = (s, note) => {
    const pl = note === 'pl' || note === 'pair';
    return { person: false, s, o: s, sp: pl ? 'they' : 'it', op: pl ? 'them' : 'it', pl, note, ids: [] };
  };
  const THINGS = {
    media: [D('the new album', 'sg'), D('this song', 'sg'), D('the trailer', 'sg'), D('the new show', 'sg'), D('the documentary', 'sg'),
      D('the soundtrack', 'sg'), D('the songs', 'pl'), D('the music videos', 'pl'), D('the music', 'unc')],
    watch: [D('the new show', 'sg'), D('the documentary', 'sg'), D('the trailer', 'sg'), D('the music videos', 'pl'), D('the cartoons', 'pl'), D('the news', 'news')],
    listen: [D('the new album', 'sg'), D('this song', 'sg'), D('the songs', 'pl'), D('the music', 'unc'), D('the podcasts', 'pl')],
    lost: [D('my keys', 'pl'), D('my phone', 'sg'), D('my glasses', 'pair'), D('my headphones', 'pair'), D('the remote', 'sg'),
      D('the tickets', 'pl'), D('the scissors', 'pair'), D('the money', 'unc')],
    // für „{A} can't find …“: ohne „my …“ (Tom can't find my keys klingt seltsam)
    lostThe: [D('the keys', 'pl'), D('the remote', 'sg'), D('the tickets', 'pl'), D('the scissors', 'pair'), D('the money', 'unc'), D('the map', 'sg')],
    give: [D('the tickets', 'pl'), D('the money', 'unc'), D('the photos', 'pl'), D('the poster', 'sg'), D('the keys', 'pl'), D('the scissors', 'pair')],
    send: [D('the photos', 'pl'), D('the video', 'sg'), D('the link', 'sg'), D('the tickets', 'pl'), D('the information', 'unc')],
    borrow: [D('the camera', 'sg'), D('the bike', 'sg'), D('the headphones', 'pair'), D('the books', 'pl'), D('the money', 'unc')],
    pricey: [D('the tickets', 'pl'), D('the camera', 'sg'), D('my new headphones', 'pair'), D('the jeans', 'pair'), D('the concert', 'sg')],
    clean: [D('the beach', 'sg'), D('the classroom', 'sg'), D('the park', 'sg'), D('the playground', 'sg')],
    recycle: [D('the bottles', 'pl'), D('the old newspapers', 'pl'), D('the cans', 'pl'), D('the plastic', 'unc'), D('the cardboard', 'unc')],
    food: [D('the cake', 'sg'), D('the cookies', 'pl'), D('the pizza', 'sg'), D('the popcorn', 'unc'), D('the sandwiches', 'pl')],
    fear: [D('spiders', 'pl'), D('the dark', 'sg'), D('big dogs', 'pl'), D('thunder', 'unc'), D('snakes', 'pl')],
    secret: [D('the party', 'sg'), D('the surprise', 'sg'), D('the news', 'news'), D('the presents', 'pl')],
    touch: [D('the poster', 'sg'), D('the cake', 'sg'), D('my headphones', 'pair'), D('the photos', 'pl')],
  };

  // Vorlagen: {A}/{B}/{C} = Satzglied, {A:is|are} = Form passend zu A (Einzahl|Mehrzahl).
  // slots: Rolle (s = Subjekt, o = Objekt nach dem Verb, op = nach einer Präposition) und Auswahl
  // (p = Personen, young = nur Kinder/Jugendliche, oder eine Liste aus THINGS); noMe = ohne „… and I/me“,
  // noFam = ohne eigene Familie, inv = Subjekt steht in der Frage hinter dem Verb
  const S = (role, from, opt) => Object.assign({ role, from, noMe: false, noFam: false, inv: false }, opt);
  const T = (text, slots) => ({ text, slots });
  const TEMPLATES = [
    T('{A} {A:loves|love} {B}.', { A: S('s', 'p'), B: S('o', 'media') }),
    T('{A} {A:helps|help} {B} every weekend.', { A: S('s', 'p'), B: S('o', 'p') }),
    T("I can't find {B}.", { B: S('o', 'lost') }),
    T("{A} can't find {B}.", { A: S('s', 'p'), B: S('o', 'lostThe') }),
    T('I need to call {C} tonight.', { C: S('o', 'p', { noMe: true }) }),
    T('Give {B} to {C}, please.', { B: S('o', 'give'), C: S('op', 'p') }),
    T('{A} sent {B} to {C} yesterday.', { A: S('s', 'p'), B: S('o', 'send'), C: S('op', 'p') }),
    T('How old {A:is|are} {A}?', { A: S('s', 'p', { noMe: true, noFam: true, inv: true }) }),
    T('Where {A:is|are} {A}?', { A: S('s', 'lost', { inv: true }) }),
    T('{A} {A:is|are} on the kitchen table.', { A: S('s', 'lost') }),
    T('{A} cleaned {B} with the class yesterday.', { A: S('s', 'young'), B: S('o', 'clean') }),
    T('{A} {A:recycles|recycle} {B} every week.', { A: S('s', 'p'), B: S('o', 'recycle') }),
    T('{A} watched {B} with {C}.', { A: S('s', 'p'), B: S('o', 'watch'), C: S('op', 'p') }),
    T('{A} often {A:plays|play} soccer with {C}.', { A: S('s', 'young'), C: S('op', 'p') }),
    T('Can you help {C} with the homework?', { C: S('o', 'young') }),
    T('{A} made {B} for {C}.', { A: S('s', 'p'), B: S('o', 'food'), C: S('op', 'p') }),
    T('{A} told {C} the truth.', { A: S('s', 'p'), C: S('o', 'p') }),
    T('Did {A} like {B}?', { A: S('s', 'p', { noMe: true, inv: true }), B: S('o', 'media') }),
    T('{A} {A:is|are} afraid of {B}.', { A: S('s', 'p'), B: S('op', 'fear') }),
    T("Don't tell {C} about {B}.", { C: S('o', 'p'), B: S('op', 'secret') }),
    T('{A} borrowed {B} from {C}.', { A: S('s', 'p'), B: S('o', 'borrow'), C: S('op', 'p') }),
    T('{A} {A:listens|listen} to {B} on the bus.', { A: S('s', 'p'), B: S('op', 'listen') }),
    T("Please don't touch {B}.", { B: S('o', 'touch') }),
    T('{A} {A:was|were} really expensive.', { A: S('s', 'pricey') }),
    T('The scary movie frightened {C}.', { C: S('o', 'p') }),
    T('Everybody was waiting for {C}.', { C: S('op', 'p') }),
  ];

  const ROLE = { s: 'Subjekt', o: 'Objekt', op: 'Objekt nach einer Präposition' };
  const NOTE = {
    pl: 'Mehrzahl',
    unc: 'nicht zählbar → wie Einzahl',
    pair: 'gibt es nur in der Mehrzahl',
    news: 'news ist Einzahl',
  };

  // Wählt für jedes Satzglied eine passende Person oder Sache: niemand doppelt, höchstens einmal „… and I/me“
  function choose(t, rng) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const pickd = {};
      const used = new Set();
      let me = false;
      let ok = true;
      for (const key of Object.keys(t.slots)) {
        const sl = t.slots[key];
        const pool = sl.from === 'p' ? PEOPLE : sl.from === 'young' ? PEOPLE.filter((p) => p.young) : THINGS[sl.from];
        const cand = pool.filter((x) => !(x.me && (sl.noMe || me)) && !(x.fam && sl.noFam) && !x.ids.some((id) => used.has(id)));
        if (!cand.length) { ok = false; break; }
        const x = pick(cand, rng);
        pickd[key] = x;
        x.ids.forEach((id) => used.add(id));
        if (x.me) me = true;
      }
      if (ok) return pickd;
    }
    throw new Error('pronoun-replace: keine passende Auswahl für ' + t.text);
  }

  function scene(rng) {
    const t = pick(TEMPLATES, rng);
    const np = choose(t, rng);
    const source = [];
    const target = [];
    const gaps = [];
    const parts = [];
    const text = (arr, v) => {
      const last = arr[arr.length - 1];
      if (last && last.t === 'text') last.v += v;
      else if (v) arr.push({ t: 'text', v });
    };
    const re = /\{([ABC])(?::([^|}]+)\|([^}]+))?\}/g;
    let pos = 0;
    let m;
    while ((m = re.exec(t.text))) {
      const plain = t.text.slice(pos, m.index);
      text(source, plain);
      text(target, plain);
      pos = re.lastIndex;
      const x = np[m[1]];
      if (m[2]) {
        const form = m.index === 0 ? cap(x.pl ? m[3] : m[2]) : x.pl ? m[3] : m[2];
        text(source, form);
        text(target, form);
        continue;
      }
      const role = t.slots[m[1]].role;
      const atStart = m.index === 0;
      const words = role === 's' ? x.s : x.o;
      const pron = role === 's' ? x.sp : x.op;
      source.push({ t: 'mark', v: atStart ? cap(words) : words });
      target.push({ t: 'gap' });
      gaps.push({ answer: atStart ? cap(pron) : pron, accept: [pron] });
      parts.push({ words, pron, role, x, inv: t.slots[m[1]].inv });
    }
    text(source, t.text.slice(pos));
    text(target, t.text.slice(pos));
    let g = 0;
    const answer = target.map((s) => (s.t === 'gap' ? gaps[g++].answer : s.v)).join('');
    return { t, np, source, target, gaps, parts, answer, sourceText: source.map((s) => s.v).join('') };
  }

  function why(p) {
    const bits = [ROLE[p.role]];
    if (!p.x.person && p.x.note !== 'sg') bits.push(NOTE[p.x.note]);
    if (p.inv) bits[0] = 'Subjekt, steht in der Frage hinter dem Verb';
    if (p.x.me) bits.push('du gehörst dazu');
    return p.words + ' → ' + p.pron + ' (' + bits.join(', ') + ')';
  }

  function replace(rng) {
    const s = scene(rng);
    return {
      kind: 'replace',
      task: s.gaps.length > 1 ? 'Ersetze die markierten Wörter durch Pronomen.' : 'Ersetze die markierten Wörter durch ein Pronomen.',
      source: s.source,
      target: s.target,
      gaps: s.gaps,
      answer: s.answer,
      explain: cap(s.parts.map(why).join(' · ')) + '.',
    };
  }

  TT.addLesson({
    id: 'pronoun-replace',
    title: 'Pronomen einsetzen',
    added: '2026-11-08',
    from: 'Übung nach test-english.com',
    rule:
      'Ersetze Personen und Dinge durch Pronomen. Wer etwas tut (Subjekt): I, you, he, she, it, we, they. ' +
      'Objekt (wen/wem, nach dem Verb oder nach einer Präposition): me, you, him, her, it, us, them. ' +
      'Achtung bei Fragen: In „How old is Emma?“, „Where are my keys?“ oder „Did Tom like it?“ ist Emma / my keys / Tom das Subjekt – ' +
      'also she / they / he, obwohl es hinter is, are oder did steht. Dinge: it für eine Sache und für Nichtzählbares ' +
      '(the music, the money, the news), they/them für Mehrzahl – auch für glasses, scissors, jeans, headphones. ' +
      'Wenn du dazugehörst: my dad and I → we, my dad and me → us. Diese Übung wird immer getippt.',
    examples: ['My dad and I love the songs. → We love them.', 'Give the money to Emma, please. → Give it to her, please.'],
    tip: 'Erst fragen: Subjekt oder Objekt? Dann: Person (he/him, she/her …) oder Sache (it, they/them)? „… and I“ → we, „… and me“ → us. In Fragen steht das Subjekt oft hinter is/are/did: How old is Emma? → How old is she?',
    kinds: ['replace'],
    make: (kind, rng) => replace(rng || Math.random),
    example: (rng) => {
      const s = scene(rng || Math.random);
      return s.sourceText + ' → ' + s.answer;
    },
    _scene: scene,
  });
})(globalThis.TT = globalThis.TT || {});
