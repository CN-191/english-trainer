(function (TT) {
  'use strict';

  const { h, ui } = TT;

  // Schalter „Im täglichen Training“ als Zeile (Zeitform oder Thema)
  ui.dailyToggleRow = (id, title, o = {}) => {
    const app = TT.app;
    const input = ui.toggle(TT.daily.isOn(app.state, id), (on) => {
      TT.daily.set(app.state, id, on);
      app.save();
      if (o.onchange) o.onchange(on);
    }, o.label || (title || 'Thema') + ' im täglichen Training');
    const row = h('label.row.row-toggle', null,
      o.lead || null,
      h('span.row-main', null, h('span.row-title', null, title), o.subtitle ? h('span.row-sub', null, o.subtitle) : null),
      h('span.row-right', null, input));
    row.input = input;
    return row;
  };

  const cats = () => (TT.GRAMMAR_CATS || []).filter((c) => TT.bankLessons(c.id).length);
  const classroom = () => TT.LESSONS.filter((l) => !l.bank);

  function dailySummary() {
    const st = TT.app.state;
    const all = TT.daily.topics();
    const on = all.filter((id) => TT.daily.isOn(st, id)).length;
    return ui.group(null, [ui.row({
      href: '#/grammatik/training', title: 'Tägliches Training',
      subtitle: on === all.length ? 'Alle ' + all.length + ' Zeitformen und Themen gemischt' : on + ' von ' + all.length + ' Zeitformen und Themen eingeschaltet',
      right: 'Auswahl',
    })]);
  }

  function tenseGridCard() {
    const st = TT.app.state;
    const grid = ui.tenseGrid((t) => {
      const m = TT.progress.mastery(st, t.id);
      const off = !TT.daily.isOn(st, t.id);
      return {
        onclick: () => TT.router.go('/grammatik/' + t.id),
        sub: (m.isNew ? 'neu' : Math.round(m.value * 100) + ' %') + (off ? ' · aus' : ''),
        extra: ui.bar(m.value),
        cls: off ? 'off' : null,
      };
    });
    return ui.group('Zeitformen', [h('div.card.grid-card', null, grid)],
      { plain: true, footer: 'Bauplan, Signalwörter und Zeitstrahl: Zeitform antippen. Blass = nicht im täglichen Training.' });
  }

  function overview() {
    const n = TT.bankLessons().length;
    return ui.page(
      ui.header('Grammatik', { subtitle: '12 Zeitformen' + (n ? ' und ' + n + ' Themen, bei denen Deutsche oft Fehler machen' : '') + '.' }),
      dailySummary(),
      tenseGridCard(),
      ...cats().map((c) => ui.group(c.title, TT.bankLessons(c.id).map((l) => ui.lessonRow(l)))),
      ui.group('Aus dem Unterricht', classroom().map((l) => ui.lessonRow(l))),
      ui.group('Wichtige Vergleiche', TT.COMPARISONS.map((c) =>
        h('div.row.stack', null,
          h('span.row-title', null, h('b', null, c.title)),
          h('span.row-sub', null, c.rule),
          h('span', null, h('a', { href: '#/grammatik/' + c.a }, TT.tense(c.a).name), ': ' + c.exA),
          h('span', null, h('a', { href: '#/grammatik/' + c.b }, TT.tense(c.b).name), ': ' + c.exB))))
    );
  }

  // Auswahl fürs tägliche Training: alle Zeitformen und Themen, je Gruppe „alle an / alle aus“
  function trainingPage() {
    const app = TT.app;
    const count = h('span');
    const updateCount = () => {
      const all = TT.daily.topics();
      const on = all.filter((id) => TT.daily.isOn(app.state, id)).length;
      count.textContent = on + ' von ' + all.length + ' eingeschaltet';
    };
    const section = (title, items) => {
      const rows = items.map((it) => ui.dailyToggleRow(it.id, it.title, { lead: it.lead, subtitle: it.subtitle, onchange: updateCount }));
      const setAll = (on) => {
        TT.daily.set(app.state, items.map((it) => it.id), on);
        app.save();
        rows.forEach((r) => { r.input.checked = on; });
        updateCount();
      };
      const bar = h('div.row.group-tools', null,
        h('button.chip', { type: 'button', 'aria-label': 'Alle ' + title + ' an', onclick: () => setAll(true) }, 'Alle an'),
        h('button.chip', { type: 'button', 'aria-label': 'Alle ' + title + ' aus', onclick: () => setAll(false) }, 'Alle aus'));
      return ui.group(title, [bar].concat(rows));
    };
    const tenseItems = TT.TENSES.map((t) => ({ id: t.id, title: t.name, lead: h('span.dot.row-' + t.row) }));
    const lessonItem = (l) => ({ id: l.id, title: l.title, lead: l.level ? h('span.level-tag', null, l.level) : null });
    updateCount();
    const start = () => {
      if (!app.startSession({ mode: 'daily' })) ui.toast('Schalte mindestens ein Thema ein.');
    };
    return ui.page(
      ui.header('Tägliches Training', { back: '#/grammatik', backLabel: 'Grammatik', subtitle: 'Wähle, was in die 15 gemischten Aufgaben kommt. Fällige Wiederholungen aus der Fehlerkiste kommen immer dazu.' }),
      h('div.card.daily-card', null, h('p.daily-count', null, count), ui.button('Training starten', { onclick: start })),
      section('Zeitformen', tenseItems),
      ...cats().map((c) => section(c.title, TT.bankLessons(c.id).map(lessonItem))),
      section('Aus dem Unterricht', classroom().map(lessonItem)),
      h('p.muted.page-note', null, 'Neue oder schwache Themen kommen öfter dran. Ausgeschaltete Themen kannst du weiterhin einzeln üben.'));
  }

  // Themenseite eines Grammatik-Themas (Typische Fehler für Deutsche)
  function bankDetail(id) {
    const lesson = TT.lesson(id);
    const app = TT.app;
    const cat = (TT.GRAMMAR_CATS || []).find((c) => c.id === lesson.cat);
    const nav = app.session ? { back: '#/training', backLabel: 'Zurück zur Übung' } : { back: '#/grammatik', backLabel: 'Grammatik' };
    const examples = h('div');
    const fill = () => {
      const seen = new Set();
      const list = [];
      for (let i = 0; i < 20 && list.length < 3; i++) {
        const s = lesson.example();
        if (!seen.has(s)) { seen.add(s); list.push(s); }
      }
      examples.replaceChildren(...list.map((s) => h('div.row', null, h('p.sentence', null, s))));
    };
    fill();
    const m = TT.progress.mastery(app.state, id);
    return ui.page(
      ui.header(lesson.title, Object.assign({ subtitle: 'Stufe ' + lesson.level + (cat ? ' · ' + cat.title : '') }, nav)),
      h('div.card', null, h('p', null, lesson.rule)),
      ui.group('Typische Fehler', lesson.mistakes.map(([wrong, right]) => h('div.row.stack.mistake', null,
        h('span.mis-wrong', null, h('span.mis-icon', { 'aria-hidden': 'true' }, '✗'), h('span.sr-only', null, 'Falsch: '), ' ', wrong),
        h('span.mis-right', null, h('span.mis-icon', { 'aria-hidden': 'true' }, '✓'), h('span.sr-only', null, 'Richtig: '), ' ', right)))),
      ui.group('Beispiele', lesson.examples.map((ex) => h('div.row', null, h('p.sentence', null, ex)))),
      ui.group('Merkhilfe', [h('div.row', null, h('span.row-main', null, h('span.row-title', null, lesson.tip)))]),
      ui.group('Weitere Beispiele', [examples], { footer: 'Jedes Mal andere Sätze aus den Aufgaben.' }),
      ui.group('Lernstand', [
        ui.row({ title: m.count ? Math.round(m.value * 100) + ' % richtig' : 'Noch nicht geübt', subtitle: m.count ? 'aus den letzten ' + ui.plural(m.count, 'Antwort', 'Antworten') : null }),
        ui.dailyToggleRow(id, 'Im täglichen Training', { label: lesson.title + ' im täglichen Training' }),
      ]),
      h('div.actions', null,
        ui.button('Neue Beispiele', { kind: 'secondary', onclick: fill }),
        ui.button('10 Aufgaben üben', { onclick: () => app.startSession({ mode: 'lesson', topics: [id], count: 10 }) })));
  }

  function detail(id) {
    const t = TT.tense(id);
    const examples = h('div');
    const fill = () => {
      const list = [0, 1, 2].map(() => TT.generate({ tense: id }));
      examples.replaceChildren(...list.map((s) => h('div.row', null, ui.sentence(s.segments, { signals: true, verbs: 'mark' }))));
    };
    fill();
    return ui.page(
      ui.header(t.name, TT.app.session ? { back: '#/training', backLabel: 'Zurück zur Übung', subtitle: TT.ROW_DE[t.row] + ' · ' + TT.COL_LABELS[t.col] } : { back: '#/grammatik', backLabel: 'Grammatik', subtitle: TT.ROW_DE[t.row] + ' · ' + TT.COL_LABELS[t.col] }),
      h('div.card.row-' + t.row, null, TT.timeline(id), h('p', null, t.usage)),
      ui.group('Bauplan', [['aff', 'Bejaht'], ['neg', 'Verneint'], ['q', 'Frage']].map(([k, label]) =>
        ui.row({ title: t.formula[k], subtitle: label + ': ' + t.examples[k] }))),
      ui.group('Signalwörter', [h('div.chips', null, t.signals.map((s) => h('span.chip', null, s)))]),
      ui.group('Nicht verwechseln mit', t.confusions.map((c) =>
        ui.row({ href: '#/grammatik/' + c, title: TT.tense(c).name, subtitle: t.contrasts[c] }))),
      ui.group('Beispiele', [examples], { footer: 'Jedes Mal neue Sätze aus dem Generator. Gelb: Signalwörter.' }),
      ui.group(null, [ui.dailyToggleRow(id, 'Im täglichen Training', { label: t.name + ' im täglichen Training' })]),
      h('div.actions', null,
        ui.button('Neue Beispiele', { kind: 'secondary', onclick: fill }),
        ui.button('Diese Zeitform üben', { onclick: () => TT.app.startSession({ mode: 'free', tenses: [id], exercises: [], count: 10 }) }))
    );
  }

  TT.screens.grammar = {
    render(param) {
      if (param === 'training') return trainingPage();
      if (param && TT.TENSE_IDS.includes(param)) return detail(param);
      if (param && TT.isBankLesson && TT.isBankLesson(param)) return bankDetail(param);
      return overview();
    },
  };
})(globalThis.TT = globalThis.TT || {});
