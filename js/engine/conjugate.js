(function (TT) {
  'use strict';

  function is3sg(subj) {
    return subj.person === 3 && subj.number === 'sg';
  }

  // Explizites `s` im Verb-Eintrag brauchen z. B. quiz (quizzes).
  function sForm(verb) {
    if (verb.s) return verb.s;
    const b = verb.base;
    if (b === 'have') return 'has';
    if (/(s|sh|ch|x|z|o)$/.test(b)) return b + 'es';
    if (/[^aeiou]y$/.test(b)) return b.slice(0, -1) + 'ies';
    return b + 's';
  }

  // Explizites `ing` im Verb-Eintrag brauchen: zweisilbige Verben mit Endbetonung (begin, forget, prefer, admit, occur, refer), britische l-Verdopplung (travel, cancel) und Verben auf -ic (panic → panicking).
  function ingForm(verb) {
    if (verb.ing) return verb.ing;
    const b = verb.base;
    if (/ie$/.test(b)) return b.slice(0, -2) + 'ying';
    if (/(ee|ye|oe)$/.test(b)) return b + 'ing';
    if (/e$/.test(b)) return b.slice(0, -1) + 'ing';
    if (/^(?:qu|[^aeiou])*[aeiou][^aeiouwxy]$/.test(b)) return b + b.slice(-1) + 'ing';
    return b + 'ing';
  }

  function bePresent(subj) {
    if (subj.person === 1 && subj.number === 'sg') return 'am';
    return is3sg(subj) ? 'is' : 'are';
  }

  function bePast(subj) {
    return subj.number === 'sg' && subj.person !== 2 ? 'was' : 'were';
  }

  function affWords(verb, subj, tense) {
    const s3 = is3sg(subj);
    const ing = ingForm(verb);
    switch (tense) {
      case 'present-simple': return [s3 ? sForm(verb) : verb.base];
      case 'present-progressive': return [bePresent(subj), ing];
      case 'present-perfect': return [s3 ? 'has' : 'have', verb.pp];
      case 'present-perfect-progressive': return [s3 ? 'has' : 'have', 'been', ing];
      case 'past-simple': return [verb.past];
      case 'past-progressive': return [bePast(subj), ing];
      case 'past-perfect': return ['had', verb.pp];
      case 'past-perfect-progressive': return ['had', 'been', ing];
      case 'future-simple': return ['will', verb.base];
      case 'future-progressive': return ['will', 'be', ing];
      case 'future-perfect': return ['will', 'have', verb.pp];
      case 'future-perfect-progressive': return ['will', 'have', 'been', ing];
    }
    throw new Error('Unbekannte Zeitform: ' + tense);
  }

  const CONTRACT = {
    do: "don't", does: "doesn't", did: "didn't", is: "isn't", are: "aren't", was: "wasn't",
    were: "weren't", have: "haven't", has: "hasn't", had: "hadn't", will: "won't",
  };

  function conjugate(verb, subj, tense, polarity) {
    if (verb.base === 'be') throw new Error('Das Verb „be“ wird nicht unterstützt');
    if (polarity !== 'aff' && polarity !== 'neg' && polarity !== 'q') throw new Error('Unbekannte Satzart: ' + polarity);
    let words = affWords(verb, subj, tense);
    if (polarity === 'aff') {
      const full = words.join(' ');
      return { full, aux: null, rest: full };
    }
    if (words.length === 1) {
      const doAux = tense === 'past-simple' ? 'did' : is3sg(subj) ? 'does' : 'do';
      words = [doAux, verb.base];
    }
    const rest = words.slice(1).join(' ');
    if (polarity === 'neg') {
      // Bei „am“ gibt es keine Kurzform: aux ist dann „am not“ (zwei Wörter).
      const head = CONTRACT[words[0]] || words[0] + ' not';
      return { full: head + ' ' + rest, aux: head, rest };
    }
    return { full: words.join(' '), aux: words[0], rest };
  }

  // „going to“-Alternative zum will-Future (keine eigene Zeitform, wird nie geübt)
  function goingTo(verb, subj, polarity) {
    if (verb.base === 'be') throw new Error('Das Verb „be“ wird nicht unterstützt');
    if (polarity !== 'aff' && polarity !== 'neg' && polarity !== 'q') throw new Error('Unbekannte Satzart: ' + polarity);
    const be = bePresent(subj);
    const rest = 'going to ' + verb.base;
    if (polarity === 'aff') {
      const full = be + ' ' + rest;
      return { full, aux: null, rest: full };
    }
    if (polarity === 'neg') {
      const head = CONTRACT[be] || be + ' not';
      return { full: head + ' ' + rest, aux: head, rest };
    }
    return { full: be + ' ' + rest, aux: be, rest };
  }

  function allForms(verb, subj, polarity) {
    const out = {};
    for (const id of TT.TENSE_IDS) out[id] = conjugate(verb, subj, id, polarity);
    return out;
  }

  TT.is3sg = is3sg;
  TT.sForm = sForm;
  TT.ingForm = ingForm;
  TT.conjugate = conjugate;
  TT.goingTo = goingTo;
  TT.allForms = allForms;
})(globalThis.TT = globalThis.TT || {});
