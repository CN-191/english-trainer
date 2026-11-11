(function (TT) {
  'use strict';

  // Stellvertreter-Subjekte, wenn das echte Subjekt unbekannt ist (Geschichten)
  const GENERIC = [
    { text: 'I', person: 1, number: 'sg' },
    { text: 'he', person: 3, number: 'sg' },
    { text: 'they', person: 3, number: 'pl' },
  ];

  function baseNormalize(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[’‘`´]/g, "'")
      .replace(/\blearnt\b/g, 'learned')
      .replace(/\bqueueing\b/g, 'queuing')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[.,!?;:"]+|[.,!?;:"]+$/g, '')
      .trim();
  }

  function expand(s) {
    return s
      .replace(/\b(do|does|did|is|are|was|were|has|have|had)nt\b/g, '$1 not')
      .replace(/\bwont\b/g, 'will not')
      .replace(/\bwon't\b/g, 'will not')
      .replace(/\bcan't\b/g, 'can not')
      .replace(/n't\b/g, ' not')
      .replace(/'m\b/g, ' am')
      .replace(/'re\b/g, ' are')
      .replace(/'ve\b/g, ' have')
      .replace(/'ll\b/g, ' will')
      .replace(/'d\b/g, ' had')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tidy(s) {
    return s.replace(/\s+/g, ' ').trim();
  }

  function normalizeVariants(input) {
    const s = expand(baseNormalize(input));
    if (!/'s\b/.test(s)) return [s];
    return [tidy(s.replace(/'s\b/g, ' has')), tidy(s.replace(/'s\b/g, ' is'))];
  }

  function stripSubject(input, subjText) {
    const s = baseNormalize(input);
    if (!subjText) return s;
    const subj = baseNormalize(subjText);
    if (s.startsWith(subj + ' ')) return s.slice(subj.length + 1);
    if (s.startsWith(subj + "'")) return s.slice(subj.length);
    return s;
  }

  const AUX_FAMILIES = [['am', 'is', 'are'], ['was', 'were'], ['has', 'have'], ['does', 'do']];

  function sameFamily(a, b) {
    return AUX_FAMILIES.some((f) => f.includes(a) && f.includes(b));
  }

  // Regelmäßig = 2. und 3. Form enden auf -ed und sind länger als die Grundform (fed, led sind unregelmäßig)
  function isRegular(verb) {
    return [verb.past, verb.pp].every((f) => f.endsWith('ed') && f.length > verb.base.length);
  }

  // So würde man ein unregelmäßiges Verb fälschlich regelmäßig bilden: goed, writed, runned, flied
  function regularGuesses(verb) {
    const b = verb.base;
    const out = [b.endsWith('e') ? b + 'd' : b + 'ed', b + b.slice(-1) + 'ed'];
    if (/[^aeiou]y$/.test(b)) out.push(b.slice(0, -1) + 'ied');
    return out;
  }

  function formError(expected, got, verb) {
    if (expected.length !== got.length) return null;
    const diffs = [];
    for (let i = 0; i < expected.length; i++) if (expected[i] !== got[i]) diffs.push(i);
    if (diffs.length !== 1) return null;
    const want = expected[diffs[0]];
    const have = got[diffs[0]];
    const res = (kind, extra) => Object.assign({ kind, expectedWord: want, got: have }, extra);
    if (verb.past !== verb.pp) {
      if (want === verb.pp && have === verb.past) return res('participle', { want: 'pp' });
      if (want === verb.past && have === verb.pp) return res('participle', { want: 'past' });
    }
    const pastForm = want === verb.past || want === verb.pp;
    const similar = have.startsWith(verb.base.slice(0, 2));
    if (pastForm && !isRegular(verb) && regularGuesses(verb).includes(have)) return res('regularized');
    if (sameFamily(want, have)) return res('agreement');
    const s = TT.sForm(verb);
    if ((want === s && have === verb.base) || (want === verb.base && have === s)) return res('agreement');
    if (want === TT.ingForm(verb) && have.endsWith('ing') && similar) return res('spelling');
    if (want === s && /s$/.test(have) && similar) return res('spelling');
    if (pastForm && isRegular(verb) && /d$/.test(have) && similar) return res('spelling');
    return null;
  }

  function diagnose(variants, task) {
    const verb = task.verb;
    const polarity = task.polarity || 'aff';
    const expected = normalizeVariants(task.accept[0])[0].split(' ');
    const allExpected = task.accept.map((a) => normalizeVariants(a)[0].split(' '));
    const ing = TT.ingForm(verb);
    // „have“ ist Zustandsverb, aber „was having dinner“ ist korrekt: nur melden, wenn die Lösung selbst kein -ing hat
    if (verb.type === 'state' && !verb.progressiveOk && !expected.includes(ing)) {
      if (variants.some((v) => v.split(' ').includes(ing))) return { ok: false, kind: 'stative' };
    }
    const subjects = task.subject ? [task.subject] : GENERIC;
    if (polarity === 'aff' || polarity === 'neg') {
      const other = polarity === 'aff' ? 'neg' : 'aff';
      for (const subj of subjects) {
        const full = normalizeVariants(TT.conjugate(verb, subj, task.tense, other).full)[0];
        if (variants.includes(full)) return { ok: false, kind: 'polarity', wanted: polarity };
      }
    }
    const acceptsGoingTo = task.accept.some((a) => /\bgoing to\b/.test(a));
    if (task.tense === 'future-simple' && verb.base !== 'be' && !acceptsGoingTo) {
      for (const subj of subjects) {
        const gt = normalizeVariants(TT.goingTo(verb, subj, polarity).full)[0];
        if (variants.includes(gt)) return { ok: false, kind: 'going-to' };
      }
    }
    for (const subj of subjects) {
      const forms = TT.allForms(verb, subj, polarity);
      for (const id of TT.TENSE_IDS) {
        if (id === task.tense) continue;
        if (variants.includes(normalizeVariants(forms[id].full)[0])) return { ok: false, kind: 'wrong-tense', used: id };
      }
    }
    for (const exp of allExpected) {
      for (const v of variants) {
        const d = formError(exp, v.split(' '), verb);
        if (d) return Object.assign({ ok: false }, d);
      }
    }
    return { ok: false, kind: 'other' };
  }

  function checkAnswer(input, task) {
    const variants = normalizeVariants(stripSubject(input, task.subject && task.subject.text));
    if (!variants[0]) return { ok: false, kind: 'empty' };
    const accepted = task.accept.map((a) => normalizeVariants(a)[0]);
    if (variants.some((v) => accepted.includes(v))) return { ok: true };
    if (!task.verb || !task.tense) return { ok: false, kind: 'other' };
    return diagnose(variants, task);
  }

  function explain(diag, task) {
    const esc = TT.util.escapeHtml;
    const b = (s) => '<b>' + esc(s) + '</b>';
    switch (diag.kind) {
      case 'wrong-tense':
        return `Du hast ${b(TT.tense(diag.used).name)} verwendet. Gesucht ist ${b(TT.tense(task.tense).name)}.`;
      case 'participle':
        return diag.want === 'pp'
          ? `Richtige Zeitform, aber hier brauchst du die 3. Form: ${b(diag.expectedWord)} statt ${esc(diag.got)}.`
          : `Hier steht die 2. Form (Simple Past): ${b(diag.expectedWord)} statt ${esc(diag.got)}.`;
      case 'regularized':
        return `„${esc(task.verb.base)}“ ist unregelmäßig: ${b(task.verb.base + ' – ' + task.verb.past + ' – ' + task.verb.pp)}.`;
      case 'agreement': {
        const subj = task.subject ? ' „' + esc(task.subject.text) + '“' : '';
        return `Die Form passt nicht zum Subjekt${subj}: ${b(diag.expectedWord)} statt ${esc(diag.got)}.`;
      }
      case 'spelling':
        return `Achte auf die Schreibweise: ${b(diag.expectedWord)} statt ${esc(diag.got)}.`;
      case 'stative':
        return `„${esc(task.verb.base)}“ ist ein Zustandsverb und steht normalerweise nicht in der -ing-Form.`;
      case 'polarity':
        return diag.wanted === 'neg'
          ? 'Richtige Zeitform – aber hier ist die verneinte Form gefragt.'
          : 'Richtige Zeitform – aber hier ist die bejahte Form gefragt.';
      case 'going-to':
        if (task.strict) return 'Gefragt ist das will-Future: will + Grundform.';
        return '„going to“ passt hier nicht – bei Angeboten, Versprechen, Bitten und spontanen Entscheidungen steht „will“.';
      case 'empty':
        return 'Du hast nichts eingegeben.';
      default:
        return 'Das passt leider nicht.';
    }
  }

  TT.normalizeVariants = normalizeVariants;
  TT.checkAnswer = checkAnswer;
  TT.explain = explain;
})(globalThis.TT = globalThis.TT || {});
