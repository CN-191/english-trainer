(function (TT) {
  'use strict';

  // Web-Version: „Konto“ in den Einstellungen (Passwort ändern, abmelden) und die Kontenverwaltung des Verwalters.

  const { h, ui } = TT;

  const input = (label, attrs) => {
    const el = h('input.field', Object.assign({ autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', 'aria-label': label, placeholder: label }, attrs));
    return el;
  };
  const say = (e) => ui.toast(e && e.code === 'unavailable' ? 'Keine Verbindung. Bitte später noch einmal versuchen.' : (e && e.message) || 'Das hat nicht geklappt.');

  // Vor dem Abmelden alles hochladen, was noch wartet (höchstens ein paar Sekunden).
  // Gelöscht wird auf dem Gerät nie etwas: Was nicht mehr hochgeladen werden konnte, bleibt im Zwischenspeicher
  // dieses Kontos und geht bei der nächsten Anmeldung auf diesem Gerät in die Cloud.
  async function uploadPending(maxMs) {
    const end = Date.now() + maxMs;
    while (TT.sync.pending() && Date.now() < end) {
      TT.sync.flush();
      await new Promise((r) => setTimeout(r, 300));
    }
    return !TT.sync.pending();
  }

  function group() {
    const user = TT.cloud.user();
    if (!user) return null;
    const cur = input('Aktuelles Passwort', { type: 'password', autocomplete: 'current-password' });
    const next = input('Neues Passwort (min. 8 Zeichen)', { type: 'password', autocomplete: 'new-password' });
    const save = ui.button('Passwort ändern', { kind: 'secondary' });
    save.addEventListener('click', async () => {
      if (!cur.value || !next.value) {
        ui.toast('Bitte beide Felder ausfüllen');
        return;
      }
      save.disabled = true;
      try {
        await TT.cloud.changePassword(cur.value, next.value);
        cur.value = '';
        next.value = '';
        ui.toast('Passwort geändert');
      } catch (e) {
        say(e);
      }
      save.disabled = false;
    });

    let leaving = false;
    const out = ui.row({
      title: 'Abmelden', noChevron: true,
      onclick: async () => {
        if (leaving) return;
        leaving = true;
        out.querySelector('.row-title').textContent = 'Speichere und melde ab …';
        const done = await uploadPending(6000);
        if (!done) ui.toast('Ein Teil wird beim nächsten Anmelden auf diesem Gerät hochgeladen.');
        await TT.cloud.logout();
        setTimeout(() => {
          location.hash = '#/start';
          location.reload();
        }, done ? 0 : 1800);
      },
    });

    return ui.group('Konto', [
      ui.row({ title: user.username, subtitle: user.admin ? 'Angemeldet · Verwalter' : 'Angemeldet' }),
      user.admin ? ui.row({ href: '#/einstellungen/konten', title: 'Konten verwalten', subtitle: 'Nutzer anlegen, Passwort neu setzen' }) : null,
      h('div.row.stack', null, cur, next, save),
      out,
    ]);
  }

  // Kontenverwaltung (nur Verwalter; der Server prüft das bei jeder Anfrage selbst)
  function page() {
    const me = TT.cloud.user();
    const list = h('div');
    const name = input('Nutzername', { type: 'text', autocomplete: 'off' });
    const pass = input('Startpasswort (min. 8 Zeichen)', { type: 'text', autocomplete: 'off' });
    const add = ui.button('Konto anlegen');

    const draw = (users) => {
      if (!users.length) {
        list.replaceChildren(ui.row({ title: 'Noch keine Konten' }));
        return;
      }
      list.replaceChildren(...users.map((u) => {
        const self = me && u.username === me.username;
        const newPass = input('Neues Passwort für ' + u.username, { type: 'text', autocomplete: 'off' });
        const set = ui.button('Passwort setzen', { kind: 'secondary', small: true });
        set.addEventListener('click', async () => {
          set.disabled = true;
          try {
            await TT.cloud.accounts('reset', { username: u.username, password: newPass.value });
            newPass.value = '';
            ui.toast('Passwort für ' + u.username + ' gesetzt');
          } catch (e) {
            say(e);
          }
          set.disabled = false;
        });
        const del = self ? null : ui.confirmTap(ui.button('Konto löschen', { kind: 'plain', small: true }), 'Wirklich löschen? Der Lernstand ist dann weg.', async () => {
          try {
            await TT.cloud.accounts('delete', { username: u.username });
            ui.toast('Konto ' + u.username + ' gelöscht');
            load();
          } catch (e) {
            say(e);
          }
        });
        return h('div.row.stack.account-row', null,
          h('span.row-title', null, u.username, u.is_admin ? h('span.level-tag.account-tag', null, 'Verwalter') : null, self ? h('span.row-sub', null, ' (du)') : null),
          self ? h('span.row-sub', null, 'Dein eigenes Passwort änderst du in den Einstellungen.') : h('div.account-tools', null, newPass, h('div.btn-row', null, set, del)));
      }));
    };

    const load = async () => {
      try {
        const r = await TT.cloud.accounts('list');
        draw(Array.isArray(r.users) ? r.users : []);
      } catch (e) {
        list.replaceChildren(ui.row({ title: e.code === 'unavailable' ? 'Keine Verbindung' : e.message }));
      }
    };

    add.addEventListener('click', async () => {
      add.disabled = true;
      try {
        const r = await TT.cloud.accounts('create', { username: name.value.trim().toLowerCase(), password: pass.value });
        ui.toast('Konto ' + r.user.username + ' angelegt');
        name.value = '';
        pass.value = '';
        load();
      } catch (e) {
        say(e);
      }
      add.disabled = false;
    });

    list.replaceChildren(ui.row({ title: 'Wird geladen …' }));
    load();
    return ui.page(
      ui.header('Konten verwalten', { back: '#/einstellungen', backLabel: 'Einstellungen', subtitle: 'Jede Person bekommt einen Nutzernamen und ein Passwort und hat ihren eigenen Lernstand.' }),
      ui.group('Neues Konto', [h('div.row.stack', null, name, pass, add)],
        { footer: 'Gib Nutzername und Startpasswort persönlich weiter. Das Passwort kann jede Person danach in den Einstellungen selbst ändern.' }),
      ui.group('Konten', [list]));
  }

  TT.accountUi = { group, page };
})(globalThis.TT = globalThis.TT || {});
