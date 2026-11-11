(function (TT) {
  'use strict';

  // Grammatik-Themen „Typische Fehler für Deutsche“ (Auswahl aus der Grammatik-Liste A1–C1).
  // Anders als die Unterrichtsthemen haben sie keinen eigenen Generator, sondern eine Aufgabensammlung:
  // TT.addBankLesson(def) macht daraus ein normales Thema (TT.addLesson) mit denselben Übungsansichten,
  // demselben Lernstand und derselben Fehlerkiste.
  //
  // def = {
  //   id, cat (siehe CATS), level ('A1' … 'B2'), refs ['B1-02'], title, rule, tip,
  //   mistakes [[falsch, richtig], …], examples [Satz, …],
  //   cloze     [{ s: 'Satz mit ___ (genau einmal)', h: 'Hinweis in Klammern'?, a: [richtig, …], w: [falsch, …], e: Erklärung }],
  //   errorspot [{ r: richtiger Satz, w: falscher Satz, o: [weitere falsche Sätze]?, e }],
  //   transform [{ s: Ausgangssatz (*markiert*), l: 'Anweisung', a: [richtige Sätze, …], e }],
  //   order     [{ o: 'bausteine / in / richtiger / reihenfolge', a: [weitere richtige Sätze]?, p: '.' | '?', e }],
  // }

  const CATS = [
    { id: 'zeit', title: 'Zeitangaben und Nebensätze' },
    { id: 'if', title: 'if-Sätze und Wünsche' },
    { id: 'modal', title: 'Modalverben' },
    { id: 'verb', title: 'Verbmuster' },
    { id: 'satz', title: 'Wortstellung und Fragen' },
    { id: 'wort', title: 'Nomen, Artikel, Adverbien' },
    { id: 'praep', title: 'Präpositionen und Konnektoren' },
  ];
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const KINDS = ['cloze', 'errorspot', 'transform', 'order'];
  const MIN = { cloze: 12, errorspot: 10, transform: 6, order: 6 };
  const GAP = '___';

  const { cap } = TT.lessonUtil;

  function shuffle(list, rng) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Text mit *markierten* Stellen → Segmente
  function segments(text) {
    return String(text).split(/(\*[^*]+\*)/).filter(Boolean)
      .map((p) => (p.startsWith('*') && p.endsWith('*') ? { t: 'mark', v: p.slice(1, -1) } : { t: 'text', v: p }));
  }
  const plain = (text) => String(text).replace(/\*/g, '');
  // „i“ wird immer als „I“ gezeigt (auch in i'm, i've)
  const chunksOf = (o) => String(o).split(' / ').map((c) => c.trim().replace(/\bi\b/g, 'I')).filter(Boolean);
  const orderAnswer = (it) => cap(chunksOf(it.o).join(' ')) + (it.p || '.');

  const BUILD = {
    cloze(it, rng) {
      const [before, after] = it.s.split(GAP);
      return {
        kind: 'cloze', task: 'Setze das Richtige ein.', before, after, hint: it.h || null,
        accept: it.a.slice(), answer: it.a[0], choices: shuffle([it.a[0]].concat(it.w), rng), explain: it.e,
      };
    },
    errorspot(it, rng) {
      const correct = rng() < 0.4;
      return {
        kind: 'errorspot', task: 'Ist der Satz richtig?', shown: correct ? it.r : it.w, correct, answer: it.r,
        options: correct ? [] : shuffle([it.r, it.w].concat(it.o || []), rng), explain: it.e,
      };
    },
    transform(it) {
      return {
        kind: 'transform', task: 'Schreibe den Satz um.', source: segments(it.s), label: it.l, input: 'sentence',
        accept: it.a.slice(), answer: it.a[0], explain: it.e,
      };
    },
    order(it, rng) {
      const chunks = chunksOf(it.o);
      let shown = shuffle(chunks, rng);
      for (let i = 0; i < 5 && shown.join(' ') === chunks.join(' '); i++) shown = shuffle(chunks, rng);
      return {
        kind: 'order', task: 'Bring die Bausteine in die richtige Reihenfolge.', chunks: shown, punct: it.p || '.',
        accept: [chunks.join(' ')].concat(it.a || []), answer: orderAnswer(it), explain: it.e,
      };
    },
  };

  // Vollständige richtige Beispielsätze für die Themenseite
  function correctSentences(def) {
    return [].concat(
      (def.errorspot || []).map((x) => x.r),
      (def.cloze || []).map((x) => x.s.replace(GAP, x.a[0])),
      (def.order || []).map(orderAnswer));
  }

  // Prüft eine Themen-Definition; liefert eine Liste von Fehlern (leer = in Ordnung).
  function validate(def) {
    const err = [];
    const where = (k, i) => def.id + '/' + k + '[' + i + ']';
    const sentence = (s) => /^[A-Z"']/.test(s) && /[.?!]$/.test(s) && !/\s{2}/.test(s) && !/ [.,?!]/.test(s);
    if (!/^[a-z][a-z0-9-]{1,40}$/.test(def.id || '')) err.push('ungültige ID: ' + def.id);
    if (!CATS.some((c) => c.id === def.cat)) err.push(def.id + ': unbekannte Kategorie ' + def.cat);
    if (!LEVELS.includes(def.level)) err.push(def.id + ': unbekannte Stufe ' + def.level);
    for (const f of ['title', 'rule', 'tip']) if (!def[f]) err.push(def.id + ': ' + f + ' fehlt');
    if (!Array.isArray(def.refs) || !def.refs.length) err.push(def.id + ': refs fehlt');
    if (!Array.isArray(def.mistakes) || def.mistakes.length < 2) err.push(def.id + ': mindestens 2 typische Fehler');
    else def.mistakes.forEach((m, i) => { if (!Array.isArray(m) || m.length !== 2 || TT.lessonNorm(m[0]) === TT.lessonNorm(m[1])) err.push(where('mistakes', i)); });
    if (!Array.isArray(def.examples) || def.examples.length < 3) err.push(def.id + ': mindestens 3 Beispiele');
    const kinds = KINDS.filter((k) => Array.isArray(def[k]) && def[k].length);
    if (!['cloze', 'errorspot', 'transform'].every((k) => kinds.includes(k))) err.push(def.id + ': cloze, errorspot und transform sind Pflicht');
    for (const k of kinds) if (def[k].length < MIN[k]) err.push(def.id + ': zu wenige ' + k + ' (' + def[k].length + ' < ' + MIN[k] + ')');
    (def.cloze || []).forEach((it, i) => {
      const w = where('cloze', i);
      if (typeof it.s !== 'string' || it.s.split(GAP).length !== 2) return err.push(w + ': genau eine Lücke ___');
      if (!it.e) err.push(w + ': Erklärung fehlt');
      if (!Array.isArray(it.a) || !it.a.length) return err.push(w + ': a fehlt');
      if (!Array.isArray(it.w) || !it.w.length) err.push(w + ': w (Falschantworten für Auswahl) fehlt');
      it.a.forEach((a) => { if (!sentence(it.s.replace(GAP, a))) err.push(w + ': Satz unvollständig mit „' + a + '“'); });
      (it.w || []).forEach((x) => { if (TT.lessonCheck(x, it.a)) err.push(w + ': Falschantwort „' + x + '“ wird akzeptiert'); });
      if (new Set((it.w || []).map(TT.lessonNorm)).size !== (it.w || []).length) err.push(w + ': doppelte Falschantwort');
    });
    (def.errorspot || []).forEach((it, i) => {
      const w = where('errorspot', i);
      if (!it.e) err.push(w + ': Erklärung fehlt');
      if (!sentence(it.r || '') || !sentence(it.w || '')) return err.push(w + ': r und w müssen ganze Sätze sein');
      const wrong = [it.w].concat(it.o || []);
      wrong.forEach((x) => { if (!sentence(x)) err.push(w + ': kein ganzer Satz: ' + x); if (TT.lessonCheck(x, [it.r])) err.push(w + ': falscher Satz gleich dem richtigen: ' + x); });
      if (new Set(wrong.map(TT.lessonNorm)).size !== wrong.length) err.push(w + ': doppelte falsche Sätze');
    });
    (def.transform || []).forEach((it, i) => {
      const w = where('transform', i);
      if (!it.e || !it.l) err.push(w + ': Erklärung oder Anweisung fehlt');
      if (!sentence(plain(it.s || ''))) err.push(w + ': Ausgangssatz');
      if (!Array.isArray(it.a) || !it.a.length) return err.push(w + ': a fehlt');
      it.a.forEach((a) => { if (!sentence(a)) err.push(w + ': kein ganzer Satz: ' + a); });
      if (TT.lessonCheck(plain(it.s), it.a)) err.push(w + ': Ausgangssatz ist schon eine Lösung');
    });
    (def.order || []).forEach((it, i) => {
      const w = where('order', i);
      const chunks = chunksOf(it.o || '');
      if (chunks.length < 3) err.push(w + ': mindestens 3 Bausteine');
      if (!it.e) err.push(w + ': Erklärung fehlt');
      if (!sentence(orderAnswer(it))) err.push(w + ': Lösung kein ganzer Satz');
      (it.a || []).forEach((a) => {
        if (!sentence(a)) err.push(w + ': kein ganzer Satz: ' + a);
        const words = (s) => TT.lessonNorm(s).split(' ').sort().join(' ');
        if (words(a) !== words(chunks.join(' '))) err.push(w + ': Alternative nutzt andere Wörter: ' + a);
      });
    });
    return err;
  }

  TT.addBankLesson = (def) => {
    const kinds = KINDS.filter((k) => Array.isArray(def[k]) && def[k].length);
    const recent = {}; // zuletzt gestellte Aufgaben je Übungsart, damit sich nichts sofort wiederholt
    const pickIndex = (kind, rng) => {
      const n = def[kind].length;
      const last = (recent[kind] = recent[kind] || []);
      let i = Math.floor(rng() * n);
      for (let tries = 0; tries < 8 && last.includes(i); tries++) i = Math.floor(rng() * n);
      last.push(i);
      if (last.length > Math.min(6, n - 1)) last.shift();
      return i;
    };
    const examples = correctSentences(def);
    TT.addLesson({
      id: def.id, title: def.title, rule: def.rule, tip: def.tip, examples: def.examples, mistakes: def.mistakes,
      cat: def.cat, level: def.level, refs: def.refs, from: 'Stufe ' + def.level + ' · typischer Fehler für Deutsche',
      bank: true, kinds,
      make(kind, rng) {
        const r = rng || Math.random;
        const k = kinds.includes(kind) ? kind : kinds[0];
        return BUILD[k](def[k][pickIndex(k, r)], r);
      },
      example(rng) {
        const r = rng || Math.random;
        return examples[Math.floor(r() * examples.length)];
      },
      def,
    });
  };

  TT.GRAMMAR_CATS = CATS;
  TT.bankLessons = (cat) => TT.LESSONS.filter((l) => l.bank && (!cat || l.cat === cat));
  TT.isBankLesson = (id) => { const l = TT.lesson(id); return !!(l && l.bank); };
  TT.lessonHref = (lesson) => (lesson.bank ? '#/grammatik/' : '#/unterricht/') + lesson.id;
  TT.bankUtil = { validate, segments, chunksOf, orderAnswer, KINDS, MIN, LEVELS };
})(globalThis.TT = globalThis.TT || {});
