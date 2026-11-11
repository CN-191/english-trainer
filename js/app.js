(function (TT) {
  'use strict';

  const app = {
    state: TT.store.load(),
    vocab: TT.vocabStore.load(),
    session: null,
    vocabSession: null,
    lastSummary: null,
    save() {
      this.state.updatedAt = Date.now();
      TT.store.save(this.state);
      TT.sync.changed();
    },
    // Vokabel-Stand lokal speichern und die geänderten Cloud-Dokumente zum Hochladen vormerken.
    saveVocab(docs) {
      if (!TT.vocabStore.save(this.vocab) && !this.vocabSaveWarned) {
        this.vocabSaveWarned = true;
        TT.ui.toast('Vokabel-Fortschritt konnte auf diesem Gerät nicht gespeichert werden (Speicher voll?).');
      }
      if (docs.includes(TT.vocabStore.OWN_DOC)) this.refreshOwn();
      for (const name of docs) TT.sync.touch(name);
    },
    // Eigene Wörter des Lernstands in die Wortliste übernehmen (nach jeder Änderung daran)
    refreshOwn() {
      TT.setOwnVocab(TT.vocabStore.ownRows(this.vocab));
    },
    exportText() {
      return JSON.stringify(Object.assign({}, this.state, { vocab: this.vocab }));
    },
    // Übernimmt einen Fortschritts-Code: Zeitformen ersetzen, Vokabeln zusammenführen. Wirft bei ungültigem Code.
    importText(text) {
      const next = TT.store.importText(text);
      const raw = JSON.parse(String(text).trim());
      this.state = next;
      this.save();
      if (raw.vocab) {
        TT.vocabStore.mergeAll(this.vocab, raw.vocab);
        this.saveVocab(TT.vocabStore.DOCS);
        this.refreshOwn();
      }
    },
    applyTheme() {
      const t = this.state.settings.theme;
      if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
      else document.documentElement.removeAttribute('data-theme');
    },
    startSession(opts) {
      const tasks = TT.session.build(Object.assign({ state: this.state }, opts));
      if (!tasks.length) return false;
      this.session = {
        mode: opts.mode,
        tasks,
        index: 0,
        results: [],
        inputMode: this.state.settings.inputMode,
        duel: opts.mode === 'duel' ? opts.tenses.slice(0, 2) : null,
      };
      TT.router.go('/training');
      return true;
    },
  };
  TT.app = app;
  app.refreshOwn();

  // Jedes Vokabel-Dokument wird pro Eintrag zusammengeführt (siehe vocabStore.mergePart).
  function registerVocabSync() {
    for (const name of TT.vocabStore.DOCS) {
      TT.sync.joinDoc(name, {
        get: () => TT.vocabStore.part(app.vocab, name),
        apply: (obj) => {
          TT.vocabStore.applyPart(app.vocab, name, obj);
          TT.vocabStore.save(app.vocab);
          if (name === TT.vocabStore.OWN_DOC) app.refreshOwn();
        },
        merge: (a, b) => TT.vocabStore.mergePart(name, a, b),
      });
    }
  }

  function boot() {
    app.applyTheme();
    // Web-Version: ohne Anmeldung nur die Anmeldeseite (der Lernstand gehört zu einem Konto)
    if (TT.cloud && TT.cloud.enabled) {
      if (!TT.cloud.session()) {
        TT.screens.login.mount(document.getElementById('app'), document.getElementById('tabbar'));
        return;
      }
      // Sitzung abgelaufen oder Konto gelöscht: zurück zur Anmeldung (ungesicherte Änderungen bleiben im Zwischenspeicher)
      // Anderes Konto in einem zweiten Tab: sofort neu laden, damit sich keine Lernstände mischen.
      TT.cloud.onSignedOut((reason) => {
        if (reason === 'changed') {
          location.reload();
          return;
        }
        TT.ui.toast('Bitte melde dich neu an.');
        setTimeout(() => location.reload(), 1200);
      });
    }
    registerVocabSync();
    // Sync zuerst anstoßen: Der Status „verbindet“ gilt dann schon beim ersten Zeichnen (Vokabel-Übersicht wartet auf die Cloud).
    TT.sync.start(app);
    TT.router.start(document.getElementById('app'), document.getElementById('tabbar'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(globalThis.TT = globalThis.TT || {});
