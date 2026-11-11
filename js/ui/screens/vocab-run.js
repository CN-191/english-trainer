(function (TT) {
  'use strict';

  const { h, ui } = TT;
  const D = TT.deck;
  const RATINGS = [[1, 'Nochmal', 'again'], [2, 'Schwer', 'hard'], [3, 'Gut', 'good'], [4, 'Einfach', 'easy']];

  // Beispielsatz mit hervorgehobenem Lernwort
  function exSentence(entry) {
    if (!entry.ex) return null; // eigene Wörter dürfen ohne Beispielsatz sein
    return h('p.flash-ex', { lang: 'en' },TT.vocabText.split(entry.ex, entry).map((p) => (p.t === 'word' ? h('mark', null, p.v) : p.v)));
  }

  function meta(entry, dir) {
    return h('div.flash-meta', null,
      h('span.level', null, TT.vocabScreens.levelLabel(entry)),
      entry.book ? h('span', null, 'Unit ' + entry.book.u + ' · L' + entry.book.l) : null,
      entry.pos ? h('span', null, TT.vocabPosLabel(entry.pos)) : null,
      h('span', null, dir === 'ed' ? 'Englisch → Deutsch' : 'Deutsch → Englisch'));
  }

  // EN→DE: vorne Wort, Wortart, Beispielsatz, Emoji, Niveau; hinten Übersetzung und Satzübersetzung.
  // DE→EN: vorne deutsches Wort (+ Hinweis), Wortart, Emoji, Niveau; hinten englisches Wort und Satz.
  function front(entry, dir) {
    const out = [meta(entry, dir), entry.emoji ? h('div.flash-emoji', { 'aria-hidden': 'true' }, entry.emoji) : null];
    if (dir === 'ed') out.push(h('p.flash-word', { lang: 'en' }, entry.en), exSentence(entry));
    else out.push(h('p.flash-word', { lang: 'de' }, entry.de), entry.hint ? h('p.flash-hint', null, '(' + entry.hint + ')') : null);
    return out;
  }

  // Buchwörter zeigen zusätzlich die englische Definition
  function back(entry, dir) {
    const def = entry.def ? h('p.flash-def', { lang: 'en' }, entry.def) : null;
    if (dir === 'ed') return [h('div.flash-sep'), h('p.flash-answer', { lang: 'de' }, entry.de), def, entry.exDe ? h('p.flash-exde', { lang: 'de' }, entry.exDe) : null];
    return [h('div.flash-sep'), h('p.flash-answer', { lang: 'en' }, entry.en), def, exSentence(entry)];
  }

  function run() {
    const app = TT.app;
    const V = TT.vocabScreens;
    // Leeres Gerät, Cloud-Stand noch nicht da: erst warten, dann normal starten.
    if (V.waitingForCloud()) {
      const card = V.loadingCard();
      return {
        el: ui.page(ui.header('Lernen', { back: '#/vokabeln', backLabel: 'Vokabeln' }), card.el),
        cleanup: V.whenCloudReady(card, () => TT.router.refresh()),
      };
    }
    const S = app.vocabSession || (app.vocabSession = { shown: 0, done: 0, undo: null });
    S.editing = null; // zurück in der Lernrunde: die Wortseite gehört nicht mehr dazu
    const count = h('span.ex-count');
    const body = h('div');
    let current = null; // {base, entry, dir, isNew}
    let revealed = false;

    function leave() {
      app.vocabSession = null;
      TT.router.go('/vokabeln');
    }

    const close = h('button.icon-btn', { type: 'button', 'aria-label': 'Lernrunde beenden', onclick: leave }, ui.icon('close'));
    const undoBtn = h('button.icon-btn', { type: 'button', 'aria-label': 'Letzte Bewertung zurücknehmen', onclick: undo }, ui.icon('undo'));

    function setCurrent(base, dir) {
      current = { base, entry: D.view(app.vocab, base), dir, isNew: D.cardOf(app.vocab, base.id, dir).state === TT.fsrs.NEW };
      revealed = false;
      render();
    }

    function updateCount(plan) {
      const c = plan.counts;
      count.textContent = ui.plural(c.review + c.fresh + c.learning, 'Karte', 'Karten') + ' übrig';
    }

    function show() {
      const now = Date.now();
      const { item, plan } = D.pick(app.vocab, TT.vocabEntries(), now, S.shown);
      undoBtn.disabled = !S.undo;
      updateCount(plan);
      if (!item) return finished();
      setCurrent(item.entry, item.dir);
    }

    // Fokus auf das wichtigste Bedienelement, ohne zu scrollen (beim ersten Aufbau hängt die Seite noch nicht im Dokument)
    function focusFirst(el) {
      if (!el) return;
      if (el.isConnected) el.focus({ preventScroll: true });
      else queueMicrotask(() => { if (el.isConnected) el.focus({ preventScroll: true }); });
    }

    function render() {
      const { entry, dir } = current;
      const row = revealed ? rateRow() : h('div.actions', null, ui.button('Aufdecken', { onclick: reveal }));
      // replaceChildren würde null als Text „null“ einfügen – deshalb nur vorhandene Teile übergeben
      body.replaceChildren(...[
        h('section.flash', { 'aria-live': 'polite' }, front(entry, dir), revealed ? back(entry, dir) : null),
        row,
        revealed ? tools() : null].filter(Boolean));
      // Nach dem Aufdecken „Gut“ vorwählen wie in Anki – ein versehentliches zweites Enter wertet nicht als „Nochmal“
      focusFirst(row.querySelector(revealed ? '.rate-btn.good' : 'button'));
    }

    function rateRow() {
      const labels = D.preview(app.vocab, current.base, current.dir, Date.now());
      return h('div.rate', null, RATINGS.map(([g, label, cls], i) =>
        h('button.rate-btn.' + cls, { type: 'button', onclick: () => rate(g), 'aria-label': label + ', wieder in ' + labels[i] },
          label, h('small', null, labels[i]))));
    }

    function tools() {
      const t = h('div.flash-tools');
      t.appendChild(ui.button('Bearbeiten', { kind: 'plain', small: true, onclick: () => {
        S.editing = current.base.id; // dann zeigt die Wortseite „Zurück zum Lernen“
        TT.router.go('/vokabeln/wort/' + encodeURIComponent(current.base.id));
      } }));
      if (current.isNew) t.appendChild(ui.button('Schon bekannt', { kind: 'plain', small: true, onclick: known }));
      t.appendChild(ui.confirmTap(ui.button('Aussetzen', { kind: 'plain', small: true }), 'Wirklich aussetzen?', suspend));
      return t;
    }

    function reveal() {
      revealed = true;
      render();
    }

    function rate(g) {
      const r = D.answer(app.vocab, current.base, current.dir, g, Date.now());
      S.undo = r.undo;
      S.shown++;
      S.done++;
      app.saveVocab(r.docs);
      show();
    }

    function undo() {
      if (!S.undo) return;
      const token = S.undo;
      app.saveVocab(D.undo(app.vocab, token, Date.now()));
      S.undo = null;
      S.shown = Math.max(0, S.shown - 1);
      S.done = Math.max(0, S.done - 1);
      ui.toast('Bewertung zurückgenommen');
      const [id, dir] = token.key.split(':');
      const base = TT.vocabEntry(id);
      undoBtn.disabled = true;
      updateCount(D.plan(app.vocab, TT.vocabEntries(), Date.now()));
      if (base) setCurrent(base, dir);
      else show();
    }

    function known() {
      app.saveVocab(D.markKnown(app.vocab, current.base, Date.now()));
      S.undo = null;
      ui.toast('Als bekannt eingeplant');
      show();
    }

    function suspend() {
      app.saveVocab(D.setSuspended(app.vocab, current.base.id, true, Date.now()));
      S.undo = null;
      ui.toast('Ausgesetzt – zurückholen in der Wortliste');
      show();
    }

    function finished() {
      current = null;
      const toOverview = ui.button('Zur Übersicht', { onclick: leave });
      body.replaceChildren(
        h('div.card', null, h('h2', null, 'Für heute fertig'),
          h('p.muted', null, S.done ? 'Du hast ' + ui.plural(S.done, 'Karte', 'Karten') + ' gelernt.' : 'Gerade steht nichts an.')),
        toOverview);
      focusFirst(toOverview);
    }

    // Leertaste/Enter deckt auf, 1–4 bewertet (nicht in Eingabefeldern, nicht mit Strg/Cmd/Alt, nicht bei gedrückt gehaltener Taste;
    // auf einem fokussierten Button oder Link gilt dessen eigene Tastenbedienung)
    function onKey(e) {
      if (!current || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        if (t instanceof HTMLButtonElement || t instanceof HTMLAnchorElement) return;
        e.preventDefault();
        reveal();
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        rate(Number(e.key));
      }
    }
    document.addEventListener('keydown', onKey);

    const page = ui.page(h('div.ex-top.vocab-top', null, close, count, undoBtn), body);
    show();
    return { el: page, cleanup: () => document.removeEventListener('keydown', onKey) };
  }

  TT.vocabScreens = Object.assign(TT.vocabScreens || {}, { run });
})(globalThis.TT = globalThis.TT || {});
