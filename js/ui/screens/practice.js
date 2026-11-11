(function (TT) {
  'use strict';

  const { h, ui } = TT;
  const DUELS = [
    ['present-simple', 'present-progressive'],
    ['past-simple', 'present-perfect'],
    ['present-perfect', 'present-perfect-progressive'],
    ['past-simple', 'past-progressive'],
    ['past-simple', 'past-perfect'],
    ['future-simple', 'future-progressive'],
    ['future-perfect', 'future-perfect-progressive'],
  ];
  // Auswahl bleibt erhalten, solange die Seite offen ist
  const sel = { tenses: new Set(TT.TENSE_IDS), exercises: new Set(TT.session.EXERCISES), count: 20 };

  function tenseSelect(value, label) {
    const s = h('select', { 'aria-label': label }, TT.TENSES.map((t) => h('option', { value: t.id }, t.name)));
    s.value = value;
    return s;
  }

  TT.screens.practice = {
    render() {
      const app = TT.app;
      const gridWrap = h('div.card.grid-card');
      const startBtn = ui.button('Los geht’s', {
        onclick: () => app.startSession({ mode: 'free', tenses: [...sel.tenses], exercises: [...sel.exercises], count: sel.count }),
      });
      const updateStart = () => {
        startBtn.disabled = sel.tenses.size === 0 || sel.exercises.size === 0;
      };
      const drawGrid = () => {
        gridWrap.replaceChildren(ui.tenseGrid((t) => ({
          selected: sel.tenses.has(t.id),
          onclick: () => {
            if (sel.tenses.has(t.id)) sel.tenses.delete(t.id);
            else sel.tenses.add(t.id);
            drawGrid();
            updateStart();
          },
        })));
      };
      const setTenses = (ids) => {
        sel.tenses = new Set(ids);
        drawGrid();
        updateStart();
      };
      const chip = (label, fn) => h('button.chip', { type: 'button', onclick: fn }, label);
      const quick = h('div.chips.quick', null,
        chip('Alle', () => setTenses(TT.TENSE_IDS)),
        chip('Keine', () => setTenses([])),
        ...TT.ROWS.map((r) => chip(TT.ROW_LABELS[r], () => setTenses(TT.TENSES.filter((t) => t.row === r).map((t) => t.id)))),
        ...TT.COLS.map((c) => chip(TT.COL_LABELS[c], () => setTenses(TT.TENSES.filter((t) => t.col === c).map((t) => t.id)))));

      const exRows = TT.session.EXERCISES.map((id) =>
        h('label.row.row-toggle', null,
          h('span.row-main', null, h('span.row-title', null, TT.ex.LABELS[id])),
          h('span.row-right', null, ui.toggle(sel.exercises.has(id), (on) => {
            if (on) sel.exercises.add(id);
            else sel.exercises.delete(id);
            updateStart();
          }, TT.ex.LABELS[id]))));

      const duelA = tenseSelect('past-simple', 'Erste Zeitform');
      const duelB = tenseSelect('present-perfect', 'Zweite Zeitform');
      const startDuel = () => {
        if (duelA.value === duelB.value) {
          ui.toast('Bitte zwei verschiedene Zeitformen wählen');
          return;
        }
        app.startSession({ mode: 'duel', tenses: [duelA.value, duelB.value] });
      };

      drawGrid();
      updateStart();
      return ui.page(
        ui.header('Üben'),
        ui.group('Aus dem Unterricht', TT.LESSONS.filter((l) => !l.bank).map((l) => ui.lessonRow(l))),
        (TT.GRAMMAR_CATS || []).some((c) => TT.bankLessons(c.id).length)
          ? ui.group('Typische Fehler für Deutsche', TT.GRAMMAR_CATS.filter((c) => TT.bankLessons(c.id).length).map((c) => {
            const ids = TT.bankLessons(c.id).map((l) => l.id);
            return ui.row({
              title: c.title, subtitle: ui.plural(ids.length, 'Thema', 'Themen') + ' gemischt · 10 Aufgaben',
              onclick: () => app.startSession({ mode: 'lesson', topics: ids, count: 10 }),
            });
          }), { footer: 'Regeln und einzelne Themen findest du unter Grammatik.' })
          : null,
        ui.group('Zeitformen', [gridWrap, quick], { plain: true }),
        ui.group('Übungsarten', exRows),
        ui.group('Anzahl', [h('div.row', null, ui.segmented([[10, '10'], [20, '20'], [30, '30']], sel.count, (v) => { sel.count = Number(v); }))]),
        ui.group('Eingabe', [h('div.row', null, ui.segmented([['type', 'Tippen'], ['choice', 'Auswahl']], app.state.settings.inputMode, (v) => {
          app.state.settings.inputMode = v;
          app.save();
        }))]),
        h('div.actions.block-gap', null, startBtn),
        ui.group('Duell · zwei Zeitformen gegeneinander', DUELS.map(([a, b]) =>
          ui.row({ title: TT.tense(a).name + ' ↔ ' + TT.tense(b).name, onclick: () => app.startSession({ mode: 'duel', tenses: [a, b] }) }))),
        ui.group('Eigenes Duell', [h('div.row.stack', null, duelA, duelB, ui.button('Duell starten', { kind: 'secondary', onclick: startDuel }))]),
        ui.group(null, [ui.row({ title: 'Geschichten', subtitle: 'Lückentexte mit gemischten Zeitformen', href: '#/geschichten' })])
      );
    },
  };
})(globalThis.TT = globalThis.TT || {});
