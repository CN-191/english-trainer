(function (TT) {
  'use strict';

  const { pick, shuffle } = TT.util;
  const { sentence, marked, cap } = TT.lessonUtil;

  // What-Sätze betonen ein Satzglied: What + Rest des Satzes + was/is + betontes Satzglied.
  // Drei Bauarten:
  //   subj:    „what“ ist Subjekt  – The plot impressed me.        → What impressed me was the plot.
  //   obj:     „what“ ist Objekt   – They loved the cinematography. → What they loved was the cinematography.
  //   passive: Ausgangssatz im Passiv – The forest was destroyed by the fire.
  //            → What destroyed the forest was the fire. (subj) / What the fire destroyed was the forest. (obj)
  //            → What was destroyed was the forest. (What-Satz im Passiv, „what“ ist Subjekt)

  const N = (s) => (s.endsWith('|pl') ? { text: s.slice(0, -3), pl: true } : { text: s, pl: false });
  const V = (base, past, pp) => ({ base, past, pp: pp || past });
  const P = (text, person, number) => ({ text, person, number });

  // Was am Film/an der Musik beeindruckt
  const FOCUS = [
    'the plot', 'the ending', 'the soundtrack', 'the acting', 'the cinematography', 'the dialogue', 'the main character',
    'the final scene', 'the music', 'the story', 'the camera work', 'the humor', 'the setting', 'the twist', 'the opening scene',
    'the special effects|pl', 'the songs|pl', 'the costumes|pl', 'the actors|pl', 'the lyrics|pl', 'the jokes|pl',
  ].map(N);
  // Einmalige Momente eines Films: im Simple Present klingt „The twist shocks me“ seltsam – nur Vergangenheit
  const ONE_OFF = ['the ending', 'the final scene', 'the twist', 'the opening scene'];
  // Gefühlsverben, die ein Ding als Subjekt haben (The plot impressed me);
  // only = nur diese Satzglieder (und nur Vergangenheit), not = diese Satzglieder passen nicht
  const C = (base, past, opts) => Object.assign(V(base, past), opts);
  const SCARY = ['the ending', 'the final scene', 'the twist', 'the music', 'the special effects', 'the opening scene'];
  const CAUSE = [V('amaze', 'amazed'), V('impress', 'impressed'), V('surprise', 'surprised'), C('shock', 'shocked', { only: SCARY }), V('bore', 'bored'),
    V('annoy', 'annoyed'), C('scare', 'scared', { only: SCARY }), V('fascinate', 'fascinated'), V('confuse', 'confused'), V('disappoint', 'disappointed'),
    C('inspire', 'inspired', { not: ['the jokes', 'the humor'] })];
  const FEELERS_OBJ = ['me', 'us', 'him', 'her', 'them', 'the audience', 'the critics', 'my parents'];
  // Verben, bei denen eine Person das Subjekt ist (They loved the cinematography)
  const LIKE = [V('love', 'loved'), V('like', 'liked'), V('hate', 'hated'), V('enjoy', 'enjoyed'), V('remember', 'remembered'), V('admire', 'admired')];
  const FEELERS = [P('I', 1, 'sg'), P('we', 1, 'pl'), P('they', 3, 'pl'), P('she', 3, 'sg'), P('he', 3, 'sg'), P('my sister', 3, 'sg'),
    P('the audience', 3, 'sg'), P('the critics', 3, 'pl'), P('my friends', 3, 'pl'), P('the kids', 3, 'pl')];
  // Ereignisse mit Ursache (für Passiv-Ausgangssätze): Ursache → Verb → Betroffenes.
  // Nur Paare, die zusammenpassen (kein „The earthquake destroyed the forest“).
  const BUILDINGS = ['the village', 'the old bridge', 'the houses|pl'];
  const EVENTS = [
    { verb: V('destroy', 'destroyed'), pairs: [['the fire', ['the forest', 'the village', 'the houses|pl']], ['the storm', BUILDINGS], ['the flood', BUILDINGS], ['the earthquake', BUILDINGS]] },
    { verb: V('pollute', 'polluted'), pairs: [['the factory', ['the river', 'the air', 'the ocean']], ['the oil spill', ['the ocean', 'the beaches|pl', 'the river']], ['the traffic', ['the air']]] },
    { verb: V('damage', 'damaged'), pairs: [['the storm', ['the roof', 'the crops|pl', 'the old church']], ['the earthquake', ['the road', 'the old church', 'the roof']], ['the heat', ['the crops|pl', 'the road']]] },
    { verb: V('block', 'blocked'), pairs: ['the snow', 'a fallen tree', 'the protest'].map((c) => [c, ['the road', 'the entrance', 'the main street']]) },
    { verb: V('delay', 'delayed'), pairs: ['the strike', 'the bad weather', 'the snow'].map((c) => [c, ['the flight', 'the concert', 'the trains|pl']]) },
  ].map((e) => Object.assign({}, e, { pairs: e.pairs.map(([c, things]) => [c, things.map(N)]) }));

  const s3 = (subj) => subj.person === 3 && subj.number === 'sg';
  const present = (v, third) => (third ? TT.sForm(v) : v.base);
  const be = (tense, pl) => (tense === 'past' ? (pl ? 'were' : 'was') : pl ? 'are' : 'is');

  // Eine Satzsituation mit Ausgangssatz, What-Satz und Bauart
  function scene(rng, wantType) {
    const type = wantType || pick(['subj', 'subj', 'obj', 'obj', 'passive'], rng);
    if (type === 'subj') {
      const verb = pick(CAUSE, rng);
      const tense = verb.only || rng() < 0.7 ? 'past' : 'present';
      const foci = FOCUS.filter((f) => (!verb.only || verb.only.includes(f.text)) && !(verb.not || []).includes(f.text) &&
        (tense === 'past' || !ONE_OFF.includes(f.text)));
      const focus = pick(foci, rng);
      const who = pick(FEELERS_OBJ, rng);
      const most = rng() < 0.35 ? 'most' : '';
      const v = tense === 'past' ? verb.past : present(verb, !focus.pl);
      const clauseVerb = tense === 'past' ? verb.past : TT.sForm(verb); // „what“ ist Einzahl
      const clause = ['What', clauseVerb, who, most].filter(Boolean).join(' ');
      // ebenfalls richtig: What most impressed me … / What impressed me the most …
      const alts = most ? ['What most ' + clauseVerb + ' ' + who, 'What ' + clauseVerb + ' ' + who + ' the most'] : [];
      return {
        type, role: 'subj', tense, verb, focus, clause, alts, most, verbForm: clauseVerb,
        sourceSeg: marked('', cap(focus.text), ' ' + [v, who, most].filter(Boolean).join(' ') + '.'),
        source: sentence(focus.text, v, who, most),
        cleft: sentence(clause, be(tense, false), focus.text),
        cleftPl: focus.pl ? sentence(clause, be(tense, true), focus.text) : null,
        rest: { before: 'What ', gap: clauseVerb, after: ' ' + [who, most].filter(Boolean).join(' ') + ' ' + be(tense, false) + ' ' + focus.text + '.' },
      };
    }
    if (type === 'obj') {
      const verb = pick(LIKE, rng);
      const focus = pick(FOCUS, rng);
      const who = pick(FEELERS, rng);
      const tense = rng() < 0.6 ? 'past' : 'present';
      const most = rng() < 0.3 ? 'most' : '';
      const v = tense === 'past' ? verb.past : present(verb, s3(who));
      const clause = ['What', who.text, v, most].filter(Boolean).join(' ');
      // ebenfalls richtig: What the audience most admires … / What they loved the most …
      const alts = most ? ['What ' + who.text + ' most ' + v, 'What ' + who.text + ' ' + v + ' the most'] : [];
      return {
        type, role: 'obj', tense, verb, focus, who, clause, alts, most, verbForm: v,
        sourceSeg: marked(cap(who.text) + ' ' + v + ' ', focus.text, most ? ' most.' : '.'),
        source: sentence(who.text, v, focus.text, most),
        cleft: sentence(clause, be(tense, false), focus.text),
        cleftPl: focus.pl ? sentence(clause, be(tense, true), focus.text) : null,
        rest: { before: 'What ' + who.text + ' ', gap: v, after: ' ' + (most ? 'most ' : '') + be(tense, false) + ' ' + focus.text + '.' },
      };
    }
    // Passiv-Ausgangssatz: drei mögliche What-Sätze
    const ev = pick(EVENTS, rng);
    const [cause, things] = pick(ev.pairs, rng);
    const thing = pick(things, rng);
    const source = sentence(thing.text, thing.pl ? 'were' : 'was', ev.verb.pp, 'by', cause);
    const variant = pick(['subj', 'obj', 'passive'], rng);
    const base = { type, tense: 'past', verb: ev.verb, cause, thing, source, alts: [], most: '' };
    if (variant === 'subj') {
      const clause = 'What ' + ev.verb.past + ' ' + thing.text;
      return Object.assign(base, {
        variant, role: 'subj', focus: N(cause), clause, verbForm: ev.verb.past,
        sourceSeg: marked(cap(thing.text) + ' ' + (thing.pl ? 'were' : 'was') + ' ' + ev.verb.pp + ' by ', cause, '.'),
        cleft: sentence(clause, 'was', cause), cleftPl: null,
        rest: { before: 'What ', gap: ev.verb.past, after: ' ' + thing.text + ' was ' + cause + '.' },
      });
    }
    if (variant === 'obj') {
      const clause = 'What ' + cause + ' ' + ev.verb.past;
      return Object.assign(base, {
        variant, role: 'obj', focus: thing, clause, verbForm: ev.verb.past,
        sourceSeg: marked('', cap(thing.text), ' ' + (thing.pl ? 'were' : 'was') + ' ' + ev.verb.pp + ' by ' + cause + '.'),
        cleft: sentence(clause, 'was', thing.text), cleftPl: thing.pl ? sentence(clause, 'were', thing.text) : null,
        rest: { before: 'What ' + cause + ' ', gap: ev.verb.past, after: ' was ' + thing.text + '.' },
      });
    }
    const clause = 'What was ' + ev.verb.pp;
    return Object.assign(base, {
      // Den Handelnden aus dem Ausgangssatz zu behalten ist ebenfalls richtig: What was destroyed by the fire …
      variant, role: 'subj', passiveClause: true, focus: thing, clause, alts: [clause + ' by ' + cause], verbForm: 'was ' + ev.verb.pp,
      sourceSeg: marked('', cap(thing.text), ' ' + (thing.pl ? 'were' : 'was') + ' ' + ev.verb.pp + ' by ' + cause + '.'),
      cleft: sentence(clause, 'was', thing.text), cleftPl: thing.pl ? sentence(clause, 'were', thing.text) : null,
      rest: { before: 'What ', gap: 'was ' + ev.verb.pp, after: ' was ' + thing.text + '.' },
    });
  }

  // Alle richtigen What-Sätze zu einer Szene (fürs Umformen): Stellung von most, was/were bei Mehrzahl
  // und nach einem What-Teil in der Vergangenheit auch is/are (What I loved is the soundtrack).
  function accepted(s) {
    const cops = [be(s.tense, false)];
    if (s.focus.pl) cops.push(be(s.tense, true));
    if (s.tense === 'past' && s.type !== 'passive') cops.push(...(s.focus.pl ? ['is', 'are'] : ['is']));
    const out = [s.cleft, s.cleftPl];
    for (const c of [s.clause, ...(s.alts || [])]) for (const b of cops) out.push(sentence(c, b, s.focus.text));
    return [...new Set(out.filter(Boolean))];
  }
  const plNote = (s) => (s.cleftPl ? ' Bei Mehrzahl (' + s.focus.text + ') sind ' + (s.tense === 'past' ? 'was und were' : 'is und are') + ' beide üblich.' : '');
  const tenseName = (s) => (s.tense === 'past' ? 'Simple Past' : 'Simple Present');

  function roleText(s) {
    if (s.passiveClause) return `What-Satz im Passiv: „what“ ist Subjekt, danach was + 3. Form (What was ${s.verb.pp} …).`;
    if (s.role === 'subj') return '„what“ ist Subjekt: Nach What kommt direkt das Verb (' + s.clause + ' …).';
    return '„what“ ist Objekt: Nach What kommt erst das Subjekt, dann das Verb (' + s.clause + ' …) – ohne did/does.';
  }

  function label(s) {
    if (s.passiveClause) return '→ What-Satz im Passiv';
    return s.role === 'subj' ? '→ What-Satz · what ist Subjekt' : '→ What-Satz · what ist Objekt';
  }

  function transform(rng) {
    const s = scene(rng);
    return {
      kind: 'transform', task: 'Bilde einen What-Satz, der das markierte Satzglied betont.', label: label(s),
      source: s.sourceSeg, input: 'sentence', accept: accepted(s), answer: s.cleft,
      explain: roleText(s) + ' Dann ' + (s.tense === 'past' ? 'was' : 'is') + ' + das betonte Satzglied.' + plNote(s),
    };
  }

  function cloze(rng) {
    const s = scene(rng);
    const bePart = rng() < 0.35 && !s.passiveClause;
    if (bePart) {
      const ok = be(s.tense, false);
      const okPl = s.cleftPl ? be(s.tense, true) : null;
      const [beforeBe, afterBe] = s.cleft.slice(0, -1).split(' ' + ok + ' ' + s.focus.text);
      const wrong = [`it ${ok}`, s.tense === 'past' ? 'did' : 'does', 'that'];
      // Zeitform im Hinweis: Nach einem What-Teil in der Vergangenheit wäre sonst auch is richtig.
      return {
        kind: 'cloze', task: 'Setze das fehlende Wort ein.', before: beforeBe + ' ', after: ' ' + s.focus.text + '.', hint: 'be · ' + tenseName(s),
        accept: [ok, okPl].filter(Boolean), answer: ok, choices: shuffle([ok, ...wrong], rng),
        explain: 'Zwischen What-Teil und betontem Satzglied steht ' + ok + ' – ohne zusätzliches it.' + plNote(s),
      };
    }
    const r = s.rest;
    const ok = r.gap;
    // Keine Option mit betontem did/does: „What did impress me …“ wäre ebenfalls richtig.
    // In der Vergangenheit keine Präsensformen: „What I remember most was …“ ist richtiges Englisch.
    const wrong = s.passiveClause
      ? [s.verb.past, 'was ' + s.verb.base, 'has ' + s.verb.pp]
      : (s.tense === 'past' ? [TT.ingForm(s.verb), 'to ' + s.verb.base] : [s.verb.base, TT.sForm(s.verb), TT.ingForm(s.verb), 'to ' + s.verb.base])
        .filter((w) => w !== ok).slice(0, 3);
    return {
      kind: 'cloze', task: 'Setze das Verb in der richtigen Form ein.', before: r.before, after: r.after,
      hint: s.verb.base + ' · ' + (s.passiveClause ? 'Passiv, Simple Past' : tenseName(s)), accept: [ok], answer: ok,
      choices: shuffle([ok, ...wrong.filter((w) => w !== ok)], rng), explain: roleText(s),
    };
  }

  // Fehlervarianten (nur echte Fehler)
  function errors(s) {
    const tail = s.cleft.slice(s.clause.length + 1, -1); // „was the plot“
    const out = [
      { text: s.clause + ' it ' + tail + '.', why: 'Kein zusätzliches it: ' + s.clause + ' ' + tail + '.' },
      { text: s.clause + ' ' + s.focus.text + '.', why: 'Zwischen What-Teil und betontem Satzglied fehlt ' + tail.split(' ')[0] + '.' },
      { text: 'That' + s.cleft.slice(4), why: 'Ein What-Satz beginnt mit What, nicht mit That.' },
    ];
    if (s.role === 'obj' && !s.passiveClause && s.who) {
      const aux = s.tense === 'past' ? 'did' : s3(s.who) ? 'does' : 'do';
      const wrongClause = ['What', aux, s.who.text, s.verb.base, s.most].filter(Boolean).join(' ');
      out.push({ text: wrongClause + ' ' + tail + '.', why: 'Keine Frage-Wortstellung: ' + s.clause + ' …, nicht ' + wrongClause + ' …' });
    }
    if (s.passiveClause) out.push({ text: 'What ' + s.verb.past + ' ' + tail + '.', why: 'Hier fehlt das Passiv: What was ' + s.verb.pp + ' …' });
    return out;
  }

  function errorspot(rng) {
    const s = scene(rng);
    const base = { kind: 'errorspot', task: 'Ist der Satz richtig?', answer: s.cleft };
    if (rng() < 0.45) {
      const shown = s.cleftPl && rng() < 0.5 ? s.cleftPl : s.cleft;
      return Object.assign(base, { shown, correct: true, options: [], explain: 'Der Satz ist korrekt. ' + roleText(s) + plNote(s) });
    }
    const errs = errors(s);
    const err = pick(errs, rng);
    const other = pick(errs.filter((e) => e !== err), rng);
    return Object.assign(base, { shown: err.text, correct: false, options: shuffle([s.cleft, err.text, other.text], rng), explain: err.why });
  }

  function identify(rng) {
    const s = scene(rng);
    if (rng() < 0.5) {
      const isSubj = s.role === 'subj';
      return {
        kind: 'identify', task: 'Ist „what“ in diesem Satz Subjekt oder Objekt?',
        sentence: marked('', s.clause, ' ' + s.cleft.slice(s.clause.length + 1)),
        options: [{ label: 'Subjekt', correct: isSubj }, { label: 'Objekt', correct: !isSubj }], explain: roleText(s),
      };
    }
    // Welcher Satz betont das genannte Satzglied? Ein Passivsatz mit by stellt die Ursache schon ans Ende –
    // dann ist der Aktivsatz die falsche Option, nicht der Ausgangssatz.
    const wrong = [s.type === 'passive' && s.variant === 'subj' ? sentence(s.cause, s.verb.past, s.thing.text) : s.source];
    if (s.type === 'passive' && s.variant !== 'passive') {
      const swap = s.variant === 'subj'
        ? sentence('What', s.cause, s.verb.past, 'was', s.thing.text)
        : sentence('What', s.verb.past, s.thing.text, 'was', s.cause);
      wrong.push(swap);
    } else {
      wrong.push(errors(s)[0].text);
    }
    return {
      kind: 'identify', task: 'Welcher Satz betont „' + s.focus.text + '“?', sentence: [{ t: 'text', v: s.source }],
      options: shuffle([{ label: s.cleft, correct: true }, ...wrong.map((w) => ({ label: w, correct: false }))], rng),
      explain: 'Das betonte Satzglied steht am Ende, nach ' + (s.tense === 'past' ? 'was' : 'is') + ': ' + s.cleft + ' ' + roleText(s),
    };
  }

  const MAKE = { transform, cloze, errorspot, identify };

  TT.addLesson({
    id: 'what-clauses',
    title: 'What-Sätze zur Betonung',
    added: '2026-11-06',
    rule:
      'Ein What-Satz stellt das Wichtige ans Ende: What + Rest des Satzes + was/is + betontes Satzglied. ' +
      'Ist „what“ Subjekt, folgt direkt das Verb (What amazed me …). Ist „what“ Objekt, folgt erst ein Subjekt (What they loved …). ' +
      'Auch Passiv geht: What was destroyed was the forest.',
    examples: ['What amazed me was the soundtrack.', 'What impressed me most was the imaginative plot.', 'What they loved was the cinematography.'],
    tip: 'What + (Subjekt) + Verb … + was/is + das Wichtige. Kein it, keine Frage-Wortstellung (nicht: What did they love …).',
    kinds: ['transform', 'cloze', 'errorspot', 'identify'],
    make: (kind, rng) => MAKE[kind](rng || Math.random),
    _scene: scene,
    _errors: errors,
    _accepted: accepted,
  });
})(globalThis.TT = globalThis.TT || {});
