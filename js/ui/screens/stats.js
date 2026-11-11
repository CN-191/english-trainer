(function (TT) {
  'use strict';

  const { h, ui } = TT;
  const P = TT.progress;
  const tile = (n, label) => h('div.stat-tile', null, h('b', null, String(n)), h('span', null, label));
  const fmt = (key) => key.slice(8, 10) + '.' + key.slice(5, 7) + '.';

  // Vokabeln: gelernte Wörter pro Niveau, heute, Trefferquote, fällige Karten der nächsten 7 Tage
  function vocabSection() {
    const entries = TT.vocabEntries();
    if (!entries.length) return null;
    const vs = TT.deck.stats(TT.app.vocab, entries, Date.now());
    const pl = ui.plural;
    const max = Math.max(1, ...vs.forecast);
    const day = (i) => (i === 0 ? 'heute' : '+' + i);
    const chart = h('div', null,
      h('div.forecast-axis', { 'aria-hidden': 'true' }, vs.forecast.map((n) => h('span', null, String(n)))),
      h('div.forecast', { 'aria-hidden': 'true' }, vs.forecast.map((n) => h('div', { style: { height: (n / max * 100) + '%' } }))),
      h('div.forecast-axis', { 'aria-hidden': 'true' }, vs.forecast.map((n, i) => h('span', null, day(i)))),
      h('ul.sr-only', null, vs.forecast.map((n, i) => h('li', null, (i === 0 ? 'heute' : i === 1 ? 'morgen' : 'in ' + i + ' Tagen') + ': ' + pl(n, 'Karte', 'Karten')))));
    return h('div', null,
      ui.group('Vokabeln', TT.VOCAB_LEVELS.map((lv) => {
        const l = vs.levels[lv];
        const pct = Math.round((l.learned / Math.max(1, l.total)) * 100);
        return ui.row({ title: 'Niveau ' + lv, subtitle: l.learned + ' von ' + l.total + ' Wörtern gelernt', right: (l.learned && !pct ? '<1' : pct) + ' %' });
      }).concat(vs.book.total ? [ui.row({
        title: TT.BOOK_SU6.title,
        subtitle: vs.book.learned + ' von ' + vs.book.total + ' Buchwörtern gelernt' +
          (TT.app.vocab.book.on ? ' · bis ' + TT.bookPlace(TT.app.vocab.book.unit, TT.app.vocab.book.lesson) + ': ' + vs.book.reachedLearned + ' von ' + vs.book.reached : ''),
        right: Math.round((vs.book.learned / vs.book.total) * 100) + ' %',
      })] : [], [
        ui.row({ title: 'Heute', subtitle: pl(vs.today.r, 'Wiederholung', 'Wiederholungen') + ' · ' + pl(vs.today.n + vs.today.n2, 'neue Karte', 'neue Karten') }),
        ui.row({ title: 'Trefferquote (30 Tage)', right: vs.retention === null ? '–' : Math.round(vs.retention * 100) + ' %' }),
      ]), { footer: 'Gelernt heißt: mindestens eine Richtung hat die Lernschritte hinter sich. Trefferquote: Wiederholungen, die nicht mit „Nochmal“ bewertet wurden.' }),
      ui.group('Fällige Vokabeln, nächste 7 Tage', [chart]),
      forecastGroup(entries));
  }

  // Prognose: wann sind alle Wörter eingeführt und sicher (Abstand ≥ 21 Tage, wie „ausgereift“ in Anki)?
  const MONTHS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
  function dateOf(day) {
    const d = new Date(TT.deck.dayStart(day));
    return d.getDate() + '. ' + MONTHS[d.getMonth()] + (d.getFullYear() === new Date().getFullYear() ? '' : ' ' + d.getFullYear());
  }
  function span(days) {
    if (days <= 0) return 'heute';
    if (days === 1) return 'morgen';
    if (days < 14) return 'in ' + days + ' Tagen';
    if (days < 70) return 'in ' + Math.round(days / 7) + ' Wochen';
    return 'in ' + Math.round(days / 30.4) + ' Monaten';
  }

  function forecastGroup(entries) {
    const app = TT.app;
    const now = Date.now();
    const today = TT.deck.dayOf(now);
    const f = TT.deck.forecastFinish(app.vocab, entries, now);
    const b = app.vocab.book;
    const label = {
      reached: TT.BOOK_SU6.title + ' bis ' + TT.bookPlace(b.unit, b.lesson),
      book: TT.BOOK_SU6.title + ' komplett',
      all: 'Alle eingeschalteten Wörter',
    };
    const reachedTotal = f.groups.find((g) => g.id === 'reached').total;
    const skip = (g) => !g.total ||
      (g.id === 'book' && (!b.on || (b.unit === 10 && b.lesson === 4))) || // Buch aus oder schon am Ende
      (g.id === 'all' && g.total === reachedTotal); // nur Buchwörter eingeschaltet
    const rows = f.groups.filter((g) => !skip(g)).map((g) => {
      const sure = g.mature + ' von ' + g.total + ' sicher';
      if (!g.remaining) {
        return ui.row({ title: label[g.id], subtitle: 'Alle Wörter eingeführt · ' + sure, right: g.mature === g.total ? '✓' : null });
      }
      if (g.matureDay === null) return ui.row({ title: label[g.id], subtitle: 'noch ' + g.remaining + ' neue Wörter · ' + sure, right: '–' });
      return ui.row({
        title: label[g.id],
        subtitle: 'Sicher ab ca. ' + dateOf(g.matureDay) + ' · noch ' + g.remaining + ' neu, alle gesehen bis ' + dateOf(g.seenDay) + ' · ' + sure,
        right: span(g.matureDay - today),
      });
    });
    if (!rows.length) return null;
    const fmtPace = (x) => (Math.round(x * 10) / 10).toString().replace('.', ',');
    const pace = f.setting === 0
      ? 'Neue Wörter pro Tag stehen auf 0, darum gibt es kein Datum.'
      : f.useActual
        ? 'Gerechnet mit deinem Tempo der letzten 14 Tage: Ø ' + fmtPace(f.pace) + ' neue Wörter pro Tag (eingestellt: ' + f.setting + ').'
        : 'Gerechnet mit ' + f.setting + ' neuen Wörtern pro Tag.';
    return ui.group('Prognose', rows, {
      footer: pace + ' „Sicher“ heißt: nächste Wiederholung erst in 21 Tagen oder später (wie „ausgereift“ in Anki). ' +
        'Das klappt ca. ' + f.matureDays + ' Tage nach dem ersten Lernen, wenn du täglich lernst und meist „Gut“ wählst. ' +
        (b.on ? '„Komplett“ setzt voraus, dass du im Buch rechtzeitig weiterrückst.' : ''),
    });
  }

  // Grammatik-Themen: je Kategorie geübte Themen und Ø Lernstand der geübten
  function bankSection(st) {
    const cats = (TT.GRAMMAR_CATS || []).filter((c) => TT.bankLessons(c.id).length);
    if (!cats.length) return null;
    return ui.group('Lernstand Grammatik-Themen', cats.map((c) => {
      const ms = TT.bankLessons(c.id).map((l) => TT.progress.mastery(st, l.id));
      const done = ms.filter((m) => m.count);
      const avg = done.length ? done.reduce((s, m) => s + m.value, 0) / done.length : null;
      return ui.row({
        href: '#/grammatik', title: c.title,
        subtitle: done.length + ' von ' + ui.plural(ms.length, 'Thema', 'Themen') + ' geübt',
        right: avg === null ? 'neu' : Math.round(avg * 100) + ' %',
      });
    }), { footer: 'Prozent: Durchschnitt der geübten Themen (letzte 20 Antworten je Thema).' });
  }

  TT.screens.stats = {
    render() {
      const st = TT.app.state;
      const now = new Date();
      const total = Object.values(st.days).reduce((s, n) => s + n, 0);
      const today = st.days[P.dayKey(now)] || 0;
      const days = P.lastDays(st, now, 14);
      const max = Math.max(1, ...days.map((d) => d.count));
      const byEx = P.statsByExercise(st);
      const exKeys = Object.keys(TT.ex.LABELS).filter((k) => byEx[k]);
      const top = P.topConfusions(st, 5);

      const pl = ui.plural;
      const chart = h('div.days-wrap', null,
        h('div.days-max', { 'aria-hidden': 'true' }, 'max. ' + max),
        h('div.days', { 'aria-hidden': 'true' },
          days.map((d) => h('div.day' + (d.count ? '' : '.empty'), {
            style: { height: (d.count / max * 100) + '%' },
            title: fmt(d.key) + ': ' + pl(d.count, 'Aufgabe', 'Aufgaben'),
          }))),
        h('ul.sr-only', null, days.map((d) => h('li', null, fmt(d.key) + ': ' + pl(d.count, 'Aufgabe', 'Aufgaben')))));

      return ui.page(
        ui.header('Statistik'),
        h('div.stat-tiles', null, tile(P.streak(st, now), P.streak(st, now) === 1 ? 'Tag in Folge' : 'Tage in Folge'), tile(today, today === 1 ? 'Aufgabe heute' : 'Aufgaben heute'), tile(total, total === 1 ? 'Aufgabe gesamt' : 'Aufgaben gesamt')),
        ui.group('Letzte 14 Tage', [chart, h('div.days-axis', null, h('span', null, fmt(days[0].key)), h('span', null, 'heute'))]),
        ui.group('Lernstand je Zeitform', TT.TENSES.map((t) => {
          const m = P.mastery(st, t.id);
          return ui.row({
            href: '#/grammatik/' + t.id, title: t.name, lead: h('span.dot.row-' + t.row),
            subtitle: m.count ? pl(m.count, 'Antwort', 'Antworten') + ' (letzte 20)' : 'noch nicht geübt',
            right: m.isNew ? 'neu' : Math.round(m.value * 100) + ' %',
          });
        })),
        ui.group('Lernstand Unterricht', TT.LESSONS.filter((l) => !l.bank).map((l) => ui.lessonRow(l))),
        bankSection(st),
        ui.group('Übungsarten', exKeys.length
          ? exKeys.map((k) => ui.row({ title: TT.ex.LABELS[k], subtitle: pl(byEx[k].count, 'Antwort', 'Antworten') + ' (letzte 20 je Zeitform bzw. Thema)', right: Math.round(byEx[k].avg * 100) + ' %' }))
          : [ui.row({ title: 'Noch keine Daten' })]),
        ui.group('Häufigste Verwechslungen', top.length
          ? top.map((c) => ui.row({
              title: TT.tense(c.tense).name + ' → ' + TT.tense(c.used).name,
              subtitle: c.count + '× verwechselt', right: 'Duell',
              onclick: () => TT.app.startSession({ mode: 'duel', tenses: [c.tense, c.used] }),
            }))
          : [ui.row({ title: 'Noch keine Verwechslungen' })],
          { footer: 'Links die gesuchte Zeitform, rechts die von dir verwendete.' }),
        vocabSection()
      );
    },
  };
})(globalThis.TT = globalThis.TT || {});
