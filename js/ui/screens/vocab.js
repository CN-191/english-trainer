(function (TT) {
  'use strict';

  const { h, ui } = TT;
  const D = TT.deck;
  const DIR_OPTS = [['both', 'Beide'], ['ed', 'EN → DE'], ['de', 'DE → EN']];

  function changeSettings(patch) {
    TT.app.saveVocab(D.setSettings(TT.app.vocab, patch, Date.now()));
  }

  // Gerät ohne Karten, Cloud-Stand noch nicht da: nichts zum Lernen anbieten, sonst würde ein
  // frischer Stand neben den Lernstand aus der Cloud geschrieben.
  const waitingForCloud = () => Object.keys(TT.app.vocab.cards).length === 0 && !TT.sync.joinsReady();

  // Hinweiskarte „Lernstand wird geladen …“; update() passt den Text an den Verbindungsstatus an.
  function loadingCard() {
    const text = h('p.muted');
    const update = () => {
      text.textContent = TT.sync.status() === 'offline'
        ? 'Keine Verbindung – dein Lernstand wird geladen, sobald die Verbindung steht.'
        : 'Einen Moment, gleich geht es weiter.';
    };
    update();
    return { el: h('div.card', { role: 'status' }, h('h2', null, 'Lernstand wird geladen …'), text), update };
  }

  // Wartet, bis der Lernstand da ist, dann onReady() aufrufen. Liefert die Aufräumfunktion (abmelden).
  function whenCloudReady(card, onReady) {
    return TT.sync.onStatus(() => {
      if (TT.sync.joinsReady()) onReady();
      else card.update();
    });
  }

  // Niveau-Bezeichnung: neue Buchwörter heißen „StartUp 6“ statt „SU6“
  const levelLabel = (e) => (e.level === TT.BOOK_LEVEL ? (TT.BOOK_SU6 ? TT.BOOK_SU6.title : e.level) : e.level);

  // „Wo bin ich im Buch?“ – Schalter, Unit und Lesson; gemeinsam für Vokabeln und Unterricht.
  function bookPicker() {
    const app = TT.app;
    const B = TT.BOOK_SU6;
    if (!B) return null;
    // Erst wenn die Stelle aus der Cloud da ist, darf man sie ändern (sonst würde ein alter Stand sie überschreiben)
    if (!TT.sync.joinsReady()) {
      return ui.group(B.title + ' · wo bist du im Buch?', [ui.row({ title: 'Wird geladen …', subtitle: 'Deine Stelle im Buch kommt gleich aus der Cloud.' })]);
    }
    const b = app.vocab.book;
    const set = (patch) => {
      app.saveVocab(D.setBook(app.vocab, patch, Date.now()));
      TT.router.refresh();
    };
    const option = (cur) => ([v, l]) => h('option', { value: String(v), selected: cur === v }, l);
    const unitSel = h('select', { 'aria-label': 'Unit' }, B.units.map((t, i) => [i + 1, 'Unit ' + (i + 1) + ' · ' + t]).map(option(b.unit)));
    const lessonSel = h('select', { 'aria-label': 'Lesson' },
      Array.from({ length: B.lessons }, (_, i) => [i + 1, i + 1 === 4 ? 'Lesson 4 · Lesetext' : 'Lesson ' + (i + 1)]).map(option(b.lesson)));
    // Neue Unit: bei Lesson 1 beginnen (sonst würde z. B. Lesson 4 gleich die ganze Unit freischalten)
    unitSel.addEventListener('change', () => set({ unit: Number(unitSel.value), lesson: 1 }));
    lessonSel.addEventListener('change', () => set({ lesson: Number(lessonSel.value) }));
    const on = h('label.row', null, h('span.row-main', null, h('span.row-title', null, 'Wörter aus dem Buch lernen')),
      ui.toggle(b.on, (v) => set({ on: v }), 'Wörter aus dem Buch lernen'));
    return ui.group(B.title + ' · wo bist du im Buch?', [on, b.on ? h('div.row.stack', null, unitSel, lessonSel) : null],
      { footer: 'Neue Wörter kommen zuerst aus dem Buch – bis einschließlich dieser Lesson, in Buchreihenfolge. Danach geht es wie eingestellt mit Oxford 3000 weiter. Schon begonnene Buchwörter werden immer weiter wiederholt.' });
  }

  function overview() {
    const app = TT.app;
    const entries = TT.vocabEntries();
    if (!entries.length) return ui.page(ui.header('Vokabeln'), h('p.muted', null, 'Noch keine Vokabeln vorhanden.'));
    const now = Date.now();
    const p = D.plan(app.vocab, entries, now);
    const c = p.counts;
    const todo = c.review + c.fresh + c.learning;
    const st = D.stats(app.vocab, entries, now);
    const learned = TT.VOCAB_LEVELS.concat(TT.BOOK_LEVEL).reduce((s, lv) => s + (st.levels[lv] ? st.levels[lv].learned : 0), 0);
    const book = app.vocab.book;
    const anyLevel = TT.VOCAB_LEVELS.some((lv) => app.vocab.settings.levels[lv]) || (book.on && st.book.total > 0);
    const waiting = waitingForCloud();
    const card = waiting ? loadingCard() : null;
    const tile = (n, label) => h('div.stat-tile', null, h('b', null, String(n)), h('span', null, label));
    const gear = h('a.icon-btn', { href: '#/vokabeln/einstellungen', 'aria-label': 'Vokabel-Einstellungen' }, ui.icon('gear'));

    let doneText = 'Neue Wörter gibt es morgen wieder.';
    if (!anyLevel) doneText = 'Schalte in den Einstellungen ein Niveau oder die Wörter aus dem Buch ein.';
    else if (!TT.VOCAB_LEVELS.some((lv) => app.vocab.settings.levels[lv]) && !p.nextDue && st.book.reached === st.book.learned) {
      doneText = 'Alle Buchwörter bis ' + TT.bookPlace(book.unit, book.lesson) + ' sind gelernt. Stelle im Buch weiterrücken oder ein Niveau einschalten.';
    }
    else if (p.nextDue) {
      const days = D.dayOf(p.nextDue) - D.dayOf(now);
      doneText = 'Nächste Wiederholung ' + (days <= 1 ? 'morgen' : 'in ' + days + ' Tagen') + '.';
    } else if (app.vocab.settings.newPerDay === 0) doneText = 'Keine Wiederholungen fällig. Neue Wörter sind ausgeschaltet (0 pro Tag).';

    const page = ui.page(
      ui.header('Vokabeln', { right: gear, subtitle: waiting ? null : learned + ' von ' + entries.length + ' Wörtern gelernt' }),
      // Beim Warten keine Einstellung anbieten – sie würde die Einstellungen aus der Cloud überschreiben
      waiting ? null : h('div.vocab-dir', null, ui.segmented(DIR_OPTS, app.vocab.settings.direction, (v) => {
        changeSettings({ direction: v });
        TT.router.refresh();
      })),
      waiting ? null : h('div.stat-tiles', null, tile(c.review, 'fällig'), tile(c.fresh, 'neu heute'), tile(c.learning, 'in Lernschritten')),
      waiting ? card.el : todo
        ? h('div.card.hero', null, h('h2', null, 'Lernen'), h('p', null, ui.plural(todo, 'Karte', 'Karten') + ' für heute'),
          ui.button(app.vocabSession ? 'Weiterlernen' : 'Lernen starten', { onclick: () => TT.router.go('/vokabeln/lernen') }))
        : h('div.card', null, h('h2', null, 'Für heute fertig'), h('p.muted', null, doneText)),
      ui.group(null, [
        st.book.total && !waiting ? ui.row({
          title: TT.BOOK_SU6.title,
          subtitle: book.on ? TT.bookPlace(book.unit, book.lesson) + ' · ' + st.book.reachedLearned + ' von ' + st.book.reached + ' Wörtern gelernt' : 'Buch-Wortschatz ausgeschaltet',
          href: '#/vokabeln/einstellungen',
        }) : null,
        ui.row({ title: 'Wortliste', subtitle: 'Suchen, bearbeiten, aussetzen', href: '#/vokabeln/liste' }),
        ui.row({ title: 'Einstellungen', subtitle: ui.plural(app.vocab.settings.newPerDay, 'neues Wort', 'neue Wörter') + ' pro Tag', href: '#/vokabeln/einstellungen' }),
        ui.row({ title: 'Statistik', subtitle: 'Gelernte Wörter, fällige Karten', href: '#/statistik' }),
      ]));
    return waiting ? { el: page, cleanup: whenCloudReady(card, () => TT.router.refresh()) } : page;
  }

  function settings() {
    const page = settingsPage();
    // Die Seite wird beim Abgleich nicht neu gezeichnet: sobald die Cloud-Daten da sind, einmal aktualisieren
    return TT.sync.joinsReady() ? page : { el: page, cleanup: TT.sync.onStatus(() => { if (TT.sync.joinsReady()) TT.router.refresh(); }) };
  }

  function settingsPage() {
    const app = TT.app;
    const s = app.vocab.settings;
    const input = h('input.field', { type: 'number', inputmode: 'numeric', min: '0', step: '1', 'aria-label': 'Neue Wörter pro Tag' });
    input.value = String(s.newPerDay);
    input.addEventListener('change', () => {
      const v = input.value.trim();
      if (!/^\d+$/.test(v) || Number(v) > 1e9) {
        ui.toast('Bitte eine ganze Zahl ab 0 eingeben');
        input.value = String(app.vocab.settings.newPerDay);
        return;
      }
      changeSettings({ newPerDay: Number(v) });
      ui.toast('Gespeichert');
    });
    const levelRow = (lv) => h('label.row', null,
      h('span.row-main', null, h('span.row-title', null, 'Niveau ' + lv)),
      ui.toggle(s.levels[lv], (on) => changeSettings({ levels: Object.assign({}, app.vocab.settings.levels, { [lv]: on }) }), 'Niveau ' + lv));

    return ui.page(
      ui.header('Vokabel-Einstellungen', { back: '#/vokabeln', backLabel: 'Vokabeln' }),
      bookPicker(),
      ui.group('Richtung', [h('div.row', null, ui.segmented(DIR_OPTS, s.direction, (v) => changeSettings({ direction: v })))],
        { footer: 'Bei „Beide“ hat jedes Wort zwei Karten mit eigenem Lernstand.' }),
      ui.group('Neue Wörter pro Tag', [h('div.row', null, input)],
        { footer: 'Jede ganze Zahl ab 0. Fällige Wiederholungen kommen immer dazu.' }),
      ui.group('Niveaus', TT.VOCAB_LEVELS.map(levelRow), { footer: 'Ausgeschaltete Niveaus werden weder neu gelernt noch wiederholt.' }),
      ui.group('Reihenfolge neuer Wörter', [h('div.row', null, ui.segmented([['level', 'Nach Niveau'], ['mixed', 'Gemischt']], s.order, (v) => changeSettings({ order: v })))],
        { footer: 'Nach Niveau: erst alle A1-Wörter, dann A2 und so weiter. Gemischt: alle eingeschalteten Niveaus durcheinander.' }));
  }

  TT.vocabScreens = Object.assign(TT.vocabScreens || {}, { waitingForCloud, loadingCard, whenCloudReady, bookPicker, levelLabel });

  TT.screens.vocab = {
    render(param) {
      if (param === 'lernen') return TT.vocabScreens.run();
      if (param === 'liste') return TT.vocabScreens.list();
      if (param === 'einstellungen') return settings();
      if (param && param.startsWith('wort/')) return TT.vocabScreens.word(param.slice(5));
      return overview();
    },
  };
})(globalThis.TT = globalThis.TT || {});
