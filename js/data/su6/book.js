(function (TT) {
  'use strict';

  // Lehrbuch StartUp 6: Unit-Titel und die Grammatik je Lesson (soweit schon im Trainer).
  // Die Wörter stehen in js/data/su6/u01-03.js, u04-06.js, u07-10.js (TT.addBookSU6).
  TT.BOOK_SU6 = {
    title: 'StartUp 6',
    units: [
      'What have you been watching?',
      'What’s your return policy?',
      'Have you seen a doctor?',
      'Are you doing anything special?',
      'What seems to be the problem?',
      'Where was it made?',
      'When do you fly out?',
      'How have you been?',
      'Would you mind helping me?',
      'Has the city changed?',
    ],
    lessons: 4,
    // Grammatik: tense = Zeitform im Zeitformen-Trainer, lesson = Thema im Bereich „Unterricht“
    grammar: [
      { u: 1, l: 1, tense: 'present-perfect-progressive' },
      { u: 1, l: 2, lesson: 'what-clauses' },
      { u: 1, l: 3, lesson: 'by-gerund' },
    ],
  };

  // „Unit 1 · Lesson 2“ bzw. „Lesson 4 · Lesetext“
  TT.bookPlace = (u, l) => 'Unit ' + u + ' · Lesson ' + l + (l === 4 ? ' (Lesetext)' : '');
})(globalThis.TT = globalThis.TT || {});
