(function (TT) {
  'use strict';

  const { pick, shuffle } = TT.util;
  const { sentence, cap } = TT.lessonUtil;

  // Passiv = be in der Zeitform + 3. Form; der Handelnde steht mit by (oder fehlt).
  const TENSES = {
    'present-simple': { name: 'Simple Present', be: (pl) => (pl ? 'are' : 'is') },
    'past-simple': { name: 'Simple Past', be: (pl) => (pl ? 'were' : 'was') },
    'present-perfect': { name: 'Present Perfect', be: (pl) => (pl ? 'have been' : 'has been') },
    'future-simple': { name: 'will-Future', be: () => 'will be' },
  };

  const V = (base, past, pp) => ({ base, past, pp });
  // Dinge: „|pl“ = Mehrzahl
  const N = (s) => (s.endsWith('|pl') ? { text: s.slice(0, -3), pl: true } : { text: s, pl: false });
  // Handelnde; noBy = klingt als „by …“ unnatürlich (by me, by us) – nur in Aktivsätzen;
  // force = Naturgewalt (the storm, the wind): „destroyed from the flood“ ist umgangssprachlich, kein klarer Fehler
  const A = (text, person, number, opts) => Object.assign({ text, person: person || 3, number: number || 'sg' }, opts);
  const PRON = { I: A('I', 1, 'sg', { noBy: true }), we: A('we', 1, 'pl', { noBy: true }), they: A('they', 3, 'pl'), she: A('she', 3, 'sg'), he: A('he', 3, 'sg') };
  const FORCE = { force: true };
  const OBJ = { I: 'me', we: 'us', they: 'them', she: 'her', he: 'him' };
  const agentObj = (a) => OBJ[a.text] || a.text;

  // Rahmen: Verb, mögliche Dinge, mögliche Handelnde (nur Kombinationen, die zusammenpassen) und Optionen:
  //   every   = Zeitangabe für Gewohnheiten (nur dann Simple Present)
  //   fromOk  = „from …“ ergibt mit diesem Verb einen richtigen Satz (sent from, protected from) – dann kein from-Fehler
  //   past / future = passende Zeitangaben für Simple Past / will-Future (leer = ohne Zeitangabe)
  //   noFuture = keine Vorhersage (A thief will steal the painting …)
  const F = (verb, things, agents, o) => ({
    verb, things: things.map(N), agents, every: o.every || '', fromOk: !!o.fromOk, noFuture: !!o.noFuture,
    time: { 'past-simple': o.past || [], 'future-simple': o.future || [] },
  });
  const W = V('write', 'wrote', 'written');
  const MK = V('make', 'made', 'made');
  const POL = V('pollute', 'polluted', 'polluted');
  const DES = V('destroy', 'destroyed', 'destroyed');
  const CL = V('clean', 'cleaned', 'cleaned');
  const WA = V('watch', 'watched', 'watched');
  const REC = V('recycle', 'recycled', 'recycled');
  const PRO = V('produce', 'produced', 'produced');
  const BR = V('break', 'broke', 'broken');
  const FRAMES = [
    F(W, ['the song', 'the songs|pl', 'the lyrics|pl'], [A('the band'), A('my sister'), PRON.she, PRON.I], { past: ['last year', 'in 2019', 'last week'], future: ['next month', 'soon'] }),
    F(W, ['the script', 'the article', 'the book'], [A('a famous author'), A('my sister'), A('the students', 3, 'pl'), PRON.she, PRON.I], { past: ['last year', 'last week'], future: ['next month', 'soon'] }),
    F(MK, ['the film', 'the video'], [A('a small studio'), A('the director'), A('the team'), PRON.they], { past: ['last year', 'in 2019'], future: ['next year', 'soon'] }),
    F(MK, ['the cake', 'the costumes|pl', 'the decision'], [A('my grandmother'), PRON.they, PRON.we], { past: ['yesterday', 'last week'], future: ['tomorrow', 'soon'] }),
    F(POL, ['the ocean', 'the river', 'the beaches|pl', 'the lake'], [A('the factory'), A('the government'), A('the oil company'), A('the tourists', 3, 'pl')], { every: 'every day', fromOk: true, past: ['last year', 'in 2019'] }),
    F(POL, ['the air'], [A('the factory'), A('the traffic'), A('the oil company')], { every: 'every day', fromOk: true, past: ['last year', 'in 2019'] }),
    F(V('build', 'built', 'built'), ['the bridge', 'the stadium', 'the new school', 'the houses|pl'], [A('a local company'), A('the city'), A('the workers', 3, 'pl'), PRON.they], { past: ['last year', 'in 2019'], future: ['next year'] }),
    F(V('direct', 'directed', 'directed'), ['the film', 'the show', 'the play'], [A('a young director'), A('a famous director'), PRON.she, PRON.he], { past: ['last year', 'in 2019'], future: ['next year'] }),
    F(V('record', 'recorded', 'recorded'), ['the album', 'the songs|pl', 'the interview', 'the podcast'], [A('the band'), A('a small studio'), A('my brother'), PRON.we], { fromOk: true, past: ['last year', 'last week'], future: ['next week', 'next month'] }),
    F(DES, ['the forest'], [A('the storm', 3, 'sg', FORCE), A('the fire', 3, 'sg', FORCE)], { noFuture: true, past: ['last year', 'in 2019', 'last week'] }),
    F(DES, ['the village', 'the old buildings|pl', 'the bridge'], [A('the storm', 3, 'sg', FORCE), A('the fire', 3, 'sg', FORCE), A('the earthquake', 3, 'sg', FORCE), A('the flood', 3, 'sg', FORCE)], { noFuture: true, past: ['last year', 'in 2019', 'last week'] }),
    F(CL, ['the beach', 'the streets|pl', 'the park'], [A('the volunteers', 3, 'pl'), A('the students', 3, 'pl'), PRON.we, A('the city')], { every: 'every week', past: ['last week', 'yesterday'], future: ['tomorrow', 'next week'] }),
    F(CL, ['the classroom'], [A('the students', 3, 'pl'), PRON.we], { every: 'every week', past: ['last week', 'yesterday'], future: ['tomorrow', 'next week'] }),
    F(WA, ['the show', 'the video'], [A('millions of people', 3, 'pl'), A('the whole family'), A('my parents', 3, 'pl'), PRON.I], { every: 'every week', past: ['last night', 'yesterday'], future: ['tomorrow', 'next week'] }),
    F(WA, ['the match', 'the final episode'], [A('millions of people', 3, 'pl'), A('the whole family'), A('my parents', 3, 'pl'), PRON.I], { past: ['last night', 'yesterday'], future: ['tomorrow', 'next week'] }),
    F(V('sing', 'sang', 'sung'), ['the song', 'the national anthem', 'the songs|pl'], [A('a famous singer'), A('the children', 3, 'pl'), A('the choir'), PRON.she], { past: ['last night', 'yesterday'], future: ['tomorrow', 'tonight'] }),
    F(V('paint', 'painted', 'painted'), ['the picture', 'the walls|pl', 'the poster'], [A('my uncle'), A('a young artist'), A('the kids', 3, 'pl'), PRON.I], { past: ['last week', 'last year'], future: ['next week', 'next month'] }),
    F(V('design', 'designed', 'designed'), ['the costumes|pl', 'the poster', 'the website', 'the set'], [A('a young designer'), A('the art students', 3, 'pl'), A('my cousin')], { past: ['last year', 'last month'], future: ['next month'] }),
    F(V('translate', 'translated', 'translated'), ['the book', 'the subtitles|pl', 'the letter'], [A('a professional translator'), A('my teacher'), PRON.she], { fromOk: true, past: ['last year', 'last week'], future: ['next month', 'soon'] }),
    F(V('steal', 'stole', 'stolen'), ['the painting', 'the money', 'the bikes|pl'], [A('two men', 3, 'pl'), A('a thief')], { fromOk: true, noFuture: true, past: ['last night', 'last week', 'in 2019'] }),
    F(V('protect', 'protected', 'protected'), ['the forest', 'the animals|pl', 'the coast'], [A('the new law'), A('the rangers', 3, 'pl'), A('the government')], { fromOk: true, past: ['last year', 'in 2019'], future: ['next year', 'soon'] }),
    F(REC, ['the bottles|pl', 'the paper'], [A('the school'), A('our town'), A('the company')], { every: 'every month', fromOk: true, past: ['last month', 'last year'], future: ['next month', 'soon'] }),
    F(REC, ['the old phones|pl'], [A('the company')], { every: 'every month', fromOk: true, past: ['last month', 'last year'], future: ['next month', 'soon'] }),
    F(PRO, ['the show', 'the first season'], [A('a big streaming company'), A('a famous producer')], { past: ['last year', 'in 2019'], future: ['next year'] }),
    F(PRO, ['the album'], [A('a famous producer')], { past: ['last year', 'in 2019'], future: ['next year'] }),
    F(V('review', 'reviewed', 'reviewed'), ['the film', 'the new album', 'the show'], [A('the critics', 3, 'pl'), A('a famous critic')], { past: ['last week', 'yesterday'], future: ['next week', 'soon'] }),
    F(V('choose', 'chose', 'chosen'), ['the winner', 'the songs|pl', 'the best film'], [A('the audience'), A('the jury'), A('the fans', 3, 'pl')], { every: 'every year', fromOk: true, past: ['last year', 'last night', 'yesterday'], future: ['tomorrow', 'next week'] }),
    F(V('take', 'took', 'taken'), ['the photos|pl', 'the picture'], [A('a tourist'), A('my mom'), PRON.I], { fromOk: true, past: ['yesterday', 'last week'], future: ['tomorrow'] }),
    F(BR, ['the window'], [A('the kids', 3, 'pl'), A('the wind', 3, 'sg', FORCE), A('my dog')], { noFuture: true, past: ['yesterday', 'last week', 'last night'] }),
    F(BR, ['the vase', 'the glasses|pl'], [A('the kids', 3, 'pl'), A('my dog')], { noFuture: true, past: ['yesterday', 'last week', 'last night'] }),
    F(V('send', 'sent', 'sent'), ['the email', 'the letters|pl', 'the photos|pl'], [A('the manager'), A('my aunt'), PRON.we], { fromOk: true, past: ['yesterday', 'last week'], future: ['tomorrow', 'next week'] }),
  ];

  // Satz in allen üblichen Stellungen der Zeitangabe: am Ende, vor by …, vorangestellt (mit oder ohne Komma –
  // Kommas zählen beim Prüfen nicht); „soon“ auch zwischen will und Verb (will soon be painted).
  function place(subj, verb, rest, time, soonVerb) {
    const out = [sentence(subj, verb, rest, time)];
    if (!time) return out;
    if (rest.startsWith('by ')) out.push(sentence(subj, verb, time, rest));
    out.push(sentence(time + ',', subj, verb, rest));
    if (time === 'soon' && soonVerb) out.push(sentence(subj, soonVerb, rest));
    return out;
  }

  // opts.by: Der Satz zeigt den Handelnden mit by → keine Handelnden, die als „by me/us“ unnatürlich klingen
  function scene(rng, wantTense, opts) {
    const o = opts || {};
    const frame = pick(FRAMES, rng);
    const pool = Object.keys(TENSES).filter((t) => (t !== 'present-simple' || frame.every) && (t !== 'future-simple' || !frame.noFuture));
    const tense = wantTense && pool.includes(wantTense) ? wantTense : pick(pool, rng);
    const thing = pick(frame.things, rng);
    const agent = pick(o.by ? frame.agents.filter((a) => !a.noBy) : frame.agents, rng);
    const times = frame.time[tense] || [];
    const time = tense === 'present-simple' ? frame.every : times.length && rng() < 0.6 ? pick(times, rng) : '';
    const verb = frame.verb;
    const be = TENSES[tense].be(thing.pl);
    const by = 'by ' + agentObj(agent);
    const activeVerb = TT.conjugate(verb, agent, tense, 'aff').full;
    const active = sentence(agent.text, activeVerb, thing.text, time);
    const passive = sentence(thing.text, be, verb.pp, by, time);
    const passiveShort = sentence(thing.text, be, verb.pp, time);
    // Alle richtigen Fassungen; beim will-Future zählt auch going to (Projektentscheidung)
    const future = tense === 'future-simple';
    const gtBe = (thing.pl ? 'are' : 'is') + ' going to be';
    const soonP = future ? 'will soon be ' + verb.pp : '';
    const passiveAll = place(thing.text, be + ' ' + verb.pp, by, time, soonP);
    const passiveShortAll = place(thing.text, be + ' ' + verb.pp, '', time, soonP);
    const activeAll = place(agent.text, activeVerb, thing.text, time, future ? 'will soon ' + verb.base : '');
    if (future) {
      passiveAll.push(...place(thing.text, gtBe + ' ' + verb.pp, by, time));
      passiveShortAll.push(...place(thing.text, gtBe + ' ' + verb.pp, '', time));
      activeAll.push(...place(agent.text, TT.goingTo(verb, agent, 'aff').full, thing.text, time));
    }
    return { frame, verb, tense, thing, agent, time, be, gtBe, active, passive, passiveShort, passiveAll, passiveShortAll, activeAll };
  }

  const tip = 'Passiv = be in der Zeitform + 3. Form (was made, has been made, will be made). Wer es tut, steht mit by.';
  const formulaText = (s) => `Passiv im ${TENSES[s.tense].name}: ${cap(s.thing.text)} → ${s.be} + 3. Form (${s.verb.pp}).`;
  const goingToNote = (s) => (s.tense === 'future-simple' ? ` Auch richtig: ${s.gtBe} ${s.verb.pp}.` : '');

  function transform(rng) {
    if (rng() < 0.25) {
      const s = scene(rng, null, { by: true });
      const who = agentObj(s.agent) === s.agent.text
        ? `Im Aktiv wird der Handelnde (${s.agent.text}) zum Subjekt.`
        : `Im Aktiv wird der Handelnde zum Subjekt: ${agentObj(s.agent)} → ${s.agent.text}.`;
      return {
        kind: 'transform', task: 'Forme den Satz ins Aktiv um (gleiche Zeitform).', label: '→ Aktiv',
        source: [{ t: 'text', v: s.passive }], input: 'sentence', accept: s.activeAll, answer: s.active,
        explain: who + (s.tense === 'future-simple' ? ' Auch going to ist richtig.' : ''),
      };
    }
    const s = scene(rng);
    // Bei I/we als Handelndem ist der Satz ohne by die natürliche Lösung („by me“ ist grammatisch, klingt aber seltsam)
    return {
      kind: 'transform', task: 'Forme den Satz ins Passiv um (gleiche Zeitform).', label: '→ Passiv',
      source: [{ t: 'text', v: s.active }], input: 'sentence', accept: [...s.passiveAll, ...s.passiveShortAll],
      answer: s.agent.noBy ? s.passiveShort : s.passive,
      explain: formulaText(s) + (s.agent.noBy
        ? ' Bei I oder we lässt man den Handelnden meist weg – „by me“ oder „by us“ klingt unnatürlich.'
        : ' Der Handelnde steht mit by – ohne by … ist der Satz auch richtig.') + goingToNote(s),
    };
  }

  function cloze(rng) {
    const s = scene(rng, null, { by: true });
    const correct = s.be + ' ' + s.verb.pp;
    const wrong = [
      s.be + ' ' + s.verb.base,
      TT.conjugate(s.verb, { person: 3, number: s.thing.pl ? 'pl' : 'sg' }, s.tense, 'aff').full,
      TENSES[s.tense].be(!s.thing.pl) + ' ' + s.verb.pp,
    ].filter((w, i, all) => w !== correct && all.indexOf(w) === i);
    const after = ['by', agentObj(s.agent), s.time].filter(Boolean).join(' ') + '.';
    const accept = s.tense === 'future-simple' ? [correct, s.gtBe + ' ' + s.verb.pp] : [correct];
    return {
      kind: 'cloze', task: 'Setze das Verb im Passiv ein.', before: cap(s.thing.text) + ' ', after: ' ' + after,
      hint: s.verb.base + ' · ' + TENSES[s.tense].name, accept, answer: correct,
      choices: shuffle([correct, ...wrong.slice(0, 3)], rng), explain: formulaText(s) + goingToNote(s),
    };
  }

  // Fehlervarianten eines Passivsatzes (nur echte Fehler)
  function errors(s) {
    const by = ['by', agentObj(s.agent), s.time];
    const out = [];
    if (s.verb.base !== s.verb.pp) out.push({ text: sentence(s.thing.text, s.be, s.verb.base, ...by), why: `Nach be steht die 3. Form: ${s.verb.pp}, nicht ${s.verb.base}.` });
    if (s.verb.past !== s.verb.pp) out.push({ text: sentence(s.thing.text, s.be, s.verb.past, ...by), why: `Die 3. Form von ${s.verb.base} ist ${s.verb.pp} (${s.verb.base} – ${s.verb.past} – ${s.verb.pp}).` });
    if (s.tense === 'past-simple') out.push({ text: sentence(s.thing.text, s.verb.pp, ...by), why: `Im Passiv braucht es be: ${s.be} ${s.verb.pp}, nicht nur ${s.verb.pp}.` });
    if (s.tense === 'past-simple' || s.tense === 'present-simple' || s.tense === 'present-perfect') {
      out.push({ text: sentence(s.thing.text, TENSES[s.tense].be(!s.thing.pl), s.verb.pp, ...by), why: `be richtet sich nach dem Subjekt: ${s.thing.text} → ${s.be}.` });
    }
    if (!s.frame.fromOk && !s.agent.force) out.push({ text: sentence(s.thing.text, s.be, s.verb.pp, 'from', agentObj(s.agent), s.time), why: 'Der Handelnde steht mit by, nicht mit from (deutsch „von“).' });
    return out;
  }

  function errorspot(rng) {
    const s = scene(rng, null, { by: true });
    const errs = errors(s);
    const base = { kind: 'errorspot', task: 'Ist der Satz richtig?', answer: s.passive };
    if (rng() < 0.5) return Object.assign(base, { shown: s.passive, correct: true, options: [], explain: 'Der Satz ist korrekt. ' + formulaText(s) });
    const err = pick(errs, rng);
    const other = pick(errs.filter((e) => e !== err), rng) || null;
    const options = shuffle([s.passive, err.text, other ? other.text : null].filter(Boolean), rng);
    return Object.assign(base, { shown: err.text, correct: false, options, explain: err.why });
  }

  function identify(rng) {
    const isPassive = rng() < 0.5;
    const s = scene(rng, null, { by: isPassive });
    const text = isPassive ? (rng() < 0.3 ? s.passiveShort : s.passive) : s.active;
    return {
      kind: 'identify', task: 'Steht der Satz im Aktiv oder im Passiv?', sentence: [{ t: 'text', v: text }],
      options: [{ label: 'Aktiv', correct: !isPassive }, { label: 'Passiv', correct: isPassive }],
      explain: isPassive
        ? `Passiv: be + 3. Form (${s.be} ${s.verb.pp}). Das Betroffene (${s.thing.text}) ist Subjekt – mit ihm passiert etwas.`
        : `Aktiv: Der Handelnde (${s.agent.text}) ist Subjekt und tut etwas.`,
    };
  }

  const MAKE = { transform, cloze, errorspot, identify };

  TT.addLesson({
    id: 'passive',
    title: 'Aktiv und Passiv',
    added: '2026-11-06',
    rule:
      'Im Aktiv tut das Subjekt etwas. Im Passiv wird das Objekt zum Subjekt: be in der passenden Zeitform + 3. Form des Verbs. ' +
      'Wer es tut, kann mit by angehängt werden oder wegfallen.',
    examples: ['The government polluted the ocean.', 'The ocean was polluted by the government.'],
    tip,
    kinds: ['transform', 'cloze', 'errorspot', 'identify'],
    make: (kind, rng) => MAKE[kind](rng || Math.random),
    _scene: scene,
    _errors: errors,
  });
})(globalThis.TT = globalThis.TT || {});
