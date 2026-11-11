(function (TT) {
  'use strict';

  const { h } = TT;
  const recent = [];

  TT.exercises.translate = {
    create(task, ctx) {
      const pool = (TT.TRANSLATIONS || []).filter((e) => e.tense === task.tense);
      if (!pool.length) return TT.exercises.cloze.create(task, ctx);
      const fresh = pool.filter((e) => !recent.includes(e.id));
      const entry = TT.util.pick(fresh.length ? fresh : pool);
      recent.push(entry.id);
      if (recent.length > 60) recent.shift();
      const s = TT.fromTranslation(entry);
      return TT.ex.gapTask(ctx, s, {
        exName: 'translate',
        prelude: [
          h('p.ex-label', null, TT.ex.LABELS.translate),
          h('p.de-sentence', null, entry.de),
          h('p.ex-task', null, 'Wie heißt das auf Englisch? Setze das Verb in der passenden Zeitform ein.'),
        ],
      });
    },
  };
})(globalThis.TT = globalThis.TT || {});
