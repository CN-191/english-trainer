(function (TT) {
  'use strict';

  // Hausaufgabenheft: nach der Stunde Aufgaben eintragen (Student Book, Workbook, Sonstiges), dann abhaken.
  // Offene Aufgaben stehen auch auf der Startseite.

  const { h, ui } = TT;
  const HW = TT.homework;
  const DONE_SHOWN = 30;
  let form = { day: null, book: 'sb' }; // bleibt zwischen zwei Einträgen stehen (mehrere Aufgaben derselben Stunde)

  const dayLabel = (day) => {
    const d = new Date(day + 'T12:00:00');
    const t = HW.today();
    const prefix = day === t ? 'Heute · ' : '';
    return prefix + d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' });
  };
  const title = (x) => [HW.BOOK_LABEL[x.book], x.page ? 'S. ' + x.page : ''].filter(Boolean).join(' · ');

  // Eine Aufgabe mit Abhak-Knopf; onChange nach jeder Änderung (neu zeichnen)
  ui.homeworkRow = (x, onChange, o = {}) => {
    const app = TT.app;
    const check = h('button.hw-check' + (x.done ? '.done' : ''), {
      type: 'button', role: 'checkbox', 'aria-checked': String(x.done),
      'aria-label': title(x) + (x.task ? ', ' + x.task : '') + (x.done ? ' – erledigt' : ' – offen'),
    }, h('span', { 'aria-hidden': 'true' }, '✓'));
    check.addEventListener('click', () => {
      HW.setDone(app.homework, x.id, !x.done, Date.now());
      app.saveHomework();
      if (!x.done) ui.toast('Erledigt');
      onChange();
    });
    const del = o.deletable ? ui.confirmTap(h('button.hw-del', { type: 'button', 'aria-label': 'Aufgabe löschen' }, '×'), 'Löschen?', () => {
      HW.remove(app.homework, x.id, Date.now());
      app.saveHomework();
      onChange();
    }) : null;
    return h('div.row.hw-row' + (x.done ? '.done' : ''), null, check,
      h('span.row-main', null,
        // farbiges Buch-Schild, daneben die Seite (Sonstiges: nur die Übung)
        h('span.row-title', null, h('span.hw-book.hw-' + x.book, null, HW.BOOK_LABEL[x.book]), x.page ? 'S. ' + x.page : ''),
        x.task ? h('span.row-sub', null, x.task) : null,
        o.showDay ? h('span.row-sub', null, 'Stunde: ' + dayLabel(x.day)) : null),
      del);
  };

  function page() {
    const app = TT.app;
    const body = h('div');
    const day = h('input.field', { type: 'date', 'aria-label': 'Datum der Stunde', max: '2100-12-31' });
    day.value = form.day || HW.today();
    const page = h('input.field', { type: 'text', inputmode: 'numeric', maxlength: '20', placeholder: 'Seite', 'aria-label': 'Seite', autocomplete: 'off' });
    const task = h('input.field', { type: 'text', maxlength: '300', placeholder: 'Übung, z. B. 3a, 4 und 5', 'aria-label': 'Übung', autocomplete: 'off', enterkeyhint: 'done' });
    const bookSeg = ui.segmented(HW.BOOKS.map((b) => [b, HW.BOOK_LABEL[b]]), form.book, (v) => { form.book = v; });

    const draw = () => {
      const { open, done } = HW.list(app.homework);
      const groups = [];
      if (!open.length) {
        groups.push(ui.group('Offen', [ui.row({ title: done.length ? 'Alles erledigt 🎉' : 'Noch keine Hausaufgaben', subtitle: done.length ? null : 'Trag oben ein, was du nach der Stunde aufbekommen hast.' })]));
      } else {
        // offene Aufgaben je Stunde (älteste zuerst)
        const days = [...new Set(open.map((x) => x.day))];
        for (const d of days) groups.push(ui.group('Stunde ' + dayLabel(d), open.filter((x) => x.day === d).map((x) => ui.homeworkRow(x, draw, { deletable: true }))));
      }
      if (done.length) {
        groups.push(ui.group('Erledigt', done.slice(0, DONE_SHOWN).map((x) => ui.homeworkRow(x, draw, { deletable: true, showDay: true })),
          { footer: done.length > DONE_SHOWN ? 'Die letzten ' + DONE_SHOWN + ' von ' + done.length + ' erledigten Aufgaben.' : 'Nochmal antippen, um eine Aufgabe wieder zu öffnen.' }));
      }
      body.replaceChildren(...groups);
    };

    const add = () => {
      if (!page.value.trim() && !task.value.trim()) {
        ui.toast('Bitte Seite oder Übung eintragen');
        page.focus();
        return;
      }
      form = { day: day.value || HW.today(), book: form.book };
      HW.add(app.homework, { day: form.day, book: form.book, page: page.value, task: task.value }, Date.now());
      app.saveHomework();
      page.value = '';
      task.value = '';
      ui.toast('Eingetragen');
      draw();
      page.focus({ preventScroll: true });
    };
    task.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });

    draw();
    const el = ui.page(
      ui.header('Hausaufgaben', { back: '#/start', backLabel: 'Start', subtitle: 'Was du nach der Stunde aufbekommst – zum Abhaken.' }),
      ui.group('Neue Aufgabe', [
        h('div.row', null, bookSeg),
        h('div.row.hw-form', null, h('label.hw-day', null, h('span', null, 'Stunde vom'), day), page),
        h('div.row', null, task),
      ], { footer: 'Datum und Buch bleiben stehen – so trägst du mehrere Aufgaben derselben Stunde schnell nacheinander ein.' }),
      h('div.actions.vocab-save', null, ui.button('Eintragen', { onclick: add })),
      body);
    // Kommen Aufgaben von einem anderen Gerät, die Liste aktualisieren (die Eingabe bleibt stehen)
    return { el, cleanup: TT.sync.onStatus(draw) };
  }

  // Für die Startseite: offene Aufgaben (höchstens 5) mit Abhaken, sonst ein Link
  TT.homeworkStartGroup = (onChange) => {
    const app = TT.app;
    const { open, done } = HW.list(app.homework);
    const link = ui.row({
      href: '#/hausaufgaben', title: open.length ? 'Alle Hausaufgaben' : 'Hausaufgaben',
      subtitle: open.length ? null : done.length ? 'Alles erledigt' : 'Aufgaben aus der Stunde eintragen und abhaken',
      right: open.length > 5 ? '+' + (open.length - 5) : null,
    });
    const lessons = TT.lessonLog ? TT.lessonLog.list(app.lessonLog) : [];
    const stunden = ui.row({
      href: '#/stunden', title: 'Stunden',
      subtitle: lessons.length ? 'Zuletzt: ' + (lessons[0].title || lessons[0].day) : 'Zusammenfassungen deiner Englischstunden',
    });
    return ui.group(open.length ? 'Hausaufgaben · ' + open.length + ' offen' : null,
      open.slice(0, 5).map((x) => ui.homeworkRow(x, onChange, { showDay: false })).concat(link, stunden));
  };

  TT.screens.homework = { render: page };
})(globalThis.TT = globalThis.TT || {});
