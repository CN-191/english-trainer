(function (TT) {
  'use strict';

  const { h, ui } = TT;
  const esc = (s) => TT.util.escapeHtml(s);

  function errorText(err, s) {
    switch (err.kind) {
      case 'wrong-tense':
        return `Der Satz stand im <b>${TT.tense(err.usedTense).name}</b>. Hier passt <b>${TT.tense(s.tense).name}</b>.`;
      case 'participle':
        return `Falsche Verbform: ${esc(s.verb.base)} – ${esc(s.verb.past)} – <b>${esc(s.verb.pp)}</b>.`;
      case 'agreement':
        return `Die Form passte nicht zum Subjekt „${esc(s.subject.text)}“.`;
      case 'stative':
        return `„${esc(s.verb.base)}“ ist ein Zustandsverb und steht nicht in der -ing-Form.`;
    }
    return '';
  }

  TT.exercises.errorspot = {
    create(task, ctx) {
      const s = TT.generate({ tense: task.tense });
      const err = Math.random() < 0.5 ? TT.makeError(s) : null;
      const shown = err ? TT.renderSegments(s, err.conj) : s.segments;
      const root = h('div.exercise');
      const hints = TT.ex.hints(s.tense, 3, s.form);

      const finish = (correct, usedTense, diagHtml) => {
        hints.disable();
        TT.ex.finish(root, ctx, {
          correct, hintsUsed: hints.used(), tense: s.tense, segments: s.segments,
          diagHtml, why: s.why, usedTense, ex: 'errorspot',
        });
      };

      const correctIt = () => {
        const { el, inputs } = TT.ex.gapSentence(s.segments, TT.ex.infinitive(s));
        root.insertBefore(h('p.ex-task', null, 'Gut erkannt! Wie heißt die richtige Form?'), hints.el);
        root.insertBefore(el, hints.el);
        const check = () => {
          const answer = TT.ex.joinInputs(inputs);
          if (!answer) {
            ui.toast('Bitte zuerst ausfüllen');
            return;
          }
          const r = TT.ex.evaluate(answer, s);
          inputs.forEach((i) => {
            i.disabled = true;
            i.classList.add(r.correct ? 'ok' : 'bad');
          });
          finish(r.correct, r.usedTense, r.correct ? null : errorText(err, s) + ' ' + (r.diagHtml || ''));
        };
        root.appendChild(h('div.actions', null, ui.button('Prüfen', { onclick: check })));
        inputs[0].focus();
      };

      const judge = (saysCorrect) => {
        yesNo.querySelectorAll('button').forEach((b) => (b.disabled = true));
        if (!err) return finish(saysCorrect, null, saysCorrect ? null : 'Der Satz war korrekt.');
        if (saysCorrect) {
          const used = err.kind === 'wrong-tense' || err.kind === 'stative' ? err.usedTense : null;
          return finish(false, used, errorText(err, s));
        }
        correctIt();
      };

      const yesNo = h('div.btn-row', null,
        ui.button('Richtig', { kind: 'secondary', onclick: () => judge(true) }),
        ui.button('Falsch', { kind: 'secondary', onclick: () => judge(false) }));

      root.append(
        h('p.ex-label', null, TT.ex.LABELS.errorspot),
        h('p.ex-task', null, 'Ist die markierte Verbform richtig?'),
        ui.sentence(shown, { verbs: 'mark' }),
        hints.el,
        yesNo
      );
      return { el: root };
    },
  };
})(globalThis.TT = globalThis.TT || {});
