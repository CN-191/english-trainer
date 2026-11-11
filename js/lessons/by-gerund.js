(function (TT) {
  'use strict';

  const { pick, shuffle } = TT.util;
  const { sentence, marked, cap } = TT.lessonUtil;

  // by + -ing-Form erklärt, WIE jemand etwas macht oder erreicht (deutsch „indem …“, „dadurch, dass …“):
  //   She improved her English by watching series with English subtitles.
  //   How did they make the film? – By using a lot of special effects.
  //   He saved money by not paying for three streaming services.
  // Eine Szene = Ziel (Satz ohne by) + Weg dorthin (Verb + Rest), dazu eine Person und die Zeitform.

  // Verb: Grundform, Simple Past; -ing-Form und -s-Form kommen aus conjugate.js (TT.ingForm, TT.sForm)
  const V = (base, past) => ({ base, past, pp: past });
  // Person: Text, Possessivbegleiter, Person/Zahl, Pronomen für den zweiten Satz
  const P = (text, pos, person, number, pron) => ({ text, pos, person, number, pron: pron || text });
  // Weg: Verb + Rest ({pos} = Possessivbegleiter der Person); neg = by not + -ing
  const M = (v, rest) => ({ v, rest, neg: false });
  const NOT = (v, rest) => ({ v, rest, neg: true });
  // Ziel: Verb + Rest, passende Personen, Zeitformen, Wege
  const G = (v, rest, people, tenses, ways) => ({ v, rest, people, tenses, ways });

  const PEOPLE = [
    P('I', 'my', 1, 'sg'), P('we', 'our', 1, 'pl'), P('she', 'her', 3, 'sg'), P('he', 'his', 3, 'sg'), P('they', 'their', 3, 'pl'),
    P('my sister', 'her', 3, 'sg', 'she'), P('my brother', 'his', 3, 'sg', 'he'), P('Mia', 'her', 3, 'sg', 'she'), P('Jake', 'his', 3, 'sg', 'he'),
  ];
  const ONE = PEOPLE.filter((p) => p.number === 'sg');
  const DIRECTORS = [P('the director', 'her', 3, 'sg', 'she'), P('the filmmakers', 'their', 3, 'pl', 'they')];
  const STUDIOS = [P('the studio', 'its', 3, 'sg', 'it'), P('the producers', 'their', 3, 'pl', 'they')];
  const ARTISTS = [P('the band', 'their', 3, 'sg', 'they'), P('she', 'her', 3, 'sg'), P('he', 'his', 3, 'sg'), P('my cousin', 'her', 3, 'sg', 'she')];
  const PARENTS = [P('our neighbors', 'their', 3, 'pl', 'they'), P('we', 'our', 1, 'pl'), P('she', 'her', 3, 'sg'), P('he', 'his', 3, 'sg')];

  const watch = V('watch', 'watched');
  const listen = V('listen', 'listened');
  const use = V('use', 'used');
  const play = V('play', 'played');
  const read = V('read', 'read');
  const share = V('share', 'shared');
  const wait = V('wait', 'waited');
  const film = V('film', 'filmed');
  const build = V('build', 'built');
  const hire = V('hire', 'hired');
  const post = V('post', 'posted');
  const release = V('release', 'released');
  const win = V('win', 'won');
  const follow = V('follow', 'followed');
  const check = V('check', 'checked');
  const letV = V('let', 'let');

  const GOALS = [
    G(V('improve', 'improved'), '{pos} English', PEOPLE, ['past'], [
      M(watch, 'series with English subtitles'), M(watch, 'movies in English without subtitles'), M(listen, 'to English podcasts'),
      M(V('chat', 'chatted'), 'with gamers from other countries'), M(V('sing', 'sang'), 'along to American pop songs'),
      M(use, 'a language app every day'), M(V('write', 'wrote'), 'comments in English on fan forums'), NOT(watch, 'dubbed movies'),
    ]),
    G(V('save', 'saved'), 'money', PEOPLE, ['past', 'present'], [
      M(share, 'a streaming account with {pos} roommates'), NOT(V('pay', 'paid'), 'for three streaming services'),
      M(wait, 'for new movies to come out on streaming'), NOT(V('go', 'went'), 'to the movies every weekend'),
      M(V('buy', 'bought'), 'used video games'), M(V('stream', 'streamed'), 'movies at home'),
    ]),
    G(V('relax', 'relaxed'), 'after work', PEOPLE, ['present'], [
      M(watch, 'old sitcoms'), M(play, 'video games'), M(listen, 'to jazz'), NOT(check, '{pos} work emails'),
      M(V('binge-watch', 'binge-watched'), 'cooking shows'),
    ]),
    G(V('find', 'found'), 'new shows', PEOPLE, ['present'], [
      M(read, 'online reviews'), M(V('ask', 'asked'), '{pos} friends for tips'), M(follow, 'film critics on social media'),
      M(check, 'the top ten lists on streaming apps'),
    ]),
    G(V('avoid', 'avoided'), 'spoilers', PEOPLE, ['past', 'present'], [
      M(V('stay', 'stayed'), 'off social media'), M(watch, 'new episodes right away'), NOT(read, 'the comments online'),
      M(V('turn', 'turned'), 'off {pos} phone notifications'),
    ]),
    G(V('learn', 'learned'), 'to play the guitar', PEOPLE, ['past'], [
      M(watch, 'online tutorials'), M(V('copy', 'copied'), '{pos} favorite songs'), M(V('practice', 'practiced'), 'every day'),
      NOT(V('give', 'gave'), 'up'), M(play, 'along with music videos'),
    ]),
    G(V('get', 'got'), 'tickets for the premiere', PEOPLE, ['past'], [
      M(V('enter', 'entered'), 'an online contest'), M(wait, 'in line for six hours'), M(win, 'a radio contest'),
      M(V('ask', 'asked'), 'a friend who works at the studio'),
    ]),
    G(V('get', 'got'), 'out of family movie night', ONE, ['past'], [
      M(V('lie', 'lied'), 'about having too much homework'), M(V('pretend', 'pretended'), 'to be sick'),
    ]),
    G(V('make', 'made'), 'the battle scenes look realistic', DIRECTORS, ['past'], [
      M(use, 'a lot of special effects'), M(film, 'in real locations'), M(build, 'huge sets'), M(hire, 'hundreds of extras'),
      NOT(use, 'too much CGI'),
    ]),
    G(V('save', 'saved'), 'money', DIRECTORS, ['past'], [
      M(film, 'everything in one city'), M(V('shoot', 'shot'), 'the whole movie in six weeks'), NOT(hire, 'famous actors'),
      M(V('work', 'worked'), 'with a small crew'),
    ]),
    G(V('create', 'created'), 'special effects', [P('early filmmakers', 'their', 3, 'pl', 'they')], ['past'], [
      M(V('stop', 'stopped'), 'the camera between shots'), M(V('paint', 'painted'), 'backgrounds on glass'), M(build, 'small models of cities'),
      M(V('run', 'ran'), 'the film backward'),
    ]),
    G(V('promote', 'promoted'), 'the movie', STUDIOS, ['past'], [
      M(post, 'short clips on social media'), M(release, 'three different trailers'), M(V('send', 'sent'), 'the actors on a world tour'),
      M(V('put', 'put'), 'posters on buses all over the city'), M(V('organize', 'organized'), 'free screenings for students'),
    ]),
    G(V('become', 'became'), 'famous', ARTISTS, ['past'], [
      M(post, 'cover songs online'), M(play, 'at small festivals'), M(share, '{pos} songs on social media'), M(win, 'a TV talent show'),
    ]),
    G(V('change', 'changed'), 'the way people watch TV', [P('streaming services', 'their', 3, 'pl', 'they')], ['past'], [
      M(release, 'whole seasons at once'), M(letV, 'viewers watch on any device'), M(V('offer', 'offered'), 'thousands of shows for a monthly fee'),
      M(V('make', 'made'), '{pos} own shows'), M(V('recommend', 'recommended'), 'shows based on what people like'),
    ]),
    G(V('keep', 'kept'), 'the kids quiet on long car trips', PARENTS, ['past'], [
      M(play, 'audiobooks'), M(letV, 'them watch cartoons on a tablet'), M(V('sing', 'sang'), 'silly songs'),
    ]),
    G(V('stay', 'stayed'), 'up to date with tech news', PEOPLE, ['present'], [
      M(read, 'tech blogs'), M(listen, 'to podcasts on the way to school'), M(follow, 'tech reviewers online'),
      M(V('subscribe', 'subscribed'), 'to a weekly newsletter'),
    ]),
  ];

  const s3 = (p) => p.person === 3 && p.number === 'sg';
  const fill = (str, p) => str.replace(/\{pos\}/g, p.pos);
  const words = (...parts) => parts.filter(Boolean).join(' ');

  // Häufige Rechtschreib-Besonderheit der -ing-Form (für Erklärungen und Fehler wie „makeing“, „stoping“)
  function spelling(v) {
    const ing = TT.ingForm(v);
    const naive = v.base + 'ing';
    if (ing === naive) return null;
    if (/ie$/.test(v.base)) return { naive, why: `ie wird zu y: ${v.base} → ${ing}.` };
    if (/e$/.test(v.base)) return { naive, why: `Das stumme e fällt weg: ${v.base} → ${ing}.` };
    return { naive, why: `Kurzer betonter Vokal + ein Konsonant – der Konsonant wird verdoppelt: ${v.base} → ${ing}.` };
  }

  // Eine Satzsituation mit allen Fassungen
  function scene(rng) {
    const goal = pick(GOALS, rng);
    const way = pick(goal.ways, rng);
    const who = pick(goal.people, rng);
    const tense = pick(goal.tenses, rng);
    const v = way.v;
    const ing = TT.ingForm(v);
    const rest = fill(way.rest, who);
    const goalRest = fill(goal.rest, who);
    const goalVerb = tense === 'past' ? goal.v.past : s3(who) ? TT.sForm(goal.v) : goal.v.base;
    const clause = words(who.text, goalVerb, goalRest); // she improved her English
    const by = (prep, form) => words(prep, way.neg ? 'not' : '', form, rest); // by not paying for …
    const full = sentence(clause, by('by', ing));
    const fronted = sentence(by('by', ing) + ',', clause);
    // Zweiter Satz für das Verbinden: She watched … / She didn't pay … / She doesn't check …
    let wayVerb;
    if (tense === 'past') wayVerb = way.neg ? "didn't " + v.base : v.past;
    else if (way.neg) wayVerb = (s3(who) ? "doesn't " : "don't ") + v.base;
    else wayVerb = s3(who) ? TT.sForm(v) : v.base;
    const waySentence = sentence(who.pron, wayVerb, rest);
    // How-Frage: aus I/we wird you, aus my/our sister wird your sister (nur in der Frage; die Antwort behält my sister / she)
    const q = who.person === 1 ? P('you', 'your', 2, 'sg')
      : /^(my|our) /.test(who.text) ? P(who.text.replace(/^(my|our) /, 'your '), who.pos, who.person, who.number, who.pron)
      : who;
    const aux = tense === 'past' ? 'did' : s3(q) ? 'does' : 'do';
    const question = 'How ' + words(aux, q.text, goal.v.base, fill(goal.rest, q)) + '?';
    const short = sentence(by('by', ing));
    const doIt = tense === 'past' ? 'did' : s3(who) ? 'does' : 'do';
    return {
      goal, way, who, tense, v, ing, rest, neg: way.neg, clause, full, fronted, waySentence, question, short, by,
      // Ebenfalls richtige Antworten auf die How-Frage: ganzer Satz (auch mit Pronomen: „She got … by …“), „She did it by …“
      fullAll: [...new Set([who.text, who.pron])].flatMap((subj) => {
        const c = words(subj, goalVerb, goalRest);
        return [sentence(c, by('by', ing)), sentence(by('by', ing) + ',', c)];
      }),
      doItAll: [...new Set([who.text, who.pron])].map((s) => sentence(s, doIt, 'it', by('by', ing))),
    };
  }

  // Partikel eines Phrasal Verbs (give up, turn off) gehört in die Erklärung: by not giving up
  const particle = (s) => {
    const m = /^(up|off|out|down|away|back)\b/.exec(s.rest || '');
    return m ? ' ' + m[1] : '';
  };
  const negNote = (s) => (s.neg ? ' Verneint: by not + -ing (by not ' + s.ing + particle(s) + ').' : '');
  const spellNote = (s) => {
    const sp = spelling(s.v);
    return sp ? ' ' + sp.why : '';
  };
  const ruleText = (s) => `by + -ing-Form sagt, wie etwas gemacht wird oder wurde (deutsch „indem …“): by ${s.neg ? 'not ' : ''}${s.ing}${particle(s)}.`;

  function transform(rng) {
    const s = scene(rng);
    if (rng() < 0.55) {
      return {
        kind: 'transform', task: 'Verbinde die beiden Sätze mit by + -ing.', label: '→ ein Satz mit by + -ing',
        source: [{ t: 'text', v: sentence(s.clause) + ' ' }, { t: 'mark', v: s.waySentence }], input: 'sentence',
        accept: [s.full, s.fronted], answer: s.full,
        explain: ruleText(s) + negNote(s) + spellNote(s) + ' By … kann auch am Satzanfang stehen: ' + s.fronted,
      };
    }
    return {
      kind: 'transform', task: 'Beantworte die Frage kurz mit By + -ing.', label: '→ Kurzantwort: By + -ing …',
      source: marked(s.question + ' – ', s.waySentence, ''), input: 'sentence',
      accept: [s.short, ...s.fullAll, ...s.doItAll], answer: s.short,
      explain: 'Auf How …? antwortet man kurz mit By + -ing-Form, ohne Subjekt.' + negNote(s) + spellNote(s) + ' Als ganzer Satz: ' + s.full,
    };
  }

  // Grundformen, die nach by auch als Nomen gehen („by practice“) – dort keine Grundform als Fehler
  const NOUN_TOO = new Set(['practice']);
  // Falsche Verbformen nach by (keine davon ist hier richtig)
  const wrongForms = (v) => [...(NOUN_TOO.has(v.base) ? [] : [v.base]), 'to ' + v.base, v.past, TT.sForm(v)];

  function cloze(rng) {
    const s = scene(rng);
    const ok = s.ing;
    const not = s.neg ? 'not ' : '';
    const tail = s.rest ? ' ' + s.rest : '';
    const front = rng() < 0.2;
    const parts = front
      ? { before: 'By ' + not, after: tail + ', ' + s.clause + '.' }
      : { before: cap(s.clause) + ' by ' + not, after: tail + '.' };
    const wrong = shuffle([...new Set(wrongForms(s.v))].filter((w) => w !== ok), rng).slice(0, 3);
    return {
      kind: 'cloze', task: 'Setze das Verb in der richtigen Form ein.', before: parts.before, after: parts.after, hint: s.v.base,
      accept: [ok], answer: ok, choices: shuffle([ok, ...wrong], rng),
      explain: 'Nach der Präposition by steht die -ing-Form: by ' + not + ok + particle(s) + '.' + spellNote(s),
    };
  }

  // Fehlervarianten (nur echte Fehler). Kein „through + -ing“: das ist (förmlich) richtiges Englisch.
  // Kein Satz ohne by („She improved her English watching series“ ist ebenfalls möglich).
  function errors(s, front) {
    const make = (phrase) => (front ? sentence(phrase + ',', s.clause) : sentence(s.clause, phrase));
    const not = s.neg ? 'not ' : '';
    const p = particle(s); // by not giving up, nicht by not give up
    const out = [
      { text: make(s.by('by', 'to ' + s.v.base)), why: `Nach der Präposition by steht kein to + Grundform, sondern die -ing-Form: by ${not}${s.ing}${p}.` },
      { text: make(s.by('with', s.ing)), why: `Für „wie / indem“ steht by + -ing, nicht with: by ${not}${s.ing}${p}.` },
    ];
    // by + Grundform ist ein Fehler – außer die Grundform geht auch als Nomen (by practice)
    if (!NOUN_TOO.has(s.v.base)) out.unshift({ text: make(s.by('by', s.v.base)), why: `Nach by steht die -ing-Form: by ${not}${s.ing}${p}, nicht by ${not}${s.v.base}${p}.` });
    if (s.v.past !== s.v.base) out.push({ text: make(s.by('by', s.v.past)), why: `Nach by steht die -ing-Form, nicht das Simple Past: by ${not}${s.ing}${p}, nicht by ${not}${s.v.past}${p}.` });
    const sp = spelling(s.v);
    if (sp) out.push({ text: make(s.by('by', sp.naive)), why: 'Rechtschreibung der -ing-Form: ' + sp.why });
    return out;
  }

  function errorspot(rng) {
    const s = scene(rng);
    const front = rng() < 0.2;
    const right = front ? s.fronted : s.full;
    const base = { kind: 'errorspot', task: 'Ist der Satz richtig?', answer: right };
    if (rng() < 0.45) {
      return Object.assign(base, { shown: right, correct: true, options: [], explain: 'Der Satz ist korrekt. ' + ruleText(s) + negNote(s) + spellNote(s) });
    }
    const errs = errors(s, front);
    // Rechtschreibfehler bevorzugt zeigen, wenn es einen gibt (typischer Fehler: makeing, stoping)
    const spellErr = errs.find((e) => e.why.startsWith('Rechtschreibung'));
    const err = spellErr && rng() < 0.4 ? spellErr : pick(errs, rng);
    const other = pick(errs.filter((e) => e !== err), rng);
    return Object.assign(base, { shown: err.text, correct: false, options: shuffle([right, err.text, other.text], rng), explain: err.why });
  }

  // Sätze, in denen by etwas anderes bedeutet
  const MEANINGS = {
    how: 'wie / indem (Art und Weise)',
    time: 'bis spätestens (Zeitpunkt)',
    place: 'neben / bei (Ort)',
    agent: 'von (wer es tut – Passiv)',
  };
  const OTHER_BY = {
    time: [
      'The new season will be online by Friday.', 'I want to finish the series by Sunday.', 'The tickets were sold out by noon.',
      'We need to return the camera by Monday.', 'The film has to be ready by the end of May.', 'By 2010, most people had stopped buying DVDs.',
    ],
    place: [
      'We sat by the window in the café after the movie.', "Let's meet by the entrance of the movie theater.", 'He stood by the stage during the whole concert.',
      'Our TV is by the window.', 'There is a charger by the bed.',
    ],
    agent: [
      'The film was directed by a young woman from Chicago.', 'The song was written by two teenagers.', 'The show is watched by millions of people.',
      'The special effects were created by a small team in New Zealand.', 'The first episode was seen by ten million viewers.',
    ],
  };
  const MEANING_WHY = {
    time: 'by + Zeitangabe = bis spätestens (by Friday = bis Freitag).',
    place: 'by + Ort = neben / bei (by the window = am Fenster).',
    agent: 'Im Passiv nennt by, wer etwas tut (deutsch „von“).',
  };

  function identify(rng) {
    if (rng() < 0.5) {
      // Welche Antwort passt auf die How-Frage?
      const s = scene(rng);
      const when = s.tense === 'past' ? pick(['By the end of last year.', 'By last Friday.', 'By the end of the summer.'], rng) : pick(['By Friday.', 'By the end of the week.'], rng);
      // dazu eine falsch gebaute Antwort (by watch, by to watch, with watching …)
      const err = pick(errors(s, false).filter((e) => !/^Rechtschreibung/.test(e.why)), rng);
      const wrong = cap(err.text.slice(s.clause.length + 1));
      return {
        kind: 'identify', task: 'Welche Antwort passt auf die Frage?', sentence: [{ t: 'text', v: s.question }],
        options: shuffle([{ label: s.short, correct: true }, { label: when, correct: false }, { label: wrong, correct: false }], rng),
        explain: 'How …? fragt nach dem Weg, also By + -ing-Form: ' + s.short + ' „' + when.slice(0, -1) + '“ sagt dagegen, bis wann. ' + err.why,
      };
    }
    // Was bedeutet by in diesem Satz?
    const kind = pick(['how', 'how', 'how', 'time', 'place', 'agent'], rng);
    let text, explain;
    if (kind === 'how') {
      const s = scene(rng);
      text = rng() < 0.2 ? s.fronted : s.full;
      explain = ruleText(s);
    } else {
      text = pick(OTHER_BY[kind], rng);
      explain = MEANING_WHY[kind] + ' Nur by + -ing-Form erklärt, wie etwas gemacht wird.';
    }
    return {
      kind: 'identify', task: 'Was bedeutet by in diesem Satz?', sentence: [{ t: 'text', v: text }],
      options: Object.keys(MEANINGS).map((k) => ({ label: MEANINGS[k], correct: k === kind })), explain,
    };
  }

  const MAKE = { transform, cloze, errorspot, identify };

  TT.addLesson({
    id: 'by-gerund',
    title: 'by + -ing: erklären, wie',
    added: '2026-11-08',
    book: { unit: 1, lesson: 3 },
    rule:
      'Mit by + -ing-Form sagst du, wie jemand etwas macht oder erreicht hat – deutsch meist „indem …“ oder „dadurch, dass …“. ' +
      'Auf die Frage How …? antwortet man kurz mit By + -ing. Verneint: by not + -ing. ' +
      'Nach by steht immer die -ing-Form, nie die Grundform oder to + Grundform. by + -ing kann auch am Satzanfang stehen.',
    examples: [
      'She improved her English by watching series with English subtitles.',
      'How did they make the film? – By using a lot of special effects.',
      'He saved money by not paying for three streaming services.',
    ],
    tip: 'by + -ing = „indem“: by watching, by making, by stopping, by not paying. Nicht: by watch, by to watch, with watching.',
    kinds: ['transform', 'cloze', 'errorspot', 'identify'],
    make: (kind, rng) => MAKE[kind](rng || Math.random),
    _scene: scene,
    _errors: errors,
    _goals: GOALS,
    _meanings: OTHER_BY,
  });
})(globalThis.TT = globalThis.TT || {});
