(function (TT) {
  'use strict';

  // FSRS-6 (Free Spaced Repetition Scheduler) nach der Referenz ts-fsrs, legacy FSRS-6:
  // Formeln, Standard-Gewichte, Lernschritte und Fuzz wie dort. Abweichung wie py-fsrs/Anki:
  // „Schwer“ auf Lernschritt ≥ 1 wiederholt den aktuellen Schritt.

  const W = Object.freeze([
    0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796,
    1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
  ]);
  const S_MIN = 0.001;
  const S_MAX = 36500;
  const NEW = 0, LEARNING = 1, REVIEW = 2, RELEARNING = 3;
  const AGAIN = 1, HARD = 2, GOOD = 3, EASY = 4;
  const MIN = 60000;
  const DAY = 86400000;
  const FUZZ_RANGES = [
    { start: 2.5, end: 7, factor: 0.15 },
    { start: 7, end: 20, factor: 0.1 },
    { start: 20, end: Infinity, factor: 0.05 },
  ];

  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const round8 = (x) => Math.round(x * 1e8) / 1e8;

  // Kalendertag in UTC (wie die Referenz); die App ersetzt das durch den Lerntag ab 4 Uhr.
  const utcDay = (ms) => Math.floor(ms / DAY);
  const utcDayStart = (day) => day * DAY;

  function defaults() {
    return {
      w: W, retention: 0.9, maxInterval: 365, learningSteps: [1, 10], relearningSteps: [10],
      fuzz: true, dayOf: utcDay, dayStart: utcDayStart,
    };
  }

  function decayFactor(w) {
    const decay = -w[20];
    return { decay, factor: round8(Math.exp(Math.log(0.9) / decay) - 1) };
  }

  function retrievability(w, elapsedDays, s) {
    const { decay, factor } = decayFactor(w);
    return round8(Math.pow(1 + (factor * elapsedDays) / s, decay));
  }

  const initS = (w, g) => clamp(w[g - 1], S_MIN, S_MAX);
  const initD = (w, g) => round8(w[4] - Math.exp((g - 1) * w[5]) + 1);

  function nextD(w, d, g) {
    const delta = -w[6] * (g - 3);
    const damped = d + round8((delta * (10 - d)) / 9);
    return clamp(round8(w[7] * initD(w, EASY) + (1 - w[7]) * damped), 1, 10);
  }

  function recallS(w, d, s, r, g) {
    const hard = g === HARD ? w[15] : 1;
    const easy = g === EASY ? w[16] : 1;
    return round8(clamp(s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) * hard * easy), S_MIN, S_MAX));
  }

  function forgetS(w, d, s, r) {
    return round8(clamp(w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]), S_MIN, S_MAX));
  }

  function shortTermS(w, s, g) {
    const sinc = Math.pow(s, -w[19]) * Math.exp(w[17] * (g - 3 + w[18]));
    return round8(clamp(s * (g >= HARD ? Math.max(sinc, 1) : sinc), S_MIN, S_MAX));
  }

  // Neuer Gedächtniszustand (Stabilität s, Schwierigkeit d) nach Bewertung g.
  function memory(w, card, g, elapsedDays) {
    if (card.state === NEW) return { s: initS(w, g), d: clamp(initD(w, g), 1, 10) };
    const r = retrievability(w, elapsedDays, card.s);
    let s;
    if (elapsedDays === 0) s = shortTermS(w, card.s, g);
    else if (g === AGAIN) s = clamp(round8(card.s / Math.exp(w[17] * w[18])), S_MIN, forgetS(w, card.d, card.s, r));
    else s = recallS(w, card.d, card.s, r, g);
    return { s, d: nextD(w, card.d, g) };
  }

  function interval(params, s) {
    const P = Object.assign(defaults(), params);
    const { decay, factor } = decayFactor(P.w);
    return Math.max(Math.round((s / factor) * (Math.pow(P.retention, 1 / decay) - 1)), 1);
  }

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function fuzzRange(ivl, elapsedDays, maxIvl) {
    let delta = 1;
    for (const r of FUZZ_RANGES) delta += r.factor * Math.max(Math.min(ivl, r.end) - r.start, 0);
    const capped = Math.min(ivl, maxIvl);
    let lo = Math.max(2, Math.round(capped - delta));
    const hi = Math.min(Math.round(capped + delta), maxIvl);
    if (capped > elapsedDays) lo = Math.max(lo, elapsedDays + 1);
    return { lo: Math.min(lo, hi), hi };
  }

  function fuzzed(P, ivl, elapsedDays, seed) {
    const capped = Math.min(ivl, P.maxInterval);
    if (!P.fuzz || capped < 2.5) return Math.round(capped);
    const { lo, hi } = fuzzRange(capped, elapsedDays, P.maxInterval);
    return Math.floor(mulberry32(fnv1a(seed)) * (hi - lo + 1) + lo);
  }

  // Minuten für Lernschritte; null = Karte schließt die Lernphase ab.
  function stepMinutes(steps, step, g) {
    if (!steps.length || step >= steps.length) return null;
    if (g === AGAIN) return { minutes: steps[0], step: 0 };
    if (g === HARD) {
      if (step === 0) return { minutes: steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps[0] * 1.5, step: 0 };
      return { minutes: steps[step], step };
    }
    if (g === GOOD && step + 1 < steps.length) return { minutes: steps[step + 1], step: step + 1 };
    return null;
  }

  function newCard() {
    return { state: NEW, s: 0, d: 0, reps: 0, lapses: 0, step: 0, due: 0, last: 0, ivl: 0 };
  }

  // Wendet Bewertung g (1–4) zum Zeitpunkt now (ms) an; liefert eine neue Karte, card bleibt unverändert.
  // ivl = geplanter Abstand in Tagen (0 in Lernschritten). seed macht den Fuzz reproduzierbar.
  function next(card, g, now, params, seed) {
    const P = Object.assign(defaults(), params);
    const today = P.dayOf(now);
    const elapsed = card.state === NEW ? 0 : Math.max(0, today - P.dayOf(card.last));
    const mem = memory(P.w, card, g, elapsed);
    const out = Object.assign({}, card, mem, { reps: card.reps + 1, last: now });
    const seedStr = (seed === undefined ? String(now) : String(seed)) + '_' + out.reps;
    const graduate = (s, ivlSeed) => {
      const ivl = fuzzed(P, interval(P, s), elapsed, ivlSeed);
      Object.assign(out, { state: REVIEW, step: 0, ivl, due: P.dayStart(today + ivl) });
    };

    if (card.state === REVIEW) {
      if (g === AGAIN) {
        out.lapses = card.lapses + 1;
        const st = stepMinutes(P.relearningSteps, 0, AGAIN);
        if (st) Object.assign(out, { state: RELEARNING, step: 0, ivl: 0, due: now + st.minutes * MIN });
        else graduate(mem.s, seedStr);
        return out;
      }
      // Abstände für Schwer/Gut/Einfach monoton halten (Gut ≥ Schwer+1, Einfach ≥ Gut+1).
      const ivls = [HARD, GOOD, EASY].map((x) => {
        const m = x === g ? mem : memory(P.w, card, x, elapsed);
        return fuzzed(P, interval(P, m.s), elapsed, seedStr);
      });
      ivls[0] = Math.min(ivls[0], P.maxInterval);
      ivls[1] = Math.min(Math.max(ivls[1], ivls[0] + 1), P.maxInterval);
      ivls[2] = Math.min(Math.max(ivls[2], ivls[1] + 1), P.maxInterval);
      const ivl = ivls[g - 2];
      Object.assign(out, { state: REVIEW, step: 0, ivl, due: P.dayStart(today + ivl) });
      return out;
    }

    const relearn = card.state === RELEARNING;
    const st = stepMinutes(relearn ? P.relearningSteps : P.learningSteps, card.state === NEW ? 0 : card.step, g);
    if (st) Object.assign(out, { state: relearn ? RELEARNING : LEARNING, step: st.step, ivl: 0, due: now + st.minutes * MIN });
    else graduate(mem.s, seedStr);
    return out;
  }

  // Abstand bis zur nächsten Fälligkeit, kurz formatiert („1 Min“, „4 T“, „3 Mon“, „1,2 J“).
  function formatInterval(card, now) {
    if (card.state === LEARNING || card.state === RELEARNING) {
      const m = Math.max(1, Math.round((card.due - now) / MIN));
      return m < 60 ? m + ' Min' : Math.round(m / 60) + ' Std';
    }
    const d = card.ivl;
    if (d < 30) return d + ' T';
    if (d < 365) return Math.round(d / 30) + ' Mon';
    return String(Math.round((d / 365) * 10) / 10).replace('.', ',') + ' J';
  }

  TT.fsrs = {
    W, NEW, LEARNING, REVIEW, RELEARNING, AGAIN, HARD, GOOD, EASY,
    defaults, newCard, next, retrievability, interval, fuzzRange, formatInterval,
  };
})(globalThis.TT = globalThis.TT || {});
