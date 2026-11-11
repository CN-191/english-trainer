(function (TT) {
  'use strict';

  const { h } = TT;

  TT.exercises.cloze = {
    create(task, ctx) {
      const s = TT.generate({ tense: task.tense });
      return TT.ex.gapTask(ctx, s, {
        exName: 'cloze',
        prelude: [h('p.ex-label', null, TT.ex.LABELS.cloze), h('p.ex-task', null, 'Setze das Verb in der richtigen Zeitform ein.')],
      });
    },
  };
})(globalThis.TT = globalThis.TT || {});
