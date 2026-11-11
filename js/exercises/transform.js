(function (TT) {
  'use strict';

  const { h, ui } = TT;
  const FORM_WEIGHT = { aff: 0.6, neg: 0.2, q: 0.2 };

  TT.exercises.transform = {
    create(task, ctx) {
      const from = TT.util.pick(TT.TENSE_IDS.filter((id) => id !== task.tense));
      const form = TT.util.weightedPick(['aff', 'neg', 'q'], (f) => FORM_WEIGHT[f]);
      const { source, target } = TT.generateTransform({ from, to: task.tense, form });
      const t = TT.tense(task.tense);
      target.why = 'Bauplan ' + t.name + ': ' + t.formula[form] + '.';
      const label = '→ ' + t.name + (form === 'neg' ? ' · verneint' : form === 'q' ? ' · als Frage' : '');
      return TT.ex.gapTask(ctx, target, {
        exName: 'transform',
        prelude: [
          h('p.ex-label', null, TT.ex.LABELS.transform),
          h('p.ex-task', null, 'Setze den Satz in die angegebene Zeitform.'),
          ui.sentence(source.segments, { verbs: 'mark' }),
          h('div', null, h('span.target-label.row-' + t.row, null, label)),
        ],
      });
    },
  };
})(globalThis.TT = globalThis.TT || {});
