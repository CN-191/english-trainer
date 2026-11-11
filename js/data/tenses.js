(function (TT) {
  'use strict';

  const TENSES = [
    {
      id: 'present-simple', name: 'Simple Present', row: 'present', col: 'simple',
      formula: { aff: 'Grundform · he/she/it + s', neg: "don't / doesn't + Grundform", q: 'Do / Does + Subjekt + Grundform' },
      examples: { aff: 'She works in an office.', neg: "She doesn't work on Sundays.", q: 'Does she work every day?' },
      usage: 'Gewohnheiten, Routinen und allgemeine Tatsachen: Dinge, die regelmäßig oder immer so sind. Zustandsverben (know, like, want, believe) stehen in der Gegenwart fast immer im Simple Present – auch mit „now“.',
      signals: ['always', 'usually', 'often', 'sometimes', 'never', 'every day', 'on Mondays', 'twice a week'],
      confusions: ['present-progressive', 'present-perfect'],
      contrasts: {
        'present-progressive': 'Simple Present = regelmäßig/immer (every day). Present Progressive = genau jetzt, vorübergehend (right now).',
        'present-perfect': 'Simple Present beschreibt, wie etwas ist. Present Perfect beschreibt, was bis jetzt passiert ist (since, for, already).',
      },
      timeline: { habit: true },
    },
    {
      id: 'present-progressive', name: 'Present Progressive', row: 'present', col: 'progressive',
      formula: { aff: 'am / is / are + -ing', neg: "am not / isn't / aren't + -ing", q: 'Am / Is / Are + Subjekt + -ing' },
      examples: { aff: 'She is working right now.', neg: "She isn't working at the moment.", q: 'Is she working now?' },
      usage: 'Handlungen, die genau jetzt oder in diesem Zeitraum gerade ablaufen und noch nicht abgeschlossen sind. Zustandsverben (know, like, own) stehen nicht in dieser Form.',
      signals: ['now', 'right now', 'at the moment', 'Look!', 'Listen!', 'this week', 'currently'],
      confusions: ['present-simple', 'present-perfect-progressive'],
      contrasts: {
        'present-simple': 'Present Progressive = läuft gerade (right now). Simple Present = Gewohnheit (every day).',
        'present-perfect-progressive': 'Present Progressive = läuft jetzt. Present Perfect Progressive = läuft schon seit einer Weile bis jetzt (for/since).',
      },
      timeline: { bars: [[44, 56]] },
    },
    {
      id: 'present-perfect', name: 'Present Perfect', row: 'present', col: 'perfect',
      formula: { aff: 'have / has + 3. Form', neg: "haven't / hasn't + 3. Form", q: 'Have / Has + Subjekt + 3. Form' },
      examples: { aff: 'She has finished the report.', neg: "She hasn't finished it yet.", q: 'Has she ever been to London?' },
      usage: 'Etwas ist in der Vergangenheit passiert, der genaue Zeitpunkt ist unwichtig – wichtig ist das Ergebnis oder die Erfahrung bis jetzt. Mit Zustandsverben und since/for: Der Zustand dauert bis jetzt an.',
      signals: ['already', 'just', 'yet', 'ever', 'never', 'so far', 'since', 'for', 'this year'],
      confusions: ['past-simple', 'present-perfect-progressive'],
      contrasts: {
        'past-simple': 'Present Perfect = kein Zeitpunkt, Ergebnis zählt jetzt (already, ever, yet). Simple Past = abgeschlossener Zeitpunkt genannt (yesterday, in 2019).',
        'present-perfect-progressive': 'Present Perfect = Ergebnis / wie viel (three emails). Present Perfect Progressive = Dauer / wie lange (for two hours).',
      },
      timeline: { dots: [28], arc: [28, 50] },
    },
    {
      id: 'present-perfect-progressive', name: 'Present Perfect Progressive', row: 'present', col: 'perfect-progressive',
      formula: { aff: 'have / has been + -ing', neg: "haven't / hasn't been + -ing", q: 'Have / Has + Subjekt + been + -ing' },
      examples: { aff: 'She has been working for two hours.', neg: "She hasn't been sleeping well lately.", q: 'Have you been waiting long?' },
      usage: 'Eine Handlung hat in der Vergangenheit begonnen und läuft bis jetzt (oder hat gerade erst aufgehört). Betont die Dauer – oft mit since/for oder einer sichtbaren Folge („Du siehst müde aus“).',
      signals: ['for two hours', 'since this morning', 'all day', 'how long', 'lately', 'recently'],
      confusions: ['present-perfect', 'present-progressive'],
      contrasts: {
        'present-perfect': 'Present Perfect Progressive = Dauer, Tätigkeit (for two hours). Present Perfect = Ergebnis, Anzahl (has written three emails).',
        'present-progressive': 'Present Perfect Progressive = läuft schon seit … (for/since). Present Progressive = läuft jetzt, ohne Dauerangabe.',
      },
      timeline: { bars: [[22, 50]] },
    },
    {
      id: 'past-simple', name: 'Simple Past', row: 'past', col: 'simple',
      formula: { aff: '2. Form (regelmäßig: -ed)', neg: "didn't + Grundform", q: 'Did + Subjekt + Grundform' },
      examples: { aff: 'She worked late yesterday.', neg: "She didn't work last Friday.", q: 'Did she work in 2019?' },
      usage: 'Abgeschlossene Handlungen zu einem bestimmten Zeitpunkt in der Vergangenheit. Der Zeitpunkt ist genannt oder aus dem Zusammenhang klar.',
      signals: ['yesterday', 'last week', 'two days ago', 'in 2019', 'on Monday', 'when I was a child'],
      confusions: ['present-perfect', 'past-progressive', 'past-perfect'],
      contrasts: {
        'present-perfect': 'Simple Past = Zeitpunkt genannt (yesterday, ago, last …). Present Perfect = kein Zeitpunkt, Bezug zu jetzt.',
        'past-progressive': 'Simple Past = abgeschlossene Handlung. Past Progressive = lief gerade, als etwas anderes passierte.',
        'past-perfect': 'Simple Past = die spätere Handlung. Past Perfect = die frühere Handlung („war schon passiert“).',
      },
      timeline: { dots: [25] },
    },
    {
      id: 'past-progressive', name: 'Past Progressive', row: 'past', col: 'progressive',
      formula: { aff: 'was / were + -ing', neg: "wasn't / weren't + -ing", q: 'Was / Were + Subjekt + -ing' },
      examples: { aff: 'She was cooking when I called.', neg: "She wasn't sleeping at midnight.", q: 'Were you working at 8 pm?' },
      usage: 'Eine Handlung lief zu einem bestimmten Zeitpunkt in der Vergangenheit gerade ab – oft unterbrochen von einer anderen Handlung (when + Simple Past) oder parallel zu einer anderen (while).',
      signals: ["at 8 o'clock yesterday", 'when', 'while', 'all evening', 'at this time yesterday'],
      confusions: ['past-simple', 'past-perfect-progressive'],
      contrasts: {
        'past-simple': 'Past Progressive = lief gerade (Hintergrund). Simple Past = kurze, abgeschlossene Handlung, die dazwischenkommt.',
        'past-perfect-progressive': 'Past Progressive = lief in dem Moment. Past Perfect Progressive = lief schon eine Weile bis zu dem Moment (for …).',
      },
      timeline: { bars: [[14, 36]], dots: [28] },
    },
    {
      id: 'past-perfect', name: 'Past Perfect', row: 'past', col: 'perfect',
      formula: { aff: 'had + 3. Form', neg: "hadn't + 3. Form", q: 'Had + Subjekt + 3. Form' },
      examples: { aff: 'The film had started when we arrived.', neg: "She hadn't seen the sea before.", q: 'Had you finished before he came?' },
      usage: 'Vorvergangenheit: Etwas war schon passiert, bevor etwas anderes in der Vergangenheit geschah. Die spätere Handlung steht im Simple Past.',
      signals: ['before', 'after', 'by the time', 'already', 'never … before'],
      confusions: ['past-simple', 'present-perfect'],
      contrasts: {
        'past-simple': 'Past Perfect = das Frühere von zwei vergangenen Ereignissen. Simple Past = das Spätere.',
        'present-perfect': 'Past Perfect = vor einem Zeitpunkt in der Vergangenheit. Present Perfect = vor jetzt.',
      },
      timeline: { dots: [14], ref: 32 },
    },
    {
      id: 'past-perfect-progressive', name: 'Past Perfect Progressive', row: 'past', col: 'perfect-progressive',
      formula: { aff: 'had been + -ing', neg: "hadn't been + -ing", q: 'Had + Subjekt + been + -ing' },
      examples: { aff: 'She had been waiting for an hour when the bus came.', neg: "He hadn't been sleeping long.", q: 'How long had they been working there?' },
      usage: 'Eine Handlung lief schon eine Weile, bis ein bestimmter Zeitpunkt in der Vergangenheit erreicht war. Betont die Dauer vor diesem Zeitpunkt.',
      signals: ['for two hours when', 'since … when', 'by the time', 'how long'],
      confusions: ['past-perfect', 'past-progressive'],
      contrasts: {
        'past-perfect': 'Past Perfect Progressive = Dauer bis zu dem Zeitpunkt. Past Perfect = abgeschlossen vor dem Zeitpunkt.',
        'past-progressive': 'Past Perfect Progressive = lief schon seit … (for). Past Progressive = lief in genau dem Moment.',
      },
      timeline: { bars: [[8, 32]], ref: 32 },
    },
    {
      id: 'future-simple', name: 'will-Future', row: 'future', col: 'simple',
      formula: { aff: 'will + Grundform', neg: "won't + Grundform", q: 'Will + Subjekt + Grundform' },
      examples: { aff: 'I think it will rain tomorrow.', neg: "She won't be late.", q: 'Will you help me?' },
      usage: 'Vorhersagen, Vermutungen, spontane Entscheidungen und Versprechen über die Zukunft – oft mit I think, I’m sure, probably, perhaps oder im Hauptsatz von Bedingungssätzen (If it rains, …).',
      signals: ['tomorrow', 'next week', 'I think', "I'm sure", 'probably', 'perhaps', 'if …'],
      confusions: ['present-simple', 'future-progressive'],
      contrasts: {
        'present-simple': 'will-Future = Zukunft im Hauptsatz. Im if-Satz selbst steht aber Simple Present (If it rains, …).',
        'future-progressive': 'will-Future = wird passieren. Future Progressive = wird zu einem Zeitpunkt gerade ablaufen (this time tomorrow).',
      },
      timeline: { dots: [75] },
    },
    {
      id: 'future-progressive', name: 'Future Progressive', row: 'future', col: 'progressive',
      formula: { aff: 'will be + -ing', neg: "won't be + -ing", q: 'Will + Subjekt + be + -ing' },
      examples: { aff: 'This time tomorrow I will be flying to Rome.', neg: "She won't be working on Monday.", q: 'Will you be using the car tonight?' },
      usage: 'Eine Handlung wird zu einem bestimmten Zeitpunkt in der Zukunft gerade ablaufen.',
      signals: ['this time tomorrow', "at 8 o'clock tomorrow", 'this time next week', 'all day tomorrow'],
      confusions: ['future-simple', 'present-progressive'],
      contrasts: {
        'future-simple': 'Future Progressive = läuft zu dem Zeitpunkt gerade. will-Future = passiert (ohne Verlauf).',
        'present-progressive': 'Future Progressive = läuft in der Zukunft gerade. Present Progressive = läuft jetzt.',
      },
      timeline: { bars: [[64, 86]], ref: 75 },
    },
    {
      id: 'future-perfect', name: 'Future Perfect', row: 'future', col: 'perfect',
      formula: { aff: 'will have + 3. Form', neg: "won't have + 3. Form", q: 'Will + Subjekt + have + 3. Form' },
      examples: { aff: 'By Friday she will have finished the report.', neg: "They won't have arrived by then.", q: 'Will you have left by 6?' },
      usage: 'Eine Handlung wird bis zu einem bestimmten Zeitpunkt in der Zukunft abgeschlossen sein.',
      signals: ['by next Friday', 'by the end of the month', 'by 2030', 'by then', 'by the time'],
      confusions: ['future-simple', 'future-perfect-progressive'],
      contrasts: {
        'future-simple': 'Future Perfect = ist bis dahin schon fertig (by …). will-Future = wird passieren.',
        'future-perfect-progressive': 'Future Perfect = Ergebnis bis dahin. Future Perfect Progressive = Dauer bis dahin (for …).',
      },
      timeline: { dots: [68], ref: 84 },
    },
    {
      id: 'future-perfect-progressive', name: 'Future Perfect Progressive', row: 'future', col: 'perfect-progressive',
      formula: { aff: 'will have been + -ing', neg: "won't have been + -ing", q: 'Will + Subjekt + have been + -ing' },
      examples: { aff: 'By 6 pm she will have been working for ten hours.', neg: "He won't have been waiting long.", q: 'Will you have been living here for a year by May?' },
      usage: 'Bis zu einem bestimmten Zeitpunkt in der Zukunft wird eine Handlung schon eine gewisse Zeit angedauert haben. Betont die Dauer bis dahin.',
      signals: ['by … for', 'by 6 pm … for two hours', 'by next month … for a year'],
      confusions: ['future-perfect', 'future-progressive'],
      contrasts: {
        'future-perfect': 'Future Perfect Progressive = Dauer bis dahin (for …). Future Perfect = Ergebnis bis dahin.',
        'future-progressive': 'Future Perfect Progressive = läuft bis dahin schon eine Weile. Future Progressive = läuft zu dem Zeitpunkt.',
      },
      timeline: { bars: [[56, 84]], ref: 84 },
    },
  ];

  const BY_ID = {};
  for (const t of TENSES) BY_ID[t.id] = t;

  function tense(id) {
    const t = BY_ID[id];
    if (!t) throw new Error('Unbekannte Zeitform: ' + id);
    return t;
  }

  const ROW_LABELS = { present: 'Present', past: 'Past', future: 'Future' };
  const ROW_DE = { present: 'Gegenwart', past: 'Vergangenheit', future: 'Zukunft' };
  const COL_LABELS = { simple: 'Simple', progressive: 'Progressive', perfect: 'Perfect', 'perfect-progressive': 'Perfect Progressive' };

  function hint(id, level, form) {
    const t = tense(id);
    if (level === 1) return 'Zeitebene: ' + ROW_DE[t.row];
    if (level === 2) return 'Zeitform: ' + t.name;
    return 'Bauplan: ' + t.formula[form || 'aff'];
  }

  const COMPARISONS = [
    { a: 'present-simple', b: 'present-progressive', title: 'Gewohnheit oder gerade jetzt?',
      rule: 'Regelmäßig / immer → Simple Present. Genau jetzt, vorübergehend → Present Progressive.',
      exA: 'She plays tennis every Sunday.', exB: 'She is playing tennis right now.' },
    { a: 'past-simple', b: 'present-perfect', title: 'Zeitpunkt oder Bezug zu jetzt?',
      rule: 'Zeitpunkt genannt (yesterday, ago, in 2019) → Simple Past. Kein Zeitpunkt, Ergebnis/Erfahrung zählt jetzt → Present Perfect.',
      exA: 'I lost my keys yesterday.', exB: 'I have lost my keys. (Sie sind immer noch weg.)' },
    { a: 'present-perfect', b: 'present-perfect-progressive', title: 'Ergebnis oder Dauer?',
      rule: 'Wie viel / was ist fertig → Present Perfect. Wie lange / Tätigkeit → Present Perfect Progressive.',
      exA: 'She has written three emails.', exB: 'She has been writing emails for two hours.' },
    { a: 'past-simple', b: 'past-progressive', title: 'Abgeschlossen oder lief gerade?',
      rule: 'Die laufende Hintergrundhandlung → Past Progressive. Die kurze Handlung, die dazwischenkommt → Simple Past.',
      exA: 'The phone rang.', exB: 'I was cooking when the phone rang.' },
    { a: 'past-simple', b: 'past-perfect', title: 'Was war zuerst?',
      rule: 'Von zwei vergangenen Ereignissen steht das frühere im Past Perfect, das spätere im Simple Past.',
      exA: 'We arrived at the cinema.', exB: 'When we arrived, the film had already started.' },
    { a: 'future-simple', b: 'future-perfect', title: 'Die vier Future-Formen',
      rule: 'will + Grundform = Vorhersage · will be + -ing = läuft dann gerade · will have + 3. Form = ist dann fertig · will have been + -ing = dauert bis dann schon.',
      exA: 'I think she will call.', exB: 'By 6 pm she will have called.' },
  ];

  // Bei Verben mit flex: true sind Perfect und Perfect Progressive mit for/since beide korrekt.
  const ALSO_ACCEPT = {
    'present-perfect-progressive': 'present-perfect',
    'past-perfect-progressive': 'past-perfect',
    'future-perfect-progressive': 'future-perfect',
  };

  TT.TENSES = TENSES;
  TT.TENSE_IDS = TENSES.map((t) => t.id);
  TT.tense = tense;
  TT.ROWS = ['present', 'past', 'future'];
  TT.COLS = ['simple', 'progressive', 'perfect', 'perfect-progressive'];
  TT.ROW_LABELS = ROW_LABELS;
  TT.ROW_DE = ROW_DE;
  TT.COL_LABELS = COL_LABELS;
  TT.hint = hint;
  TT.COMPARISONS = COMPARISONS;
  TT.ALSO_ACCEPT = ALSO_ACCEPT;
})(globalThis.TT = globalThis.TT || {});
