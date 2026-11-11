(function (TT) {
  'use strict';

  // Grammatik-Themen aus dem Unterricht. Jedes Thema liegt in einer eigenen Datei unter js/lessons/
  // und meldet sich mit TT.addLesson an. Seine Aufgaben laufen durch dieselbe Lernlogik wie die
  // Zeitformen (Verlauf, Fehlerkiste, Sync) – die Themen-ID steht dort an der Stelle der Zeitform.
  //
  // Ein Thema: { id, title, added, rule, examples[], tip, kinds[], make(kind, rng) → Aufgabe }
  // optional: from (Herkunft statt „Stunde vom …“), example(rng) → Beispieltext für die Themenseite
  // Aufgaben (alle mit kind, task, explain):
  //   transform: source (Segmente), label, input ('sentence' | 'word'), accept[], answer
  //   cloze:     before, after, hint, accept[], answer, choices[]
  //   errorspot: shown, correct (bool), answer, options[]
  //   identify:  sentence (Segmente), options[{label, correct}]
  //   replace:   source (Segmente, markierte Stellen ersetzen), target (Segmente mit {t: 'gap'}),
  //              gaps[{answer, accept[]}] in der Reihenfolge der Lücken, answer (ganzer Satz) – immer getippt
//   order:     chunks[] (gemischt), punct, accept[] (Sätze), answer – Bausteine antippen (Grammatik-Themen, bank.js)
  // Segmente: [{t: 'text' | 'mark', v}] – 'mark' wird hervorgehoben.

  const LESSONS = [];
  const KINDS = ['transform', 'cloze', 'errorspot', 'identify', 'replace', 'order'];

  TT.LESSONS = LESSONS;
  TT.LESSON_IDS = [];
  TT.LESSON_KINDS = KINDS;
  TT.LESSON_EX = KINDS.map((k) => 'l-' + k);

  TT.addLesson = (lesson) => {
    LESSONS.push(lesson);
    TT.LESSON_IDS = LESSONS.map((l) => l.id);
  };
  TT.lesson = (id) => LESSONS.find((l) => l.id === id) || null;
  TT.isLesson = (id) => TT.LESSON_IDS.includes(id);
  TT.lessonKind = (ex) => (TT.LESSON_EX.includes(ex) ? ex.slice(2) : null);

  // Vergleich ohne Rücksicht auf Groß-/Kleinschreibung, Leerzeichen, Kommas, Satzzeichen am Ende und
  // Apostroph-Form. Kein Satz in den Themen hängt in seiner Bedeutung von einem Komma ab.
  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[’‘`´]/g, "'")
      .replace(/,/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[.!?]+$/, '')
      .trim();
  }

  // Kurzformen wie beim Zeitformen-Prüfer auflösen (I'll → I will, she's → she has / she is)
  // 'd heißt had oder would – je Stelle nach dem folgenden Wort entschieden (Adverbien übersprungen):
  // 'd have / 'd rather / Grundform → would, 'd better / Partizip → had, unklar (I'd come) → beides.
  // So zählt „If I'd known, I'd have come“ wie „If I had known, I would have come“, aber „I'd known“ nie als „would known“.
  const SKIP = new Set(['never', 'already', 'just', 'ever', 'always', 'really', 'also', 'not', 'probably', 'definitely', 'still', 'only', 'actually', 'certainly', 'all', 'both']);
  let forms = null;
  function verbForms() {
    if (forms) return forms;
    forms = { pp: new Set(), base: new Set() };
    for (const v of TT.VERBS || []) {
      forms.pp.add(v.pp);
      forms.base.add(v.base);
    }
    for (const w of ['been', 'had', 'known', 'seen', 'gone', 'done', 'taken', 'given', 'eaten', 'forgotten', 'got', 'gotten', 'left', 'told', 'heard', 'met', 'made', 'found', 'lost', 'bought', 'thought', 'brought', 'sent', 'spent', 'won', 'paid', 'said', 'sold', 'kept', 'felt', 'fallen', 'flown', 'grown', 'written', 'driven', 'broken', 'chosen', 'spoken', 'stolen', 'woken', 'ridden', 'begun', 'drunk', 'sung', 'swum']) forms.pp.add(w);
    return forms;
  }
  function readingsOfD(next) {
    if (!next || next === 'have' || next === 'rather' || next === 'like' || next === 'love' || next === 'prefer') return ['would'];
    if (next === 'better') return ['had'];
    const f = verbForms();
    const isPP = f.pp.has(next) || /ed$/.test(next);
    if (isPP && f.base.has(next)) return ['had', 'would'];
    return isPP ? ['had'] : ['would'];
  }
  function expandD(n) {
    let out = [''];
    const parts = n.split(/'d\b/);
    for (let i = 0; i < parts.length; i++) {
      out = out.map((x) => x + parts[i]);
      if (i === parts.length - 1) break;
      const words = parts[i + 1].trim().split(' ').filter((w) => !SKIP.has(w));
      const next = [];
      for (const r of readingsOfD(words[0])) for (const x of out) next.push(x + ' ' + r);
      out = next.slice(0, 16);
    }
    return out;
  }
  // cannot = can not
  const variants = (s) => {
    const n = norm(s).replace(/\bcannot\b/g, 'can not');
    if (!n) return [];
    const all = /'d\b/.test(n) ? expandD(n) : [n];
    if (typeof TT.normalizeVariants !== 'function') return all;
    return [].concat(...all.map((x) => TT.normalizeVariants(x)));
  };

  const check = (answer, accept) => {
    const a = variants(answer);
    return a.length > 0 && accept.some((x) => variants(x).some((v) => a.includes(v)));
  };

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  // Satz aus Teilen: Leerzeichen bereinigen, groß beginnen, Punkt am Ende.
  const sentence = (...parts) => cap(parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()) + '.';
  // Segmente aus Text mit einer markierten Stelle: before [mark] after
  const marked = (before, mark, after) => [{ t: 'text', v: before }, { t: 'mark', v: mark }, { t: 'text', v: after }].filter((s) => s.v);

  TT.lessonNorm = norm;
  TT.lessonCheck = check;
  TT.lessonUtil = { cap, sentence, marked };
})(globalThis.TT = globalThis.TT || {});
