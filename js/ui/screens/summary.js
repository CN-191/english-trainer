(function (TT) {
  'use strict';

  const { h, ui } = TT;

  TT.screens.summary = {
    render() {
      const sum = TT.app.lastSummary;
      if (!sum || !sum.results.length) {
        return ui.page(ui.header('Auswertung'), h('p.muted', null, 'Noch keine Übung abgeschlossen.'),
          ui.button('Zur Startseite', { onclick: () => TT.router.go('/start') }));
      }
      const res = sum.results;
      const correct = res.filter((r) => r.correct).length;
      const pct = Math.round((correct / res.length) * 100);

      const byTense = {};
      for (const r of res) {
        const b = (byTense[r.tense] = byTense[r.tense] || { n: 0, ok: 0 });
        b.n++;
        if (r.correct) b.ok++;
      }
      const conf = {};
      for (const r of res) {
        if (r.usedTense && r.usedTense !== r.tense) {
          const k = r.tense + '>' + r.usedTense;
          conf[k] = (conf[k] || 0) + 1;
        }
      }
      const confList = Object.entries(conf).sort((a, b) => b[1] - a[1]);
      const top = confList.length ? confList[0][0].split('>') : null;

      return ui.page(
        ui.header(pct >= 80 ? 'Stark!' : 'Geschafft!', { subtitle: `${correct} von ${res.length} richtig (${pct} %)` }),
        h('div.card', null, ui.bar(correct / res.length)),
        TT.TENSE_IDS.some((id) => byTense[id])
          ? ui.group('Nach Zeitform', TT.TENSE_IDS.filter((id) => byTense[id]).map((id) =>
            ui.row({ href: '#/grammatik/' + id, title: TT.tense(id).name, right: byTense[id].ok + ' / ' + byTense[id].n })))
          : null,
        TT.LESSON_IDS.some((id) => byTense[id])
          ? ui.group('Unterricht', TT.LESSON_IDS.filter((id) => byTense[id]).map((id) =>
            ui.row({ href: TT.lessonHref(TT.lesson(id)), title: TT.lesson(id).title, right: byTense[id].ok + ' / ' + byTense[id].n })))
          : null,
        confList.length
          ? ui.group('Verwechselt', confList.map(([k, n]) => {
              const [a, b] = k.split('>');
              return ui.row({ title: TT.tense(a).name + ' ↔ ' + TT.tense(b).name, right: n + '×' });
            }), { footer: 'Links die gesuchte Zeitform, rechts die von dir verwendete.' })
          : null,
        h('div.actions', null,
          top ? ui.button('Duell: ' + TT.tense(top[0]).name + ' ↔ ' + TT.tense(top[1]).name, { onclick: () => TT.app.startSession({ mode: 'duel', tenses: top }) }) : null,
          ui.button('Neues Training', { kind: top ? 'secondary' : 'primary', onclick: () => TT.app.startSession({ mode: 'daily' }) || ui.toast('Schalte unter „Auswahl“ mindestens ein Thema ein.') }),
          ui.button('Zur Startseite', { kind: 'plain', onclick: () => TT.router.go('/start') }))
      );
    },
  };
})(globalThis.TT = globalThis.TT || {});
