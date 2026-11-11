(function (TT) {
  'use strict';

  const { pick, shuffle } = TT.util;

  const AGREE_SWAP = {
    am: 'is', is: 'are', are: 'is', was: 'were', were: 'was', has: 'have', have: 'has', does: 'do', do: 'does',
    "isn't": "aren't", "aren't": "isn't", "wasn't": "weren't", "weren't": "wasn't",
    "hasn't": "haven't", "haven't": "hasn't", "doesn't": "don't", "don't": "doesn't",
  };

  function conjFromWords(words, form) {
    const full = words.join(' ');
    if (form === 'q') return { full, aux: words[0], rest: words.slice(1).join(' ') };
    return { full, aux: null, rest: full };
  }

  function norm(s) {
    return TT.normalizeVariants(s)[0];
  }

  function errorOptions(s) {
    const { verb, subject, tense, form } = s;
    const accepted = s.accept.map(norm);
    const out = [];
    const add = (kind, conj, usedTense) => {
      const n = norm(conj.full);
      if (accepted.includes(n) || out.some((o) => norm(o.conj.full) === n)) return;
      out.push(usedTense ? { kind, conj, usedTense } : { kind, conj });
    };

    for (const other of TT.tense(tense).confusions) {
      if (verb.type === 'state' && /progressive/.test(other)) continue;
      add('wrong-tense', TT.conjugate(verb, subject, other, form), other);
    }

    const words = s.conj.full.split(' ');
    if (verb.past !== verb.pp) {
      const i = words.lastIndexOf(verb.pp);
      if (/perfect$/.test(tense) && i > 0) {
        const w = words.slice();
        w[i] = verb.past;
        add('participle', conjFromWords(w, form));
      }
      if (tense === 'past-simple' && form === 'aff') add('participle', conjFromWords([verb.pp], form));
    }

    if (tense === 'present-simple' && form === 'aff') {
      add('agreement', conjFromWords([TT.is3sg(subject) ? verb.base : TT.sForm(verb)], form));
    } else if (AGREE_SWAP[words[0]]) {
      add('agreement', conjFromWords([AGREE_SWAP[words[0]]].concat(words.slice(1)), form));
    }

    if (verb.type === 'state' && !verb.progressiveOk && (tense === 'present-simple' || tense === 'past-simple')) {
      const prog = tense === 'present-simple' ? 'present-progressive' : 'past-progressive';
      add('stative', TT.conjugate(verb, subject, prog, form), prog);
    }
    return out;
  }

  function makeError(s, rng) {
    const opts = errorOptions(s);
    return opts.length ? pick(opts, rng) : null;
  }

  function gapParts(s, conj) {
    return TT.renderSegments(s, conj).filter((x) => x.t === 'verb').map((x) => x.v);
  }

  function makeChoices(s, rng) {
    const r = rng || Math.random;
    const chosen = [{ conj: s.conj, correct: true }];
    const has = (conj) => chosen.some((c) => norm(c.conj.full) === norm(conj.full));
    const opts = errorOptions(s);
    const tenseErrs = shuffle(opts.filter((o) => o.kind === 'wrong-tense'), r);
    const formErrs = shuffle(opts.filter((o) => o.kind !== 'wrong-tense'), r);
    for (const o of tenseErrs.slice(0, 2)) chosen.push({ conj: o.conj, correct: false });
    if (formErrs.length) chosen.push({ conj: formErrs[0].conj, correct: false });
    const accepted = s.accept.map(norm);
    for (const id of shuffle(TT.TENSE_IDS, r)) {
      if (chosen.length >= 4) break;
      if (s.verb.type === 'state' && /progressive/.test(id)) continue;
      const conj = TT.conjugate(s.verb, s.subject, id, s.form);
      if (!has(conj) && !accepted.includes(norm(conj.full))) chosen.push({ conj, correct: false });
    }
    return shuffle(chosen.slice(0, 4), r).map((c) => Object.assign({ label: gapParts(s, c.conj).filter(Boolean).join(' … ') }, c));
  }

  TT.conjFromWords = conjFromWords;
  TT.errorOptions = errorOptions;
  TT.makeError = makeError;
  TT.gapParts = gapParts;
  TT.makeChoices = makeChoices;
})(globalThis.TT = globalThis.TT || {});
