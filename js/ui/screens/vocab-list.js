(function (TT) {
  'use strict';

  const { h, ui } = TT;
  const D = TT.deck;
  const STATUS_DE = { new: 'neu', learning: 'lernend', learned: 'gelernt', suspended: 'ausgesetzt' };
  const STATUS_FILTER = [['all', 'Alle'], ['new', 'Neu'], ['learning', 'Lernend'], ['learned', 'Gelernt'], ['suspended', 'Ausgesetzt']];
  const LIMIT = 100;
  let filter = { q: '', level: 'all', status: 'all' }; // bleibt erhalten, wenn man aus einem Wort zurückkommt

  function list() {
    const app = TT.app;
    const entries = TT.vocabEntries();
    const search = h('input.field.search', { type: 'search', placeholder: 'Englisch oder Deutsch suchen', 'aria-label': 'Wortliste durchsuchen' });
    search.value = filter.q;
    const option = (cur) => ([v, l]) => h('option', { value: v, selected: cur === v }, l);
    // Filter: Niveaus und die Units des Buchs („u3“ = StartUp 6, Unit 3)
    const units = TT.BOOK_SU6 ? TT.BOOK_SU6.units.map((t, i) => ['u' + (i + 1), TT.BOOK_SU6.title + ' · Unit ' + (i + 1)]) : [];
    const levelSel = h('select', { 'aria-label': 'Niveau' }, [['all', 'Alle Niveaus']].concat(TT.VOCAB_LEVELS.map((l) => [l, l]), units).map(option(filter.level)));
    const statusSel = h('select', { 'aria-label': 'Status' }, STATUS_FILTER.map(option(filter.status)));
    const results = h('div');

    function update() {
      filter = { q: search.value, level: levelSel.value, status: statusSel.value };
      const q = filter.q.trim().toLowerCase();
      const hits = entries.filter((e) => {
        if (/^u\d+$/.test(filter.level)) {
          if (!e.book || e.book.u !== Number(filter.level.slice(1))) return false;
        } else if (filter.level !== 'all' && e.level !== filter.level) return false;
        if (filter.status !== 'all' && D.status(app.vocab, e.id) !== filter.status) return false;
        if (!q) return true;
        const v = D.view(app.vocab, e);
        return v.en.toLowerCase().includes(q) || v.de.toLowerCase().includes(q);
      });
      const rows = hits.slice(0, LIMIT).map((e) => {
        const v = D.view(app.vocab, e);
        return ui.row({
          href: '#/vokabeln/wort/' + encodeURIComponent(e.id),
          title: v.en + (e.sense ? ' (' + e.sense + ')' : ''),
          subtitle: v.de,
          right: (e.level === TT.BOOK_LEVEL ? 'U' + e.book.u : e.level) + ' · ' + STATUS_DE[D.status(app.vocab, e.id)],
        });
      });
      results.replaceChildren(ui.group(ui.plural(hits.length, 'Wort', 'Wörter'), rows.length ? rows : [ui.row({ title: 'Keine Treffer' })],
        { footer: hits.length > LIMIT ? 'Die ersten ' + LIMIT + ' Treffer – grenze die Suche weiter ein.' : null }));
    }

    search.addEventListener('input', update);
    levelSel.addEventListener('change', update);
    statusSel.addEventListener('change', update);
    update();
    return ui.page(ui.header('Wortliste', { back: '#/vokabeln', backLabel: 'Vokabeln' }), search, h('div.btn-row.filters', null, levelSel, statusSel), results);
  }

  function cardText(c, now) {
    const F = TT.fsrs;
    if (c.state === F.NEW) return 'neu';
    if (c.state === F.LEARNING || c.state === F.RELEARNING) return 'in Lernschritten';
    const days = D.dayOf(c.due) - D.dayOf(now);
    const when = days <= 0 ? 'heute' : days === 1 ? 'morgen' : 'in ' + days + ' Tagen';
    return 'fällig ' + when + ' · ' + ui.plural(c.reps, 'Wiederholung', 'Wiederholungen') + (c.lapses ? ' · ' + c.lapses + '× vergessen' : '');
  }

  function word(id) {
    const app = TT.app;
    const base = TT.vocabEntry(id);
    const nav = app.vocabSession && app.vocabSession.editing === id ? { back: '#/vokabeln/lernen', backLabel: 'Zurück zum Lernen' } : { back: '#/vokabeln/liste', backLabel: 'Wortliste' };
    if (!base) return ui.page(ui.header('Wort nicht gefunden', nav));
    const v = D.view(app.vocab, base);
    const edited = D.isEdited(app.vocab, id);
    const suspended = D.isSuspended(app.vocab, id);
    const inputs = {};

    const field = (name, label, multiline) => {
      const el = h(multiline ? 'textarea.field' : 'input.field', { rows: multiline ? 2 : null, lang: name === 'ex' ? 'en' : 'de', maxlength: '500' });
      el.value = v[name];
      inputs[name] = el;
      return h('label.field-label', null, h('span', null, label), el);
    };

    function save() {
      const f = {};
      for (const n of TT.vocabStore.EDIT_FIELDS) f[n] = inputs[n].value;
      if (!f.de.trim() || !f.ex.trim() || !f.exDe.trim()) {
        ui.toast('Übersetzung, Beispielsatz und Satzübersetzung dürfen nicht leer sein');
        return;
      }
      // unverändert gegenüber dem Original: keine Änderung speichern (eine frühere Änderung wird zurückgenommen)
      if (TT.vocabStore.EDIT_FIELDS.every((n) => f[n].trim() === String(base[n] || '').trim())) {
        if (edited) act(D.restoreEdit(app.vocab, id, Date.now()), 'Original wiederhergestellt');
        else ui.toast('Keine Änderung');
        return;
      }
      app.saveVocab(D.setEdit(app.vocab, id, f, Date.now()));
      const found = TT.vocabText.find(f.ex.trim(), D.view(app.vocab, base));
      ui.toast(found ? 'Gespeichert' : 'Gespeichert – das Wort wird im Satz nicht hervorgehoben');
      TT.router.refresh();
    }

    function act(docs, msg) {
      app.saveVocab(docs);
      ui.toast(msg);
      TT.router.refresh();
    }

    const now = Date.now();
    const actions = [ui.row({
      title: suspended ? 'Wieder lernen' : 'Aussetzen', noChevron: true,
      subtitle: suspended ? 'Das Wort ist ausgesetzt.' : 'Das Wort kommt nicht mehr dran.',
      onclick: () => act(D.setSuspended(app.vocab, id, !suspended, Date.now()), suspended ? 'Wird wieder gelernt' : 'Ausgesetzt'),
    })];
    if (D.status(app.vocab, id) === 'new') {
      actions.push(ui.row({ title: 'Schon bekannt', subtitle: 'Gleich mit langem Abstand einplanen', noChevron: true, onclick: () => act(D.markKnown(app.vocab, base, Date.now()), 'Als bekannt eingeplant') }));
    }
    if (edited) {
      actions.push(ui.confirmTap(ui.row({ title: 'Original wiederherstellen', onclick: () => {}, noChevron: true, danger: true }), 'Wirklich zurücksetzen?',
        () => act(D.restoreEdit(app.vocab, id, Date.now()), 'Original wiederhergestellt')));
    }

    return ui.page(
      ui.header(base.en, Object.assign({ subtitle: TT.vocabScreens.levelLabel(base) + ' · ' + TT.vocabPosLabel(base.pos) + (base.sense ? ' · ' + base.sense : '') +
        (base.book ? ' · ' + TT.bookPlace(base.book.u, base.book.l) : '') }, nav)),
      ui.group('Karte bearbeiten', [
        field('de', 'Deutsche Übersetzung'),
        field('hint', 'Hinweis für Deutsch → Englisch (optional)'),
        field('ex', 'Beispielsatz Englisch', true),
        field('exDe', 'Beispielsatz Deutsch', true),
        field('emoji', 'Emoji (optional)'),
      ], { footer: edited ? 'Von dir geändert. Änderungen gelten auf allen deinen Geräten.' : 'Änderungen gelten auf allen deinen Geräten.' }),
      h('div.actions.vocab-save', null, ui.button('Speichern', { onclick: save })),
      ui.group('Lernstand', ['ed', 'de'].map((dir) => ui.row({
        title: dir === 'ed' ? 'Englisch → Deutsch' : 'Deutsch → Englisch',
        subtitle: cardText(D.cardOf(app.vocab, id, dir), now),
      }))),
      ui.group(null, actions));
  }

  TT.vocabScreens = Object.assign(TT.vocabScreens || {}, { list, word });
})(globalThis.TT = globalThis.TT || {});
