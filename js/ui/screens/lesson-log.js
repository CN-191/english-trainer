(function (TT) {
  'use strict';

  // Stunden: Zusammenfassung jeder Englischstunde (Thema, Fehler, neue Wörter, Hausaufgaben …).
  // Die Zusammenfassung entsteht aus der Aufnahme der Stunde; hier lässt sie sich lesen und bearbeiten.
  // Neue Wörter und Hausaufgaben lassen sich mit einem Tipp in „Eigene Wörter“ bzw. ins Hausaufgabenheft übernehmen.

  const { h, ui } = TT;
  const LL = TT.lessonLog;
  const HW = TT.homework;

  const shortDay = (day) => new Date(day + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' });
  const bullets = (items) => h('ul.ll-list', null, items.map((s) => h('li', null, s)));
  const para = (text) => h('div.ll-text', { lang: 'en' }, text);

  // Wörter, die es in der App schon gibt (Wortliste und eigene Wörter), verglichen ohne „to “ und Groß/klein
  const wordKey = (en) => String(en || '').toLowerCase().replace(/^to\s+/, '').replace(/\s+/g, ' ').trim();
  function knownWords() {
    const set = new Set();
    for (const e of TT.vocabEntries()) set.add(wordKey(e.en));
    return set;
  }

  function listPage() {
    const app = TT.app;
    const items = LL.list(app.lessonLog);
    const create = () => {
      const id = LL.add(app.lessonLog, { day: HW.today(), title: 'Neue Stunde' }, Date.now());
      app.saveLessonLog();
      TT.router.go('/stunden/' + id + '/bearbeiten');
    };
    return ui.page(
      ui.header('Stunden', { back: '#/start', backLabel: 'Start', subtitle: 'Zusammenfassungen deiner Englischstunden – aus der Aufnahme erstellt, von dir bearbeitbar.' }),
      ui.group(items.length ? ui.plural(items.length, 'Stunde', 'Stunden') : null,
        items.length
          ? items.map((x) => ui.row({ href: '#/stunden/' + x.id, title: shortDay(x.day), subtitle: x.title || null, right: x.minutes ? x.minutes + ' min' : null }))
          : [ui.row({ title: 'Noch keine Stunden', subtitle: 'Nach der Stunde die Aufnahme bei Claude auswerten lassen – dann erscheint sie hier.' })]),
      h('div.actions', null, ui.button('Stunde selbst anlegen', { kind: 'secondary', onclick: create })));
  }

  // ---- Ansicht einer Stunde ----
  function view(id) {
    const app = TT.app;
    const x = LL.get(app.lessonLog, id);
    if (!x) return ui.page(ui.header('Stunde nicht gefunden', { back: '#/stunden', backLabel: 'Stunden' }));
    const body = h('div');

    const draw = () => {
      const cur = LL.get(app.lessonLog, id);
      if (!cur) {
        TT.router.go('/stunden');
        return;
      }
      body.replaceChildren(...sections(cur, draw));
    };
    draw();
    const edit = h('a.btn.btn-secondary.btn-small', { href: '#/stunden/' + id + '/bearbeiten' }, 'Bearbeiten');
    const el = ui.page(
      ui.header(shortDay(x.day), {
        back: '#/stunden', backLabel: 'Stunden', right: edit,
        subtitle: [x.title, x.book, x.minutes ? x.minutes + ' min' : ''].filter(Boolean).join(' · '),
      }),
      body);
    // Änderungen von einem anderen Gerät übernehmen
    return { el, cleanup: TT.sync.onStatus(draw) };
  }

  function mistakeRows(items) {
    return items.map((m) => h('div.row.ll-mistake', { lang: 'en' },
      h('span.row-main', null,
        h('span.row-title', null, m.said ? h('s.ll-said', null, m.said) : null, m.said && m.fix ? ' → ' : null, m.fix ? h('b.ll-fix', null, m.fix) : null),
        m.why ? h('span.row-sub', null, m.why) : null)));
  }

  function sections(x, redraw) {
    const app = TT.app;
    const out = [];
    if (x.topic) out.push(ui.group('Topic', [para(x.topic)]));
    if (x.did.length) out.push(ui.group('What we did', [bullets(x.did)]));
    if (x.teacher.length) out.push(ui.group('Mistakes – corrected by your teacher', mistakeRows(x.teacher)));
    if (x.noticed.length) out.push(ui.group('Mistakes – noticed in the recording', mistakeRows(x.noticed), { footer: 'In der Stunde nicht korrigiert, beim Auswerten der Aufnahme aufgefallen.' }));
    if (x.tips.length) out.push(ui.group('Tips', [bullets(x.tips)]));

    if (x.words.length) {
      const known = knownWords();
      const fresh = x.words.filter((w) => !known.has(wordKey(w.en)));
      const rows = x.words.map((w) => ui.row({ title: w.en, subtitle: w.de, right: known.has(wordKey(w.en)) ? 'in der App' : null }));
      out.push(ui.group('New words', rows, { footer: fresh.length ? null : 'Alle Wörter gibt es schon in der App.' }));
      if (fresh.length) {
        out.push(h('div.actions.ll-action', null, ui.button(ui.plural(fresh.length, 'neues Wort', 'neue Wörter') + ' zu „Eigene Wörter“', {
          kind: 'secondary',
          onclick: () => {
            const now = Date.now();
            let n = 0;
            for (const w of fresh) {
              if (Object.keys(app.vocab.own).length >= TT.vocabStore.OWN_MAX) break;
              TT.deck.setOwn(app.vocab, null, { en: w.en, de: w.de }, now + n);
              n++;
            }
            app.saveVocab([TT.vocabStore.OWN_DOC]);
            ui.toast(ui.plural(n, 'Wort', 'Wörter') + ' hinzugefügt');
            redraw();
          },
        })));
      }
    }

    if (x.grammar.length) out.push(ui.group('Grammar', [bullets(x.grammar)]));

    if (x.homework.length) {
      const missing = x.homework.filter((t) => !LL.inHomework(app.homework, x.day, t));
      const rows = x.homework.map((t) => h('div.row.hw-row', null,
        h('span.row-main', null,
          h('span.row-title', null, h('span.hw-book.hw-' + t.book, null, HW.BOOK_LABEL[t.book]), t.page ? 'p. ' + t.page : ''),
          t.task ? h('span.row-sub', { lang: 'en' }, t.task) : null),
        LL.inHomework(app.homework, x.day, t) ? h('span.row-right', null, 'im Heft ✓') : null));
      out.push(ui.group('Homework', rows, { footer: missing.length ? null : 'Alles steht im Hausaufgabenheft – dort abhaken.' }));
      if (missing.length) {
        out.push(h('div.actions.ll-action', null, ui.button(ui.plural(missing.length, 'Aufgabe', 'Aufgaben') + ' ins Hausaufgabenheft', {
          kind: 'secondary',
          onclick: () => {
            const now = Date.now();
            missing.forEach((t, i) => HW.add(app.homework, { day: x.day, book: t.book, page: t.page, task: t.task }, now + i));
            app.saveHomework();
            ui.toast('Ins Hausaufgabenheft übernommen');
            redraw();
          },
        })));
      }
    }

    if (x.questions.length) out.push(ui.group('Questions for next time', [bullets(x.questions)]));
    out.push(ui.group('My notes', [x.notes ? para(x.notes) : ui.row({ title: 'Noch keine Notizen', subtitle: 'Unter „Bearbeiten“ kannst du eigene Notizen ergänzen.' })]));
    return out;
  }

  // ---- Bearbeiten: jeder Abschnitt als Textfeld, eine Zeile je Eintrag ----
  function editPage(id) {
    const app = TT.app;
    const x = LL.get(app.lessonLog, id);
    const back = { back: '#/stunden/' + id, backLabel: 'Zurück' };
    if (!x) return ui.page(ui.header('Stunde nicht gefunden', { back: '#/stunden', backLabel: 'Stunden' }));

    const input = (value, o = {}) => {
      const el = h(o.rows ? 'textarea.field' : 'input.field', {
        type: o.rows ? null : o.type || 'text', rows: o.rows ? String(o.rows) : null, lang: o.lang || 'en',
        maxlength: String(o.max || 20000), autocomplete: 'off', spellcheck: o.rows ? 'true' : 'false', 'aria-label': o.label,
      });
      el.value = value;
      return el;
    };
    const rowsFor = (text) => Math.min(14, Math.max(3, text.split('\n').length + 1));
    const area = (text, label) => input(text, { rows: rowsFor(text), label });

    const f = {
      day: input(x.day, { type: 'date', label: 'Datum', lang: 'de' }),
      title: input(x.title, { label: 'Titel', max: 200 }),
      book: input(x.book, { label: 'Buch und Seiten', max: 100 }),
      topic: area(x.topic, 'Topic'),
      did: area(LL.listText(x.did), 'What we did'),
      teacher: area(LL.mistakeText(x.teacher), 'Mistakes corrected by your teacher'),
      noticed: area(LL.mistakeText(x.noticed), 'Mistakes noticed in the recording'),
      tips: area(LL.listText(x.tips), 'Tips'),
      words: area(LL.wordText(x.words), 'New words'),
      grammar: area(LL.listText(x.grammar), 'Grammar'),
      homework: area(LL.homeworkText(x.homework), 'Homework'),
      questions: area(LL.listText(x.questions), 'Questions for next time'),
      notes: area(x.notes, 'My notes'),
    };
    const field = (label, el) => h('label.field-label', null, h('span', null, label), el);
    const section = (title, el, footer) => ui.group(title, [h('div.row', null, el)], { footer });

    const save = () => {
      const fields = {
        day: f.day.value || x.day, title: f.title.value, book: f.book.value, topic: f.topic.value, notes: f.notes.value,
        did: LL.parseList(f.did.value), tips: LL.parseList(f.tips.value), grammar: LL.parseList(f.grammar.value), questions: LL.parseList(f.questions.value),
        teacher: LL.parseMistakes(f.teacher.value), noticed: LL.parseMistakes(f.noticed.value),
        words: LL.parseWords(f.words.value), homework: LL.parseHomework(f.homework.value),
      };
      if (!LL.update(app.lessonLog, id, fields, Date.now())) {
        ui.toast('Bitte ein gültiges Datum eintragen');
        return;
      }
      app.saveLessonLog();
      ui.toast('Gespeichert');
      TT.router.go('/stunden/' + id);
    };
    const del = ui.confirmTap(ui.row({ title: 'Stunde löschen', onclick: () => {}, noChevron: true, danger: true }), 'Wirklich löschen?', () => {
      LL.remove(app.lessonLog, id, Date.now());
      app.saveLessonLog();
      ui.toast('Gelöscht');
      TT.router.go('/stunden');
    });

    return ui.page(
      ui.header('Stunde bearbeiten', back),
      ui.group(null, [field('Datum', f.day), field('Titel', f.title), field('Buch und Seiten', f.book)]),
      section('Topic', f.topic),
      section('What we did', f.did, 'Eine Zeile je Punkt.'),
      section('Mistakes – corrected by your teacher', f.teacher, 'Eine Zeile je Fehler: falsch → richtig — Erklärung'),
      section('Mistakes – noticed in the recording', f.noticed, 'Eine Zeile je Fehler: falsch → richtig — Erklärung'),
      section('Tips', f.tips, 'Eine Zeile je Tipp.'),
      section('New words', f.words, 'Eine Zeile je Wort: Englisch – Deutsch'),
      section('Grammar', f.grammar, 'Eine Zeile je Thema.'),
      section('Homework', f.homework, 'Eine Zeile je Aufgabe: „SB p. 15: Aufgabe“, „WB p. 9–10“ oder nur die Aufgabe.'),
      section('Questions for next time', f.questions, 'Eine Zeile je Frage.'),
      section('My notes', f.notes),
      h('div.actions.vocab-save', null, ui.button('Speichern', { onclick: save }), h('a.btn.btn-secondary', { href: '#/stunden/' + id }, 'Abbrechen')),
      ui.group(null, [del]));
  }

  TT.screens.lessonLog = {
    render(param) {
      if (!param) return listPage();
      const [id, mode] = param.split('/');
      return mode === 'bearbeiten' ? editPage(id) : view(id);
    },
  };
})(globalThis.TT = globalThis.TT || {});
