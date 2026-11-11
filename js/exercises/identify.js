(function (TT) {
  'use strict';

  const { h, ui } = TT;

  TT.exercises.identify = {
    create(task, ctx) {
      const s = TT.generate({ tense: task.tense });
      const root = h('div.exercise');
      const hints = TT.ex.hints(s.tense, 1);
      let answered = false;
      const buttons = [];

      const pick = (id, btn) => {
        if (answered) return;
        answered = true;
        hints.disable();
        const correct = id === s.tense;
        for (const b of buttons) {
          b.disabled = true;
          if (b.dataset.tense === s.tense) b.classList.add('correct');
        }
        if (!correct) btn.classList.add('wrong');
        const diagHtml = correct
          ? null
          : `Du hast <b>${TT.tense(id).name}</b> gewählt. Bauplan von ${TT.tense(s.tense).name}: <b>${TT.util.escapeHtml(TT.tense(s.tense).formula[s.form])}</b>.`;
        TT.ex.finish(root, ctx, {
          correct, hintsUsed: hints.used(), tense: s.tense, segments: s.segments,
          diagHtml, why: s.why, usedTense: correct ? null : id, ex: 'identify',
        });
      };

      let picker;
      if (ctx.duel) {
        picker = h('div.choices', null, ctx.duel.map((id) => {
          const b = h('button.choice', { type: 'button', 'data-tense': id }, TT.tense(id).name);
          b.addEventListener('click', () => pick(id, b));
          buttons.push(b);
          return b;
        }));
      } else {
        picker = ui.tenseGrid((t) => ({ onclick: (e) => pick(t.id, e.currentTarget) }));
        buttons.push(...picker.querySelectorAll('.tile'));
      }

      root.append(
        h('p.ex-label', null, TT.ex.LABELS.identify),
        h('p.ex-task', null, 'Welche Zeitform hat das markierte Verb?'),
        ui.sentence(s.segments, { verbs: 'mark' }),
        hints.el,
        picker
      );
      return { el: root };
    },
  };
})(globalThis.TT = globalThis.TT || {});
