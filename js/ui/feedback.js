(function (TT) {
  'use strict';

  const { h } = TT;

  TT.ui.feedback = (o) => {
    const t = TT.tense(o.tense);
    const title = o.correct ? (o.halfCredit ? 'Richtig – mit Hilfe' : 'Richtig!') : 'Nicht ganz';
    return h('div.feedback.' + (o.correct ? 'good' : 'bad') + '.row-' + t.row, { role: 'status' },
      h('h3', null, title),
      o.segments ? TT.ui.sentence(o.segments, { signals: true, verbs: 'mark' }) : null,
      !o.correct && o.diagHtml ? h('p', { html: o.diagHtml }) : null,
      o.why ? h('p.why', null, o.why) : null,
      TT.timeline(o.tense),
      h('p', null, h('a', { href: '#/grammatik/' + o.tense }, 'Regel ansehen: ' + t.name + ' ›')));
  };
})(globalThis.TT = globalThis.TT || {});
