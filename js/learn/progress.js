(function (TT) {
  'use strict';

  const HISTORY_MAX = 20;
  const NEW_BELOW = 5;
  const INTERVAL_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14 };

  function dayKey(date) {
    const d = new Date(date);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // Kalenderarithmetik auf lokalen Daten (sommerzeitfest)
  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function record(state, { tense, score, ex, usedTense, now }) {
    const list = (state.history[tense] = state.history[tense] || []);
    list.push({ t: now.getTime(), score, ex });
    if (list.length > HISTORY_MAX) list.splice(0, list.length - HISTORY_MAX);
    const k = dayKey(now);
    state.days[k] = (state.days[k] || 0) + 1;
    if (usedTense && usedTense !== tense) {
      const key = tense + '>' + usedTense;
      state.confusions[key] = (state.confusions[key] || 0) + 1;
    }
  }

  function mastery(state, tense) {
    const list = state.history[tense] || [];
    if (!list.length) return { value: 0, count: 0, isNew: true };
    const value = list.reduce((s, e) => s + e.score, 0) / list.length;
    return { value, count: list.length, isNew: list.length < NEW_BELOW };
  }

  function addMistake(state, { tense, confusedWith, ex, now }) {
    const due = addDays(now, INTERVAL_DAYS[1]).getTime();
    const same = state.review.find((r) => r.tense === tense && r.confusedWith === (confusedWith || null) && r.ex === ex);
    if (same) {
      same.box = 1;
      same.due = due;
      return same;
    }
    const entry = { id: 'r' + now.getTime().toString(36) + Math.random().toString(36).slice(2, 6), tense, confusedWith: confusedWith || null, ex, box: 1, due };
    state.review.push(entry);
    return entry;
  }

  function reviewAnswer(state, id, correct, now) {
    const i = state.review.findIndex((r) => r.id === id);
    if (i < 0) return;
    const e = state.review[i];
    if (!correct) {
      e.box = 1;
      e.due = addDays(now, INTERVAL_DAYS[1]).getTime();
      return;
    }
    if (e.box >= 4) {
      state.review.splice(i, 1);
      return;
    }
    e.box += 1;
    e.due = addDays(now, INTERVAL_DAYS[e.box]).getTime();
  }

  // Nur Einträge, die diese Version abspielen kann: Unterrichtsthema mit passender l-Übungsart oder
  // bekannte Zeitform mit Zeitform-Übung. Unbekannte Themen (z. B. aus einer neueren App-Version) und
  // ungültige Kombinationen bleiben gespeichert, werden aber weder abgefragt noch gezählt.
  function playable(r) {
    const kind = typeof r.ex === 'string' && r.ex.startsWith('l-') ? r.ex.slice(2) : null;
    if (typeof TT.isLesson === 'function' && TT.isLesson(r.tense)) {
      const lesson = TT.lesson(r.tense);
      return !!kind && !!lesson && lesson.kinds.includes(kind);
    }
    return !kind && (TT.TENSE_IDS || []).includes(r.tense);
  }

  function dueReviews(state, now) {
    // fällig ist alles, dessen Fälligkeitstag heute oder früher ist
    const today = dayKey(now);
    return state.review.filter((r) => playable(r) && dayKey(new Date(r.due)) <= today).sort((a, b) => a.due - b.due);
  }

  function streak(state, now) {
    let d = new Date(now);
    if (!state.days[dayKey(d)]) d = addDays(d, -1);
    let n = 0;
    while (state.days[dayKey(d)]) {
      n++;
      d = addDays(d, -1);
    }
    return n;
  }

  function topConfusions(state, n) {
    return Object.entries(state.confusions)
      .map(([key, count]) => {
        const [tense, used] = key.split('>');
        return { tense, used, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }

  function statsByExercise(state) {
    const out = Object.create(null);
    for (const list of Object.values(state.history)) {
      for (const e of list) {
        const o = (out[e.ex] = out[e.ex] || { count: 0, sum: 0 });
        o.count++;
        o.sum += e.score;
      }
    }
    const res = {};
    for (const k of Object.keys(out)) if (k !== '__proto__') res[k] = { count: out[k].count, avg: out[k].sum / out[k].count };
    return res;
  }

  function lastDays(state, now, n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const key = dayKey(addDays(now, -i));
      out.push({ key, count: state.days[key] || 0 });
    }
    return out;
  }

  TT.progress = { dayKey, record, mastery, addMistake, reviewAnswer, dueReviews, streak, topConfusions, statsByExercise, lastDays };
})(globalThis.TT = globalThis.TT || {});
