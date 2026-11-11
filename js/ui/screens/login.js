(function (TT) {
  'use strict';

  // Anmeldeseite der Web-Version. Gibt es noch kein Konto, legt die erste Person hier das Verwalter-Konto an;
  // danach vergibt der Verwalter die Konten in den Einstellungen.

  const { h, ui } = TT;

  const field = (label, attrs) => {
    const input = h('input.field', Object.assign({ autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false' }, attrs));
    return { input, el: h('label.field-label', null, h('span', null, label), input) };
  };

  function loginForm(onDone, note) {
    const user = field('Nutzername', { type: 'text', name: 'username', autocomplete: 'username', required: true });
    const pass = field('Passwort', { type: 'password', name: 'password', autocomplete: 'current-password', required: true });
    const msg = h('p.form-msg', { role: 'alert' });
    const btn = h('button.btn.btn-primary', { type: 'submit' }, 'Anmelden');
    const form = h('form.card.login-card', { novalidate: true }, note ? h('p.login-note', null, note) : null, user.el, pass.el, msg, h('div.actions', null, btn));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.textContent = '';
      btn.disabled = true;
      try {
        await TT.cloud.login(user.input.value, pass.input.value);
        onDone();
      } catch (er) {
        msg.textContent = er.code === 'unavailable' ? 'Keine Verbindung. Bitte später noch einmal versuchen.' : er.message;
        btn.disabled = false;
      }
    });
    return { el: form, focus: () => user.input.focus() };
  }

  function firstAccountForm(onDone, onExists) {
    const user = field('Nutzername', { type: 'text', name: 'username', autocomplete: 'username', required: true });
    const pass = field('Passwort (mindestens 8 Zeichen)', { type: 'password', name: 'new-password', autocomplete: 'new-password', required: true });
    const pass2 = field('Passwort wiederholen', { type: 'password', name: 'new-password-2', autocomplete: 'new-password', required: true });
    const msg = h('p.form-msg', { role: 'alert' });
    const btn = h('button.btn.btn-primary', { type: 'submit' }, 'Konto anlegen');
    const form = h('form.card.login-card', { novalidate: true },
      h('p.login-note', null, 'Es gibt noch kein Konto. Das erste Konto verwaltet später die anderen: Nur damit lassen sich weitere Nutzer anlegen.'),
      user.el, pass.el, pass2.el, msg, h('div.actions', null, btn));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.textContent = '';
      if (pass.input.value !== pass2.input.value) {
        msg.textContent = 'Die beiden Passwörter sind verschieden.';
        return;
      }
      btn.disabled = true;
      try {
        await TT.cloud.bootstrap(user.input.value, pass.input.value);
      } catch (er) {
        // 409: Es gibt inzwischen ein Konto (z. B. ein zweiter Versuch nach einer Störung) → zur Anmeldung
        if (er.status === 409) return onExists(er.message);
        msg.textContent = er.code === 'unavailable' ? 'Keine Verbindung. Bitte später noch einmal versuchen.' : er.message;
        btn.disabled = false;
        return;
      }
      try {
        await TT.cloud.login(user.input.value, pass.input.value);
        onDone();
      } catch (er) {
        onExists('Das Konto ist angelegt. Bitte melde dich jetzt an.');
      }
    });
    return { el: form, focus: () => user.input.focus() };
  }

  TT.screens.login = {
    // Ersetzt die ganze App, bis jemand angemeldet ist; danach lädt die Seite mit dem Lernstand des Kontos neu.
    mount(appEl, tabEl) {
      if (tabEl) tabEl.hidden = true;
      document.body.classList.add('no-tabs');
      const done = () => {
        location.hash = '#/start';
        location.reload();
      };
      const slot = h('div');
      const show = (form) => {
        slot.replaceChildren(form.el);
        form.focus();
      };
      appEl.replaceChildren(ui.page(
        ui.header('English Trainer', { subtitle: 'Melde dich an. Dein Lernstand gehört zu deinem Konto und ist auf jedem Gerät gleich.' }),
        slot));
      show(loginForm(done));
      // Meldet sich in einem anderen Tab jemand an, gilt das auch hier: neu laden
      TT.cloud.onSignedOut(() => location.reload());
      // Nur wenn es noch gar kein Konto gibt, erscheint stattdessen „Erstes Konto anlegen“.
      TT.cloud.status().then((s) => {
        if (s && s.hasUsers === false && !TT.cloud.session()) show(firstAccountForm(done, (note) => show(loginForm(done, note))));
      }, () => { /* offline: Anmeldung meldet es selbst */ });
    },
  };
})(globalThis.TT = globalThis.TT || {});
