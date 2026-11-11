(function (TT) {
  'use strict';

  const { pick, shuffle, weightedPick } = TT.util;
  const EXERCISES = ['cloze', 'identify', 'errorspot', 'transform', 'translate'];
  const REVIEWABLE = ['cloze', 'identify', 'errorspot', 'transform'];
  const DUEL_EXERCISES = ['cloze', 'identify', 'errorspot'];
  const DAILY_COUNT = 15;
  const DAILY_MAX_REVIEWS = 5;
  const REVIEW_MAX = 20;

  function weight(state, tense) {
    const m = TT.progress.mastery(state, tense);
    return m.isNew ? 2 : 1 + 2 * (1 - m.value);
  }

  function reviewTask(entry) {
    return {
      ex: REVIEWABLE.includes(entry.ex) || TT.lessonKind(entry.ex) ? entry.ex : 'cloze',
      tense: entry.tense,
      reviewId: entry.id,
      confusedWith: entry.confusedWith,
    };
  }

  // Aufgabe aus einem Unterrichtsthema; „tense“ trägt die Themen-ID (gleiche Lernlogik wie Zeitformen)
  function lessonTask(id, rng) {
    return { ex: 'l-' + pick(TT.lesson(id).kinds, rng), tense: id };
  }

  // Tägliches Training: jede Zeitform und jedes Thema lässt sich ein- und ausschalten (Standard: an).
  // Gespeichert werden nur geänderte Schalter (state.daily), damit neue Themen automatisch dabei sind.
  const daily = {
    topics: () => TT.TENSE_IDS.concat(TT.LESSON_IDS || []),
    isOn: (state, id) => !(state.daily && state.daily[id] && state.daily[id].on === false),
    set(state, ids, on, now) {
      const t = (now || new Date()).getTime();
      state.daily = state.daily || {};
      for (const id of [].concat(ids)) state.daily[id] = { t, on: !!on };
    },
    enabled: (state) => daily.topics().filter((id) => daily.isOn(state, id)),
  };

  function build(opts) {
    const rng = opts.rng || Math.random;
    const now = opts.now || new Date();
    const state = opts.state;
    switch (opts.mode) {
      case 'daily': {
        // Fällige Wiederholungen zuerst, der Rest gewichtet (neu oder schwach öfter) aus allen eingeschalteten
        // Zeitformen und Themen gemischt. Ausgeschaltete Themen kommen nur hier nicht vor (Fehlerkiste bleibt).
        // Die freien Plätze teilen sich Zeitformen und Themen je zur Hälfte (sonst verdrängen die vielen
        // neuen Themen die Zeitformen); ist eine Seite ganz ausgeschaltet, bekommt die andere alles.
        const tasks = TT.progress.dueReviews(state, now).slice(0, DAILY_MAX_REVIEWS).map(reviewTask);
        const on = daily.enabled(state);
        const tenses = on.filter((id) => !TT.isLesson(id));
        const topics = on.filter((id) => TT.isLesson(id));
        const free = DAILY_COUNT - tasks.length;
        const nTenses = !topics.length ? free : !tenses.length ? 0 : Math.ceil(free / 2);
        for (let i = 0; i < free && on.length; i++) {
          if (i < nTenses) tasks.push({ ex: pick(EXERCISES, rng), tense: weightedPick(tenses, (t) => weight(state, t), rng) });
          else tasks.push(lessonTask(weightedPick(topics, (t) => weight(state, t), rng), rng));
        }
        return shuffle(tasks, rng);
      }
      case 'free': {
        const tenses = opts.tenses && opts.tenses.length ? opts.tenses : TT.TENSE_IDS;
        const exs = opts.exercises && opts.exercises.length ? opts.exercises : EXERCISES;
        return Array.from({ length: opts.count || 10 }, () => ({ ex: pick(exs, rng), tense: pick(tenses, rng) }));
      }
      case 'duel': {
        const t = opts.tenses;
        if (!Array.isArray(t) || t.length < 2 || t[0] === t[1] || !TT.TENSE_IDS.includes(t[0]) || !TT.TENSE_IDS.includes(t[1])) {
          throw new Error('Ein Duell braucht zwei verschiedene Zeitformen');
        }
        const pair = [t[0], t[1]];
        const tasks = Array.from({ length: opts.count || 16 }, (_, i) => ({ ex: pick(DUEL_EXERCISES, rng), tense: pair[i % 2], duel: pair.slice() }));
        return shuffle(tasks, rng);
      }
      case 'lesson': {
        const ids = (opts.topics || []).filter((id) => TT.isLesson(id));
        if (!ids.length) throw new Error('Kein Unterrichtsthema gewählt');
        return Array.from({ length: opts.count || 10 }, () => lessonTask(pick(ids, rng), rng));
      }
      case 'review':
        return TT.progress.dueReviews(state, now).slice(0, REVIEW_MAX).map(reviewTask);
    }
    throw new Error('Unbekannter Modus: ' + opts.mode);
  }

  function insertRepeat(tasks, index, task, rng) {
    const r = rng || Math.random;
    const pos = Math.min(tasks.length, index + 3 + Math.floor(r() * 3));
    const copy = Object.assign({}, task, { repeat: true });
    delete copy.reviewId;
    tasks.splice(pos, 0, copy);
    return pos;
  }

  TT.session = { build, insertRepeat, weight, EXERCISES, DAILY_COUNT };
  TT.daily = daily;
})(globalThis.TT = globalThis.TT || {});
