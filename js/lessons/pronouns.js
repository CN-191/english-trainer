(function (TT) {
  'use strict';

  const { pick, shuffle } = TT.util;
  const { cap, marked } = TT.lessonUtil;

  // Subjektpronomen tun etwas (I, he, she, we, they), Objektpronomen stehen nach dem Verb oder nach
  // einer Präposition (me, him, her, us, them). you und it sind in beiden Fällen gleich und kommen nicht vor.
  const PAIRS = [['I', 'me'], ['he', 'him'], ['she', 'her'], ['we', 'us'], ['they', 'them']];

  // Vorlagen: {P} = Pronomen; role = Rolle des Pronomens; where = Hinweis für die Erklärung
  // ({s}/{o} = das Pronomen der Aufgabe); Optionen:
  //   not  = Subjektpronomen, die hier nicht passen (würden sich selbst meinen: We watched the match with us/me)
  //   only = nur diese Subjektpronomen („Lisa and they“, „my friends and we“ sagt niemand)
  //   kids = beim Umformen nur Kinder/Jugendliche (The teacher gave Tom a good grade)
  const T = (text, role, where, o) => Object.assign({ text, role, where, not: [], only: null, kids: false }, o);
  const AND = 'Objekt nach einer Präposition (… and {o})';
  const TEMPLATES = [
    T('{P} watched the new series last night.', 's', 'Subjekt'),
    T("{P} didn't like the ending.", 's', 'Subjekt'),
    T('{P} went to the cinema on Friday.', 's', 'Subjekt'),
    T('{P} cried at the end of the film.', 's', 'Subjekt'),
    T('{P} downloaded the whole soundtrack.', 's', 'Subjekt'),
    T('After the concert, {P} went home.', 's', 'Subjekt'),
    T('Yesterday {P} cleaned the beach with the class.', 's', 'Subjekt'),
    T('My friends and {P} play this game every weekend.', 's', 'Subjekt (… and {s})', { only: ['I'] }),
    T('Tom and {P} saw the concert in Berlin.', 's', 'Subjekt (… and {s})', { only: ['I', 'he', 'she'] }),
    T('Lisa and {P} love horror movies.', 's', 'Subjekt (… and {s})', { only: ['I', 'he', 'she'] }),
    T('The violent scene scared {P}.', 'o', 'Objekt nach dem Verb'),
    T('Tom invited {P} to the party.', 'o', 'Objekt nach dem Verb'),
    T('Can you help {P} with the homework?', 'o', 'Objekt nach dem Verb', { kids: true }),
    T('The ending surprised {P}.', 'o', 'Objekt nach dem Verb'),
    T('This song always reminds {P} of summer.', 'o', 'Objekt nach dem Verb'),
    T('The director thanked {P} after the show.', 'o', 'Objekt nach dem Verb'),
    T('The teacher gave {P} a good grade.', 'o', 'Objekt nach dem Verb', { kids: true }),
    T('We watched the match with {P}.', 'o', 'Objekt nach einer Präposition', { not: ['we', 'I'] }),
    T('These tickets are for {P}.', 'o', 'Objekt nach einer Präposition'),
    T('Lisa sat next to {P} at the cinema.', 'o', 'Objekt nach einer Präposition'),
    T('Everyone was talking about {P}.', 'o', 'Objekt nach einer Präposition'),
    T('They waited for my sister and {P}.', 'o', AND, { not: ['they'], only: ['I', 'he', 'she'] }),
    T('The film was too scary for Ben and {P}.', 'o', AND, { only: ['I', 'he', 'she'] }),
  ];

  // Für „Umformen“: Satzglieder, die durch ein Pronomen ersetzt werden (Text als Subjekt / als Objekt);
  // kid = Kind/Jugendlicher (passt zu Hausaufgaben und Noten)
  const NP = (s, o, ps, po, kid) => ({ s, o, ps, po, kid: !!kid });
  const PHRASES = [
    NP('Anna', 'Anna', 'she', 'her', true), NP('Tom', 'Tom', 'he', 'him', true), NP('my parents', 'my parents', 'they', 'them'),
    NP('my sister and I', 'my sister and me', 'we', 'us', true), NP('Lisa and Ben', 'Lisa and Ben', 'they', 'them', true),
    NP('my brother', 'my brother', 'he', 'him', true), NP('my grandmother', 'my grandmother', 'she', 'her'),
    NP('the actors', 'the actors', 'they', 'them'), NP('Mr. Brown', 'Mr. Brown', 'he', 'him'),
  ];
  // Namen der Wortgruppe, die schon in der Vorlage stehen („Tom invited Tom …“ wäre unsinnig)
  const namesIn = (p, t) => p.s.split(' and ').some((n) => /^[A-Z][a-z]/.test(n) && new RegExp('\\b' + n.replace('.', '\\.') + '\\b').test(t.text));
  // Nur einfache Vorlagen (ohne „… and {P}“) eignen sich zum Ersetzen
  const SIMPLE = TEMPLATES.filter((t) => !/ and \{P\}/.test(t.text));

  // Text der Vorlage mit Pronomen; am Satzanfang groß (I ist immer groß)
  function fill(t, word) {
    const at = t.text.indexOf('{P}');
    const w = at === 0 ? cap(word) : word;
    return { text: t.text.replace('{P}', w), before: t.text.slice(0, at), word: w, after: t.text.slice(at + 3) };
  }

  function scene(rng) {
    const t = pick(TEMPLATES, rng);
    const [s, o] = pick(PAIRS.filter(([subj]) => !t.not.includes(subj) && (!t.only || t.only.includes(subj))), rng);
    const right = t.role === 's' ? s : o;
    const wrong = t.role === 's' ? o : s;
    return { t, s, o, right, wrong, ok: fill(t, right), bad: fill(t, wrong) };
  }

  const why = (sc) => {
    const w = sc.t.where.replace('{s}', sc.s).replace('{o}', sc.o);
    return sc.t.role === 's'
      ? `Hier ist das Pronomen ${w} – also ${sc.s}, nicht ${sc.o}.`
      : `Hier steht das Pronomen als ${w} – also ${sc.o}, nicht ${sc.s}.`;
  };

  function transform(rng) {
    const t = pick(SIMPLE, rng);
    const np = pick(PHRASES.filter((p) => !t.not.includes(p.ps) && !namesIn(p, t) && (!t.kids || p.kid)), rng);
    const phrase = t.role === 's' ? np.s : np.o;
    const pron = t.role === 's' ? np.ps : np.po;
    const at = t.text.indexOf('{P}');
    const src = fill(t, phrase);
    const result = fill(t, pron);
    return {
      kind: 'transform', task: 'Ersetze die markierten Wörter durch ein Pronomen.', label: 'Pronomen',
      source: marked(src.before, src.word, src.after), input: 'word',
      accept: [result.word, result.text, pron], answer: at === 0 ? result.word : pron,
      explain: `${cap(phrase)} → ${pron}: ${t.role === 's' ? 'Subjekt' : 'Objekt'}, also ${t.role === 's' ? 'Subjektpronomen' : 'Objektpronomen'}. Ganzer Satz: ${result.text}`,
    };
  }

  function cloze(rng) {
    const sc = scene(rng);
    const hintWord = sc.t.role === 's' ? sc.o : sc.s; // die „falsche“ Form als Ausgangswort
    // Weitere Ablenker nur aus der falschen Rolle (ein anderes Pronomen der richtigen Rolle wäre auch richtiges Englisch)
    const wrongRole = PAIRS.map(([s, o]) => (sc.t.role === 's' ? o : s)).filter((w) => w !== sc.wrong);
    const atStart = sc.t.text.indexOf('{P}') === 0;
    const wrongs = [sc.wrong, ...shuffle(wrongRole, rng).slice(0, 2)].map((w) => (atStart ? cap(w) : w));
    return {
      kind: 'cloze', task: 'Setze das Pronomen in der richtigen Form ein.', before: sc.ok.before, after: sc.ok.after,
      hint: hintWord, accept: [sc.ok.word, sc.right], answer: sc.ok.word,
      choices: shuffle([sc.ok.word, ...wrongs], rng),
      explain: why(sc),
    };
  }

  function errorspot(rng) {
    const sc = scene(rng);
    const base = { kind: 'errorspot', task: 'Ist der Satz richtig?', answer: sc.ok.text };
    // Klassiker: „Me and my friends …“ am Satzanfang
    if (rng() < 0.2) {
      const right = 'My friends and I play this game every weekend.';
      return Object.assign(base, {
        answer: right, shown: 'Me and my friends play this game every weekend.', correct: false,
        options: shuffle([right, 'Me and my friends play this game every weekend.', 'My friends and me play this game every weekend.'], rng),
        explain: 'Als Subjekt steht I – und höflich zuletzt: My friends and I … („Me and my friends“ hört man umgangssprachlich oft, im Standard-Englisch ist es aber falsch.)',
      });
    }
    if (rng() < 0.5) return Object.assign(base, { shown: sc.ok.text, correct: true, options: [], explain: 'Der Satz ist korrekt. ' + why(sc) });
    return Object.assign(base, { shown: sc.bad.text, correct: false, options: shuffle([sc.ok.text, sc.bad.text], rng), explain: why(sc) });
  }

  function identify(rng) {
    const sc = scene(rng);
    const isSubj = sc.t.role === 's';
    return {
      kind: 'identify', task: 'Ist das markierte Pronomen ein Subjekt- oder ein Objektpronomen?',
      sentence: marked(sc.ok.before, sc.ok.word, sc.ok.after),
      options: [{ label: 'Subjektpronomen', correct: isSubj }, { label: 'Objektpronomen', correct: !isSubj }],
      explain: why(sc),
    };
  }

  const MAKE = { transform, cloze, errorspot, identify };

  TT.addLesson({
    id: 'pronouns',
    title: 'Subjekt- und Objektpronomen',
    added: '2026-11-06',
    rule:
      'Subjektpronomen (I, he, she, we, they) tun etwas und stehen vor dem Verb. Objektpronomen (me, him, her, us, them) ' +
      'stehen nach dem Verb oder nach einer Präposition (with him, for us). Bei zwei Personen: My friends and I play … / for my sister and me.',
    examples: ['My friends and I play this game.', 'The violent scene scared her.'],
    tip: 'Wer tut etwas? → I, he, she, we, they. Wen/wem, nach with/for/to …? → me, him, her, us, them.',
    kinds: ['transform', 'cloze', 'errorspot', 'identify'],
    make: (kind, rng) => MAKE[kind](rng || Math.random),
    _scene: scene,
  });
})(globalThis.TT = globalThis.TT || {});
