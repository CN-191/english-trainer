(function (TT) {
  'use strict';

  const { h, ui } = TT;

  const dateDe = (iso) => iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4);
  // Herkunft des Themas: Lehrbuch (book: {unit, lesson}), Übung aus dem Netz (from) oder Stunde
  const origin = (lesson) => (lesson.book && TT.BOOK_SU6 ? TT.BOOK_SU6.title + ' · ' + TT.bookPlace(lesson.book.unit, lesson.book.lesson)
    : lesson.from || 'Stunde vom ' + dateDe(lesson.added));

  // Zeile mit Lernstand für Listen (Üben, Grammatik, Statistik); o.prefix steht vor dem Untertitel.
  // Grammatik-Themen zeigen ihre Stufe vorn; „nicht im Training“, wenn das Thema im täglichen Training aus ist.
  ui.lessonRow = (lesson, o) => {
    const st = TT.app.state;
    const m = TT.progress.mastery(st, lesson.id);
    const prefix = o && typeof o === 'object' && o.prefix ? o.prefix + ' · ' : ''; // aus .map() kommt als 2. Argument der Index
    const where = lesson.bank ? '' : (prefix ? '' : origin(lesson) + ' · ');
    const off = TT.daily && !TT.daily.isOn(st, lesson.id) ? ' · nicht im Training' : '';
    return ui.row({
      href: TT.lessonHref ? TT.lessonHref(lesson) : '#/unterricht/' + lesson.id, title: lesson.title,
      lead: lesson.level ? h('span.level-tag', null, lesson.level) : null,
      subtitle: prefix + (m.count ? ui.plural(m.count, 'Antwort', 'Antworten') + ' (letzte 20)' : where + 'noch nicht geübt') + off,
      right: m.isNew ? 'neu' : Math.round(m.value * 100) + ' %',
    });
  };

  // Grammatik der aktuellen Unit im Buch (Stelle aus den Vokabel-Einstellungen), aktuelle Lesson markiert
  function bookGroup() {
    const B = TT.BOOK_SU6;
    if (!B) return null;
    const b = TT.app.vocab.book;
    const rows = B.grammar.filter((g) => g.u === b.unit).map((g) => {
      const prefix = 'Lesson ' + g.l + (g.l === b.lesson ? ' · aktuell' : '');
      if (g.tense) {
        const t = TT.tense(g.tense);
        return t ? ui.row({ href: '#/grammatik/' + g.tense, title: t.name, subtitle: prefix + ' · im Zeitformen-Trainer' }) : null;
      }
      const lesson = TT.lesson(g.lesson);
      return lesson ? ui.lessonRow(lesson, { prefix }) : null;
    }).filter(Boolean);
    return ui.group(B.title + ' · Unit ' + b.unit, rows.length ? rows : [ui.row({ title: 'Grammatik dieser Unit folgt', subtitle: 'Kommt dazu, sobald ihr im Unterricht dort seid.' })],
      { footer: B.units[b.unit - 1] });
  }

  function overview() {
    // Buch-Themen anderer Units (die der aktuellen Unit stehen schon in bookGroup), dann die übrigen Themen
    const grammar = TT.BOOK_SU6 ? TT.BOOK_SU6.grammar.filter((g) => g.lesson) : [];
    const unit = TT.app.vocab.book.unit;
    const inBook = new Set(grammar.map((g) => g.lesson));
    const others = TT.LESSONS.filter((l) => !inBook.has(l.id) && !l.bank);
    const all = TT.LESSONS.filter((l) => grammar.some((g) => g.lesson === l.id && g.u !== unit));
    return ui.page(
      ui.header('Unterricht', { back: '#/ueben', backLabel: 'Üben', subtitle: 'Grammatik aus deinem Buch und deinen Englischstunden.' }),
      bookGroup(),
      ui.group('Weitere Themen', others.map((l) => ui.lessonRow(l))),
      all.length ? ui.group('Andere Units', all.map((l) => ui.lessonRow(l))) : null,
      TT.vocabScreens && TT.vocabScreens.bookPicker ? TT.vocabScreens.bookPicker() : null);
  }

  function detail(id) {
    const lesson = TT.lesson(id);
    if (!lesson) return overview();
    if (lesson.bank) return TT.screens.grammar.render(id);
    const app = TT.app;
    const nav = app.session ? { back: '#/training', backLabel: 'Zurück zur Übung' } : { back: '#/unterricht', backLabel: 'Unterricht' };
    const examples = h('div');
    // Neue Beispielsätze aus dem Generator (immer ein vollständiger, richtiger Satz)
    const fill = () => examples.replaceChildren(...[0, 1, 2].map(() => h('div.row', null, h('p.sentence', null, lesson.example ? lesson.example() : lesson.make('errorspot').answer))));
    fill();
    const m = TT.progress.mastery(app.state, id);
    return ui.page(
      ui.header(lesson.title, Object.assign({ subtitle: origin(lesson) }, nav)),
      h('div.card', null, h('p', null, lesson.rule)),
      ui.group(lesson.from || lesson.book ? 'Beispiele' : 'Beispiele aus der Stunde', lesson.examples.map((ex) => h('div.row', null, h('p.sentence', null, ex)))),
      ui.group('Merkhilfe', [h('div.row', null, h('span.row-main', null, h('span.row-title', null, lesson.tip)))]),
      ui.group('Weitere Beispiele', [examples], { footer: 'Jedes Mal neue Sätze aus dem Generator.' }),
      ui.group('Lernstand', [ui.row({ title: m.count ? Math.round(m.value * 100) + ' % richtig' : 'Noch nicht geübt', subtitle: m.count ? 'aus den letzten ' + ui.plural(m.count, 'Antwort', 'Antworten') : null }),
        ui.dailyToggleRow(id, 'Im täglichen Training', { label: lesson.title + ' im täglichen Training' })]),
      h('div.actions', null,
        ui.button('Neue Beispiele', { kind: 'secondary', onclick: fill }),
        ui.button('10 Aufgaben üben', { onclick: () => app.startSession({ mode: 'lesson', topics: [id], count: 10 }) })));
  }

  TT.screens.lesson = {
    render(param) {
      return param ? detail(param) : overview();
    },
  };
})(globalThis.TT = globalThis.TT || {});
