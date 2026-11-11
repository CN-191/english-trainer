(function (TT) {
  'use strict';

  const { h, ui } = TT;

  TT.screens.settings = {
    render(param) {
      const web = !!(TT.cloud && TT.cloud.enabled && TT.accountUi);
      if (web && param === 'konten' && TT.cloud.user() && TT.cloud.user().admin) return TT.accountUi.page();
      const app = TT.app;
      const st = app.state;
      const exportBox = h('textarea.code', { readonly: true, rows: 3, 'aria-label': 'Fortschritts-Code' });
      const importBox = h('textarea.code', { rows: 3, placeholder: 'Fortschritts-Code hier einfügen', 'aria-label': 'Fortschritts-Code einfügen' });

      const copy = async () => {
        exportBox.value = app.exportText();
        exportBox.select();
        try {
          await navigator.clipboard.writeText(exportBox.value);
          ui.toast('Code kopiert');
        } catch (e) {
          ui.toast('Code markiert – bitte manuell kopieren');
        }
      };
      const pasteCheck = () => {
        try {
          TT.store.importText(importBox.value);
          return true;
        } catch (e) {
          ui.toast(e.message);
          return false;
        }
      };
      const paste = () => {
        try {
          app.importText(importBox.value);
          app.applyTheme();
          ui.toast('Fortschritt übernommen');
          TT.router.refresh();
        } catch (e) {
          ui.toast(e.message);
        }
      };
      const reset = () => {
        app.state = TT.store.defaults();
        app.save();
        app.applyTheme();
        ui.toast('Fortschritt gelöscht');
        TT.router.refresh();
      };

      const syncRow = h('div');
      const syncFooter = h('p.group-footer');
      const showSync = (s) => {
        const [title, footer] = (web && WEB_TEXT[s]) || SYNC_TEXT[s] || SYNC_TEXT.off;
        syncRow.replaceChildren(ui.row({ title, right: s === 'synced' ? '✓' : null }));
        syncFooter.textContent = footer;
      };
      showSync(TT.sync.status());
      const stopSync = TT.sync.onStatus(showSync);
      const syncGroup = ui.group('Synchronisierung', [syncRow]);
      syncGroup.appendChild(syncFooter);

      const el = ui.page(
        ui.header('Einstellungen', { back: '#/start', backLabel: 'Start' }),
        web ? TT.accountUi.group() : null,
        syncGroup,
        ui.group('Darstellung', [
          h('div.row', null, ui.segmented([['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']], st.settings.theme, (v) => {
            app.state.settings.theme = v;
            app.applyTheme();
            app.save();
          })),
        ]),
        ui.group('Eingabe', [
          h('div.row', null, ui.segmented([['type', 'Tippen'], ['choice', 'Auswahl']], st.settings.inputMode, (v) => {
            app.state.settings.inputMode = v;
            app.save();
          })),
        ], { footer: 'Tippen trainiert am meisten. Auswahl ist praktisch am Handy.' }),
        ui.group('Fortschritt übertragen', [
          h('div.row.stack', null, ui.button('Code kopieren', { kind: 'secondary', onclick: copy }), exportBox),
          h('div.row.stack', null, importBox, ui.confirmTap(ui.button('Code übernehmen', { kind: 'secondary' }), 'Zeitformen und Unterricht ersetzen, Vokabeln zusammenführen?', paste, { before: pasteCheck })),
        ], { footer: web ? 'Mit dem Code überträgst du Fortschritt von Hand, z. B. aus dem claude.ai-Link in dieses Konto: dort „Code kopieren“, hier einfügen und übernehmen.' : 'Mit dem Code überträgst du Fortschritt von Hand, z. B. aus der Datei-Version in den claude.ai-Link.' }),
        ui.group(null, [ui.confirmTap(ui.row({ title: 'Zeitformen- und Unterrichts-Fortschritt zurücksetzen', onclick: () => {}, noChevron: true, danger: true }), 'Wirklich alles löschen?', reset)]),
        TT.store.available || !['local', 'off'].includes(TT.sync.status()) ? null : h('p.notice', null, 'Dieser Browser erlaubt kein Speichern. Der Fortschritt geht beim Schließen verloren.')
      );
      return { el, cleanup: stopSync };
    },
  };

  // Texte der Web-Version (Konto mit Nutzername und Passwort)
  const WEB_TEXT = {
    synced: ['Synchronisiert', 'Dein Fortschritt liegt in deinem Konto und ist auf jedem Gerät gleich, auf dem du dich anmeldest.'],
    connecting: ['Verbinde …', 'Dein Fortschritt wird mit deinem Konto abgeglichen.'],
    error: ['Synchronisierung unterbrochen', 'Lade die Seite neu, um es noch einmal zu versuchen. Dein Fortschritt bleibt auf diesem Gerät erhalten.'],
    off: ['Nur auf diesem Gerät', 'Der Fortschritt konnte nicht mit deinem Konto verbunden werden. Lade die Seite neu.'],
  };

  const SYNC_TEXT = {
    synced: ['Synchronisiert', 'Dein Fortschritt liegt in deinem claude.ai-Konto und ist auf jedem Gerät gleich, auf dem du diesen Link öffnest.'],
    connecting: ['Verbinde …', 'Dein Fortschritt wird mit deinem claude.ai-Konto abgeglichen.'],
    offline: ['Keine Verbindung', 'Dein Fortschritt bleibt erst einmal auf diesem Gerät und wird übertragen, sobald die Verbindung wieder steht.'],
    error: ['Synchronisierung unterbrochen', 'Lade die Seite neu, um es noch einmal zu versuchen.'],
    off: ['Nur auf diesem Gerät', 'Melde dich bei claude.ai an, damit dein Fortschritt auf allen Geräten gleich ist.'],
    local: ['Nur auf diesem Gerät', 'Die Datei-Version kann nicht synchronisieren. Öffne den claude.ai-Link, dann ist dein Fortschritt auf PC und Handy gleich.'],
  };
})(globalThis.TT = globalThis.TT || {});
