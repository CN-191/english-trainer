(function (TT) {
  'use strict';

  // Tagesplanung der Vokabelkarten wie in Anki: Lernschritte zuerst, dann fällige Wiederholungen und
  // neue Wörter gemischt (Tageslimit pro Wort), Geschwister zurückstellen. Ein Lerntag beginnt um 4 Uhr.

  const F = TT.fsrs;
  const S = TT.vocabStore;
  const DAY = 86400000;
  const DAY_START_HOUR = 4;
  const LEVEL_RANK = { A1: 0, A2: 1, B1: 2, B2: 3, SU6: 4 };

  // Lerntag als fortlaufende Zahl (Ortszeit, Wechsel um 4 Uhr; sommerzeitfest).
  function dayOf(ms) {
    const d = new Date(ms);
    if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
    return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
  }

  // Beginn eines Lerntags (4 Uhr Ortszeit) in ms.
  function dayStart(day) {
    const u = new Date(day * DAY);
    return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), DAY_START_HOUR).getTime();
  }

  const dayKey = (day) => new Date(day * DAY).toISOString().slice(0, 10);

  const params = () => ({
    dayOf, dayStart, retention: 0.9, maxInterval: 365, learningSteps: [1, 10], relearningSteps: [10], fuzz: true,
  });

  const keyOf = (id, dir) => id + ':' + dir;
  const other = (dir) => (dir === 'ed' ? 'de' : 'ed');

  function cardOf(vocab, id, dir) {
    const raw = vocab.cards[keyOf(id, dir)];
    return raw ? S.decode(raw) : F.newCard();
  }

  const isNewCard = (vocab, id, dir) => cardOf(vocab, id, dir).state === F.NEW;
  const isSuspended = (vocab, id) => !!(vocab.suspended[id] && vocab.suspended[id].on);
  const isEdited = (vocab, id) => !!(vocab.edits[id] && vocab.edits[id].f);
  // Im Buch (StartUp 6) bis einschließlich der eingestellten Unit/Lesson?
  const inBook = (vocab, e) => {
    const b = vocab.book;
    return !!(e.book && b && b.on && (e.book.u < b.unit || (e.book.u === b.unit && e.book.l <= b.lesson)));
  };
  // Aktiv: nicht ausgesetzt und Niveau eingeschaltet oder im Buch schon erreicht (neue Buchwörter nur so)
  const isActive = (vocab, e) => !isSuspended(vocab, e.id) && (!!vocab.settings.levels[e.level] || inBook(vocab, e));
  // Wiederholen: zusätzlich alle Buchwörter – schon begonnene Karten laufen weiter, auch wenn die Stelle im Buch
  // zurückgesetzt oder der Buch-Wortschatz ausgeschaltet wurde (neue Karten gibt es dann nicht)
  const isReviewable = (vocab, e) => !isSuspended(vocab, e.id) && (!!vocab.settings.levels[e.level] || !!e.book);

  // Karte heute schon gezeigt (für „Geschwister zurückstellen“)?
  function seenToday(vocab, id, dir, today) {
    const c = cardOf(vocab, id, dir);
    return c.state !== F.NEW && dayOf(c.last) === today;
  }

  // Eintrag mit eigenen Änderungen (geänderter Satz: feste Hervorhebungsform exWord gilt nicht mehr).
  function view(vocab, base) {
    const e = vocab.edits[base.id];
    if (!e || !e.f) return base;
    const v = Object.assign({}, base, e.f);
    if (e.f.ex !== base.ex) v.exWord = '';
    return v;
  }

  const dirs = (vocab) => (vocab.settings.direction === 'both' ? ['ed', 'de'] : [vocab.settings.direction]);

  function hash(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // Reihenfolge neuer Wörter, auf allen Geräten gleich: nach Niveau (A1 zuerst) oder gemischt.
  let orderCache = { src: null, order: null, list: null };
  function newOrder(entries, order) {
    if (orderCache.src === entries && orderCache.order === order) return orderCache.list;
    const list = entries.slice().sort((a, b) =>
      (order === 'level' ? LEVEL_RANK[a.level] - LEVEL_RANK[b.level] : 0) || hash(a.id) - hash(b.id) || (a.id < b.id ? -1 : 1));
    orderCache = { src: entries, order, list };
    return list;
  }

  function dayStats(vocab, today) {
    return Object.assign({ n: 0, n2: 0, r: 0, ok: 0 }, vocab.days[dayKey(today)]);
  }

  // Was heute ansteht. Einträge: {entry, dir, card}.
  function plan(vocab, entries, now) {
    const today = dayOf(now);
    const ds = dirs(vocab);
    const learning = [];
    const review = [];
    const fresh = [];
    let nextDue = null;
    for (const e of entries) {
      if (!isReviewable(vocab, e)) continue;
      for (const d of ds) {
        const card = cardOf(vocab, e.id, d);
        if (card.state === F.LEARNING || card.state === F.RELEARNING) {
          learning.push({ entry: e, dir: d, card });
        } else if (card.state === F.REVIEW) {
          if (dayOf(card.due) > today) {
            if (nextDue === null || card.due < nextDue) nextDue = card.due;
          } else if (!seenToday(vocab, e.id, other(d), today)) {
            review.push({ entry: e, dir: d, card });
          }
        }
      }
    }
    const st = dayStats(vocab, today);
    let budget = Math.max(0, Math.floor(vocab.settings.newPerDay) - st.n);
    let budget2 = Math.max(0, Math.floor(vocab.settings.newPerDay) - st.n2);
    // Neue Wörter: zuerst das Buch bis zur aktuellen Stelle (Buchreihenfolge), danach wie eingestellt
    const fromBook = entries.filter((e) => inBook(vocab, e)).sort((a, b) => a.book.seq - b.book.seq);
    const taken = new Set(fromBook.map((e) => e.id));
    const order = fromBook.concat(newOrder(entries, vocab.settings.order).filter((e) => !taken.has(e.id)));
    for (const e of order) {
      if (budget <= 0 && budget2 <= 0) break;
      if (!isActive(vocab, e)) continue;
      const missing = ds.filter((d) => isNewCard(vocab, e.id, d));
      if (!missing.length) continue;
      const wordNew = isNewCard(vocab, e.id, 'ed') && isNewCard(vocab, e.id, 'de');
      if (wordNew) {
        if (budget > 0) {
          fresh.push({ entry: e, dir: missing[0], card: F.newCard() });
          budget--;
        }
      } else if (budget2 > 0 && !seenToday(vocab, e.id, other(missing[0]), today)) {
        fresh.push({ entry: e, dir: missing[0], card: F.newCard() });
        budget2--;
      }
    }
    learning.sort((a, b) => a.card.due - b.card.due);
    // Am selben Tag Fälliges bunt mischen (stabil pro Tag), nicht alphabetisch (sonst kommen light-n/light-v/light-adj hintereinander).
    const mix = (x) => hash(x.entry.id + ':' + today);
    review.sort((a, b) => a.card.due - b.card.due || mix(a) - mix(b) || (a.entry.id < b.entry.id ? -1 : 1));
    return { learning, review, fresh, nextDue, counts: { learning: learning.length, review: review.length, fresh: fresh.length } };
  }

  // Nächste Karte: fällige Lernschritte, sonst Wiederholung/neu gemischt (jede 4. Karte neu),
  // zuletzt noch nicht fällige Lernschritte vorgezogen. shown = bisher gezeigte Karten der Runde.
  function pick(vocab, entries, now, shown) {
    const p = plan(vocab, entries, now);
    const due = p.learning.filter((x) => x.card.due <= now);
    let item;
    if (due.length) item = due[0];
    else if (p.review.length && p.fresh.length) item = shown % 4 === 3 ? p.fresh[0] : p.review[0];
    else item = p.review[0] || p.fresh[0] || p.learning[0] || null;
    return { item, plan: p };
  }

  function bumpDay(vocab, now, delta, sign) {
    const k = dayKey(dayOf(now));
    const d = (vocab.days[k] = Object.assign({ n: 0, n2: 0, r: 0, ok: 0 }, vocab.days[k]));
    for (const f of Object.keys(delta)) d[f] = Math.max(0, d[f] + sign * delta[f]);
    return k;
  }

  // Bewertung g (1 Nochmal … 4 Einfach). Liefert {undo, docs}: Rückgängig-Info und geänderte Dokumente.
  function answer(vocab, entry, dir, g, now) {
    const key = keyOf(entry.id, dir);
    const prev = vocab.cards[key] ? vocab.cards[key].slice() : null;
    const card = cardOf(vocab, entry.id, dir);
    const wasNew = card.state === F.NEW;
    const wordNew = wasNew && isNewCard(vocab, entry.id, other(dir));
    const wasReview = card.state === F.REVIEW;
    vocab.cards[key] = S.encode(F.next(card, g, now, params(), key), now);
    const delta = { n: wasNew && wordNew ? 1 : 0, n2: wasNew && !wordNew ? 1 : 0, r: wasReview ? 1 : 0, ok: wasReview && g > F.AGAIN ? 1 : 0 };
    const dk = bumpDay(vocab, now, delta, 1);
    return { undo: { key, prev, dk, delta, level: entry.level, dir }, docs: [S.docOf(entry.level, dir), 'vocab-meta'] };
  }

  // Letzte Bewertung zurücknehmen; der alte Zustand bekommt einen neuen Änderungszeitpunkt,
  // damit er sich beim Abgleich gegen die Bewertung durchsetzt.
  function undo(vocab, token, now) {
    vocab.cards[token.key] = token.prev ? token.prev.slice(0, 9).concat(now) : S.encode(F.newCard(), now);
    const d = vocab.days[token.dk];
    if (d) for (const f of Object.keys(token.delta)) d[f] = Math.max(0, d[f] - token.delta[f]);
    return [S.docOf(token.level, token.dir), 'vocab-meta'];
  }

  // „Schon bekannt“: neue Karten des Worts (beide Richtungen) wie „Einfach“ beim ersten Mal einplanen.
  function markKnown(vocab, entry, now) {
    const docs = [];
    for (const d of S.DIRS) {
      if (!isNewCard(vocab, entry.id, d)) continue;
      const key = keyOf(entry.id, d);
      vocab.cards[key] = S.encode(F.next(F.newCard(), F.EASY, now, params(), key), now);
      docs.push(S.docOf(entry.level, d));
    }
    return docs;
  }

  function setSuspended(vocab, id, on, now) {
    vocab.suspended[id] = { t: now, on: !!on };
    return ['vocab-meta'];
  }

  function setEdit(vocab, id, fields, now) {
    const f = {};
    for (const n of S.EDIT_FIELDS) f[n] = String(fields[n] || '').trim();
    vocab.edits[id] = { t: now, f };
    return ['vocab-edits'];
  }

  function restoreEdit(vocab, id, now) {
    vocab.edits[id] = { t: now, f: null };
    return ['vocab-edits'];
  }

  function setSettings(vocab, patch, now) {
    vocab.settings = Object.assign({}, vocab.settings, patch, { t: now });
    return ['vocab-meta'];
  }

  // Stelle im Buch ändern, z. B. {unit: 1, lesson: 3} oder {on: false}
  function setBook(vocab, patch, now) {
    vocab.book = Object.assign({}, vocab.book || S.defaultBook(), patch, { t: now });
    return [S.BOOK_DOC];
  }

  // Status eines Worts für die Wortliste: neu, lernend, gelernt, ausgesetzt.
  function status(vocab, id) {
    if (isSuspended(vocab, id)) return 'suspended';
    const states = S.DIRS.map((d) => cardOf(vocab, id, d).state);
    if (states.some((s) => s === F.REVIEW || s === F.RELEARNING)) return 'learned';
    if (states.some((s) => s === F.LEARNING)) return 'learning';
    return 'new';
  }

  // Zahlen für die Statistik.
  function stats(vocab, entries, now) {
    const today = dayOf(now);
    const levels = {};
    for (const lv of S.LEVELS.concat(S.BOOK_LEVEL)) levels[lv] = { learned: 0, total: 0 };
    // Buch: alle Buchwörter (auch gemeinsame) und die bis zur aktuellen Stelle
    const book = { learned: 0, total: 0, reached: 0, reachedLearned: 0 };
    const forecast = [0, 0, 0, 0, 0, 0, 0];
    for (const e of entries) {
      const learned = status(vocab, e.id) === 'learned';
      if (levels[e.level]) {
        levels[e.level].total++;
        if (learned) levels[e.level].learned++;
      }
      if (e.book) {
        book.total++;
        if (learned) book.learned++;
        if (inBook(vocab, e) && !isSuspended(vocab, e.id)) {
          book.reached++;
          if (learned) book.reachedLearned++;
        }
      }
      if (!isReviewable(vocab, e)) continue; // wie „fällig“ in der Übersicht: nur aktive Wörter in den gewählten Richtungen
      for (const d of dirs(vocab)) {
        const c = cardOf(vocab, e.id, d);
        if (c.state !== F.REVIEW) continue;
        const i = Math.max(0, dayOf(c.due) - today);
        if (i < 7) forecast[i]++;
      }
    }
    let r = 0;
    let ok = 0;
    for (let i = 0; i < 30; i++) {
      const x = vocab.days[dayKey(today - i)];
      if (x) {
        r += x.r;
        ok += x.ok;
      }
    }
    return { levels, book, today: dayStats(vocab, today), forecast, retention: r ? ok / r : null };
  }

  // „Sicher“ wie „ausgereift“ in Anki: geplanter Abstand mindestens 21 Tage.
  const MATURE_IVL = 21;
  const isMatureCard = (c) => c.state === F.REVIEW && c.ivl >= MATURE_IVL;

  // Tage von der Einführung eines Worts bis „sicher“, wenn man immer „Gut“ wählt (FSRS-Simulation, einmal berechnet).
  let matureDaysCache = null;
  function matureDays() {
    if (matureDaysCache !== null) return matureDaysCache;
    const P = params();
    let c = F.newCard();
    let t = dayStart(1000) + 6 * 3600000;
    for (let i = 0; i < 50; i++) {
      c = F.next(c, F.GOOD, t, P, 'prognose:ed');
      if (isMatureCard(c)) break;
      t = c.state === F.REVIEW ? c.due + 3600000 : c.due;
    }
    matureDaysCache = dayOf(t) - 1000;
    return matureDaysCache;
  }

  // Tempo der letzten 14 Lerntage (ohne heute): Ø neue Wörter pro Tag, ab dem ersten Tag mit Vokabeln.
  // null, wenn es noch keine 3 Tage Verlauf gibt.
  function recentPace(vocab, today) {
    const keys = Object.keys(vocab.days).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    if (!keys.length) return null;
    const first = Math.round(Date.parse(keys[0] + 'T00:00:00Z') / DAY);
    const from = Math.max(first, today - 14);
    const span = today - from;
    if (span < 3) return null;
    let n = 0;
    for (let d = from; d < today; d++) {
      const x = vocab.days[dayKey(d)];
      if (x) n += x.n;
    }
    return n / span;
  }

  // Prognose wie bei Anki-Erweiterungen: wann sind alle Wörter einer Gruppe eingeführt und wann sicher?
  // Gruppen: Buch bis zur Stelle, ganzes Buch (wenn du im Buch weiterrückst), alle eingeschalteten Wörter.
  // Tempo: eingestellte neue Wörter pro Tag, oder das tatsächliche Tempo der letzten 14 Tage, wenn es niedriger ist.
  function forecastFinish(vocab, entries, now) {
    const today = dayOf(now);
    const ds = dirs(vocab);
    const setting = Math.max(0, Math.floor(vocab.settings.newPerDay));
    const actual = recentPace(vocab, today);
    const useActual = actual !== null && actual < setting;
    const pace = useActual ? actual : setting;
    // heute noch übrig nach Einstellung (wie in plan)
    const todayLeft = Math.max(0, setting - dayStats(vocab, today).n);
    const both = ds.length > 1;
    const groups = [
      { id: 'reached', match: (e) => inBook(vocab, e) && !isSuspended(vocab, e.id) },
      { id: 'book', match: (e) => !!e.book && !isSuspended(vocab, e.id) },
      { id: 'all', match: (e) => isActive(vocab, e) },
    ].map((g) => ({ id: g.id, match: g.match, total: 0, mature: 0, remaining: 0 }));
    for (const e of entries) {
      const cards = ds.map((d) => cardOf(vocab, e.id, d));
      const wordNew = isNewCard(vocab, e.id, 'ed') && isNewCard(vocab, e.id, 'de');
      const mature = cards.every(isMatureCard);
      for (const g of groups) {
        if (!g.match(e)) continue;
        g.total++;
        if (mature) g.mature++;
        if (wordNew) g.remaining++;
      }
    }
    const out = groups.map((g) => {
      let seenDay = null;
      if (!g.remaining) seenDay = today;
      else if (pace > 0) {
        const fromToday = useActual ? 0 : Math.min(g.remaining, todayLeft);
        const rest = g.remaining - fromToday;
        // zweite Richtung eines Worts frühestens am nächsten Tag (Geschwister zurückstellen)
        seenDay = today + (rest > 0 ? Math.ceil(rest / pace) : 0) + (both ? 1 : 0);
      }
      const matureDay = g.remaining ? (seenDay === null ? null : seenDay + matureDays()) : null;
      return { id: g.id, total: g.total, mature: g.mature, remaining: g.remaining, seenDay, matureDay };
    });
    return { pace, setting, actual, useActual, matureDays: matureDays(), groups: out };
  }

  // Abstände für die vier Bewertungsknöpfe, z. B. ['1 Min', '6 Min', '10 Min', '2 T'].
  function preview(vocab, entry, dir, now) {
    const card = cardOf(vocab, entry.id, dir);
    const key = keyOf(entry.id, dir);
    return [F.AGAIN, F.HARD, F.GOOD, F.EASY].map((g) => F.formatInterval(F.next(card, g, now, params(), key), now));
  }

  TT.deck = {
    dayOf, dayStart, dayKey, params, cardOf, view, dirs, newOrder, plan, pick, answer, undo, markKnown,
    setSuspended, setEdit, restoreEdit, setSettings, setBook, status, stats, forecastFinish, preview, isSuspended, isEdited, inBook,
  };
})(globalThis.TT = globalThis.TT || {});
