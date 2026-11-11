(function (TT) {
  'use strict';

  // Eigene Wörter: selbst angelegte Karten (z. B. aus dem Unterricht) als eigene Kategorie mit Schalter.
  // Sie laufen im selben Wiederholungsplan wie alle anderen Wörter und kommen als neue Wörter zuerst dran.

  const { h, ui } = TT;
  const D = TT.deck;
  const S = TT.vocabStore;
  const POS_OPTS = [['', 'Wortart (optional)'], ['n', 'Nomen'], ['v', 'Verb'], ['adj', 'Adjektiv'], ['adv', 'Adverb'], ['phrase', 'Wendung']];
  const STATUS_DE = { new: 'neu', learning: 'lernend', learned: 'gelernt', suspended: 'ausgesetzt' };

  // Eingabefelder für ein Wort; values = { en, de, pos, hint, ex, exDe }
  function wordForm(values) {
    const v = values || {};
    const input = (name, label, o = {}) => {
      const el = h(o.multiline ? 'textarea.field' : 'input.field', {
        rows: o.multiline ? 2 : null, lang: o.lang, maxlength: String(o.max || 500),
        autocapitalize: 'none', autocomplete: 'off', spellcheck: 'false',
      });
      el.value = v[name] || '';
      return { name, el, row: h('label.field-label', null, h('span', null, label), el) };
    };
    const pos = h('select', { 'aria-label': 'Wortart' }, POS_OPTS.map(([val, label]) => h('option', { value: val, selected: (v.pos || '') === val }, label)));
    const fields = [
      input('en', 'Englisch', { lang: 'en', max: 100 }),
      input('de', 'Deutsch', { lang: 'de' }),
      input('ex', 'Beispielsatz Englisch (optional)', { lang: 'en', multiline: true }),
      input('exDe', 'Beispielsatz Deutsch (optional)', { lang: 'de', multiline: true }),
      input('hint', 'Hinweis für Deutsch → Englisch (optional)', { lang: 'de' }),
    ];
    const rows = [fields[0].row, fields[1].row, h('div.row', null, pos), fields[2].row, fields[3].row, fields[4].row];
    return {
      rows,
      read() {
        const out = { pos: pos.value };
        for (const f of fields) out[f.name] = f.el.value.trim();
        return out;
      },
      clear() {
        for (const f of fields) f.el.value = '';
        pos.value = '';
      },
      focus: () => fields[0].el.focus(),
    };
  }

  // Prüft die Eingabe; liefert eine Meldung oder null
  function problem(f, vocab, selfId) {
    if (!f.en || !f.de) return 'Bitte Englisch und Deutsch ausfüllen';
    const same = Object.keys(vocab.own).find((id) => id !== selfId && vocab.own[id].f && vocab.own[id].f.en.toLowerCase() === f.en.toLowerCase() && vocab.own[id].f.de.toLowerCase() === f.de.toLowerCase());
    if (same) return 'Dieses Wort hast du schon angelegt';
    if (!selfId && Object.keys(vocab.own).length >= S.OWN_MAX) return 'Mehr als ' + S.OWN_MAX + ' eigene Wörter sind nicht möglich';
    return null;
  }

  function page() {
    const app = TT.app;
    const form = wordForm();
    const listEl = h('div');

    const drawList = () => {
      const entries = TT.vocabEntries().filter((e) => e.own).reverse(); // neueste zuerst
      const rows = entries.map((e) => ui.row({
        href: '#/vokabeln/wort/' + encodeURIComponent(e.id), title: e.en, subtitle: e.de,
        right: STATUS_DE[D.status(app.vocab, e.id)],
      }));
      listEl.replaceChildren(ui.group(entries.length ? ui.plural(entries.length, 'eigenes Wort', 'eigene Wörter') : 'Deine Wörter',
        rows.length ? rows : [ui.row({ title: 'Noch keine eigenen Wörter', subtitle: 'Lege oben dein erstes Wort an.' })],
        { footer: rows.length ? 'Antippen zum Bearbeiten oder Löschen.' : null }));
    };

    const add = () => {
      const f = form.read();
      const bad = problem(f, app.vocab);
      if (bad) {
        ui.toast(bad);
        return;
      }
      app.saveVocab(D.setOwn(app.vocab, null, f, Date.now()).docs);
      const known = TT.vocabEntries().some((e) => !e.own && e.en.toLowerCase() === f.en.toLowerCase());
      ui.toast(known ? 'Hinzugefügt – das Wort steht auch in der Wortliste' : 'Hinzugefügt');
      form.clear();
      form.focus();
      drawList();
    };

    drawList();
    const onRow = h('label.row', null, h('span.row-main', null, h('span.row-title', null, 'Eigene Wörter lernen')),
      ui.toggle(D.ownOn(app.vocab), (on) => app.saveVocab(D.setOwnOn(app.vocab, on, Date.now())), 'Eigene Wörter lernen'));
    const el = ui.page(
      ui.header('Eigene Wörter', { back: '#/vokabeln', backLabel: 'Vokabeln', subtitle: 'Wörter aus dem Unterricht oder von unterwegs selbst anlegen.' }),
      ui.group(null, [onRow], { footer: 'Eigene Kategorie: Ausgeschaltet werden deine Wörter weder neu gelernt noch wiederholt. Eingeschaltet kommen neue eigene Wörter vor allen anderen dran.' }),
      ui.group('Neues Wort', form.rows),
      h('div.actions.vocab-save', null, ui.button('Hinzufügen', { onclick: add })),
      listEl);
    // Kommen Wörter von einem anderen Gerät dazu, die Liste aktualisieren (die Eingabe bleibt stehen)
    return { el, cleanup: TT.sync.onStatus(drawList) };
  }

  function cardText(c, now) {
    const F = TT.fsrs;
    if (c.state === F.NEW) return 'neu';
    if (c.state === F.LEARNING || c.state === F.RELEARNING) return 'in Lernschritten';
    const days = D.dayOf(c.due) - D.dayOf(now);
    return 'fällig ' + (days <= 0 ? 'heute' : days === 1 ? 'morgen' : 'in ' + days + ' Tagen') + ' · ' + ui.plural(c.reps, 'Wiederholung', 'Wiederholungen');
  }

  // Ein eigenes Wort bearbeiten, aussetzen oder löschen
  function word(id) {
    const app = TT.app;
    const base = TT.vocabEntry(id);
    const fromRun = app.vocabSession && app.vocabSession.editing === id;
    const nav = fromRun ? { back: '#/vokabeln/lernen', backLabel: 'Zurück zum Lernen' } : { back: '#/vokabeln/eigene', backLabel: 'Eigene Wörter' };
    if (!base || !base.own) return ui.page(ui.header('Wort nicht gefunden', nav));
    const form = wordForm(base);
    const suspended = D.isSuspended(app.vocab, id);
    const act = (docs, msg, to) => {
      app.saveVocab(docs);
      ui.toast(msg);
      if (to) TT.router.go(to);
      else TT.router.refresh();
    };
    const save = () => {
      const f = form.read();
      const bad = problem(f, app.vocab, id);
      if (bad) {
        ui.toast(bad);
        return;
      }
      if (S.OWN_FIELDS.every((n) => f[n] === String(base[n] || ''))) {
        ui.toast('Keine Änderung');
        return;
      }
      act(D.setOwn(app.vocab, id, f, Date.now()).docs, 'Gespeichert');
    };
    const now = Date.now();
    const actions = [ui.row({
      title: suspended ? 'Wieder lernen' : 'Aussetzen', noChevron: true,
      subtitle: suspended ? 'Das Wort ist ausgesetzt.' : 'Das Wort kommt nicht mehr dran.',
      onclick: () => act(D.setSuspended(app.vocab, id, !suspended, Date.now()), suspended ? 'Wird wieder gelernt' : 'Ausgesetzt'),
    })];
    if (D.status(app.vocab, id) === 'new') {
      actions.push(ui.row({ title: 'Schon bekannt', subtitle: 'Gleich mit langem Abstand einplanen', noChevron: true, onclick: () => act(D.markKnown(app.vocab, base, Date.now()), 'Als bekannt eingeplant') }));
    }
    actions.push(ui.confirmTap(ui.row({ title: 'Wort löschen', onclick: () => {}, noChevron: true, danger: true }), 'Wirklich löschen?',
      () => act(D.removeOwn(app.vocab, id, Date.now()), 'Gelöscht', fromRun ? '/vokabeln/lernen' : '/vokabeln/eigene')));

    return ui.page(
      ui.header(base.en, Object.assign({ subtitle: 'Eigenes Wort' + (base.pos ? ' · ' + TT.vocabPosLabel(base.pos) : '') }, nav)),
      ui.group('Wort bearbeiten', form.rows, { footer: 'Änderungen gelten auf allen deinen Geräten.' }),
      h('div.actions.vocab-save', null, ui.button('Speichern', { onclick: save })),
      ui.group('Lernstand', ['ed', 'de'].map((dir) => ui.row({
        title: dir === 'ed' ? 'Englisch → Deutsch' : 'Deutsch → Englisch',
        subtitle: cardText(D.cardOf(app.vocab, id, dir), now),
      }))),
      ui.group(null, actions));
  }

  TT.vocabScreens = Object.assign(TT.vocabScreens || {}, { own: page, ownWord: word });
})(globalThis.TT = globalThis.TT || {});
