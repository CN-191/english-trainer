(function (TT) {
  'use strict';

  const { h, ui } = TT;

  // „allen 39 Zeitformen und Themen“ oder „20 von 39 …“
  function dailyText() {
    const all = TT.daily.topics();
    const on = TT.daily.enabled(TT.app.state).length;
    return on === all.length ? 'allen ' + all.length + ' Zeitformen und Themen' : on + ' von ' + all.length + ' Zeitformen und Themen';
  }

  TT.screens.start = {
    render() {
      const app = TT.app;
      const st = app.state;
      const now = new Date();
      const due = TT.progress.dueReviews(st, now).length;
      const today = st.days[TT.progress.dayKey(now)] || 0;
      const streak = TT.progress.streak(st, now);

      const gear = h('a.icon-btn', { href: '#/einstellungen', 'aria-label': 'Einstellungen' }, ui.icon('gear'));
      const subtitle = streak
        ? `${streak} ${streak === 1 ? 'Tag' : 'Tage'} in Folge · heute ${ui.plural(today, 'Aufgabe', 'Aufgaben')}`
        : 'Heute ist ein guter Tag zum Üben.';
      const grid = ui.tenseGrid((t) => {
        const m = TT.progress.mastery(st, t.id);
        return {
          onclick: () => TT.router.go('/grammatik/' + t.id),
          sub: m.isNew ? 'neu' : Math.round(m.value * 100) + ' %',
          extra: ui.bar(m.value),
        };
      });

      return ui.page(
        ui.header('Zeitformen', { right: gear, subtitle }),
        app.session
          ? ui.group(null, [ui.row({
            title: 'Training fortsetzen',
            subtitle: 'Aufgabe ' + Math.min(app.session.index + 1, app.session.tasks.length) + ' von ' + app.session.tasks.length,
            href: '#/training',
          })])
          : null,
        h('div.card.hero', null,
          h('h2', null, 'Tägliches Training'),
          h('p', null, '15 gemischte Aufgaben aus ' + dailyText() + (due ? ` · ${due} Wiederholung${due === 1 ? '' : 'en'} fällig` : '')),
          h('div.btn-row', null,
            ui.button('Training starten', { onclick: () => app.startSession({ mode: 'daily' }) || ui.toast('Schalte unter „Auswahl“ mindestens ein Thema ein.') }),
            h('a.btn.btn-secondary', { href: '#/grammatik/training' }, 'Auswahl'))),
        ui.group('Dein Lernstand', [h('div.card.grid-card', null, grid)], { plain: true, footer: 'Tippe auf eine Zeitform für Regeln und Beispiele.' }),
        ui.group('Mehr üben', [
          ui.row({
            title: 'Fehlerkiste', subtitle: due ? `${due} fällig` : 'Gerade nichts fällig',
            onclick: () => app.startSession({ mode: 'review' }) || ui.toast('Gerade ist nichts fällig.'),
          }),
          ui.row({ title: 'Duell', subtitle: 'Zwei Zeitformen gegeneinander', href: '#/ueben' }),
          ui.row({ title: 'Geschichten', subtitle: 'Lückentexte mit gemischten Zeitformen', href: '#/geschichten' }),
          ui.row({ title: 'Freies Üben', subtitle: 'Zeitformen und Übungen selbst wählen', href: '#/ueben' }),
        ])
      );
    },
  };
})(globalThis.TT = globalThis.TT || {});
