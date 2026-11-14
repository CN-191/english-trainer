(function (TT) {
  'use strict';

  // Stunden: Zusammenfassung jeder Unterrichtsstunde (aus der Aufnahme erstellt, in der App bearbeitbar), je Konto.
  // Lokal unter eigenem Schlüssel, in der Cloud im Dokument „lesson-log“ (über TT.sync.joinDoc).
  // Eintrag: { t (geändert), c (angelegt), f: Stunde | null (gelöscht) }; zusammengeführt pro Stunde (neuere gewinnt).
  // Stunde: { day, title, book, minutes, topic, did[], teacher[], noticed[], words[], grammar[], homework[], questions[], tips[], notes }
  //   teacher/noticed: Fehler { said, fix, why } – vom Lehrer korrigiert bzw. beim Auswerten bemerkt
  //   words: { en, de } · homework: { book: sb|wb|other, page, task } · übrige Listen: Text je Zeile

  const KEY = (TT.storageNs || '') + 'englishTrainer.lessonLog.v1';
  const DOC = 'lesson-log';
  const ID = /^ls_[a-z0-9]{4,24}$/;
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const BOOKS = ['sb', 'wb', 'other'];
  const MAX = 1000;
  const MAX_ITEMS = 200;
  const MAX_T = 4e12;
  const BAD_KEYS = ['__proto__', 'constructor', 'prototype'];
  const LISTS = ['did', 'grammar', 'questions', 'tips'];
  const MISTAKES = ['teacher', 'noticed'];

  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isTime = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_T;
  const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const arr = (v) => (Array.isArray(v) ? v.slice(0, MAX_ITEMS) : []);

  function cleanLesson(f) {
    if (!isObj(f) || !DAY.test(f.day)) return null;
    const out = {
      day: f.day,
      title: text(f.title, 200),
      book: text(f.book, 100),
      minutes: typeof f.minutes === 'number' && f.minutes > 0 && f.minutes < 1000 ? Math.round(f.minutes) : 0,
      topic: text(f.topic, 3000),
      notes: text(f.notes, 10000),
    };
    for (const k of LISTS) out[k] = arr(f[k]).map((s) => text(s, 500)).filter(Boolean);
    for (const k of MISTAKES) {
      out[k] = arr(f[k]).filter(isObj).map((m) => ({ said: text(m.said, 300), fix: text(m.fix, 300), why: text(m.why, 500) }))
        .filter((m) => m.said || m.fix);
    }
    out.words = arr(f.words).filter(isObj).map((w) => ({ en: text(w.en, 100), de: text(w.de, 300) })).filter((w) => w.en && w.de);
    out.homework = arr(f.homework).filter(isObj).map((x) => ({
      book: BOOKS.includes(x.book) ? x.book : 'other', page: text(x.page, 20), task: text(x.task, 300),
    })).filter((x) => x.page || x.task);
    return out;
  }

  function defaults() {
    return { items: {} };
  }

  function sanitize(obj) {
    const out = defaults();
    const src = isObj(obj) && isObj(obj.items) ? obj.items : {};
    let n = 0;
    for (const id of Object.keys(src)) {
      if (n >= MAX) break;
      const e = src[id];
      if (BAD_KEYS.includes(id) || !ID.test(id) || !isObj(e) || !isTime(e.t)) continue;
      const c = isTime(e.c) ? e.c : e.t;
      const f = e.f === null ? null : cleanLesson(e.f);
      if (e.f !== null && !f) continue;
      out.items[id] = { t: e.t, c, f };
      n++;
    }
    return out;
  }

  function merge(a, b) {
    const A = sanitize(a);
    const B = sanitize(b);
    const items = Object.assign({}, A.items);
    for (const id of Object.keys(B.items)) {
      const x = items[id];
      const y = B.items[id];
      if (!x || y.t > x.t || (y.t === x.t && JSON.stringify(y) > JSON.stringify(x))) items[id] = y;
    }
    return { items };
  }

  function newId(now) {
    return 'ls_' + now.toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // Neue Stunde anlegen; liefert die ID
  function add(log, fields, now) {
    const id = newId(now);
    log.items[id] = { t: now, c: now, f: cleanLesson(Object.assign({ day: TT.homework.today(now) }, fields)) || cleanLesson({ day: TT.homework.today(now) }) };
    return id;
  }

  // Felder einer Stunde ändern (nur die übergebenen)
  function update(log, id, fields, now) {
    const e = log.items[id];
    if (!e || !e.f) return false;
    const f = cleanLesson(Object.assign({}, e.f, fields));
    if (!f) return false;
    log.items[id] = { t: now, c: e.c, f };
    return true;
  }

  function remove(log, id, now) {
    const e = log.items[id];
    if (!e || !e.f) return false;
    log.items[id] = { t: now, c: e.c, f: null };
    return true;
  }

  function get(log, id) {
    const e = log.items[id];
    return e && e.f ? Object.assign({ id }, e.f) : null;
  }

  // Sichtbare Stunden, neueste zuerst
  function list(log) {
    return Object.keys(log.items).filter((id) => log.items[id].f)
      .map((id) => Object.assign({ id, c: log.items[id].c }, log.items[id].f))
      .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : b.c - a.c));
  }

  // ---- Bearbeiten als Text: eine Zeile je Eintrag ----
  const lines = (s) => String(s || '').split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '').trim()).filter(Boolean);

  const listText = (items) => items.join('\n');
  const parseList = (s) => lines(s);

  // Fehler: „said → fix — why“ (statt → auch ->, statt — auch „ | “); getrennt wird jeweils nur am ersten Zeichen,
  // damit Striche und Pfeile in der Erklärung erhalten bleiben
  const mistakeText = (items) => items.map((m) => m.said + ' → ' + m.fix + (m.why ? ' — ' + m.why : '')).join('\n');
  const splitFirst = (s, re) => {
    const m = s.match(re);
    return m ? [s.slice(0, m.index), s.slice(m.index + m[0].length)] : [s, ''];
  };
  function parseMistakes(s) {
    return lines(s).map((l) => {
      const [main, why] = splitFirst(l, /\s+(?:—|\|)\s+/);
      const [said, fix] = splitFirst(main, /\s*(?:→|->|=>)\s*/);
      return { said: said.trim(), fix: fix.trim(), why: why.trim() };
    });
  }

  // Wörter: „en – de“ (auch „en - de“, „en = de“, „en: de“)
  const wordText = (items) => items.map((w) => w.en + ' – ' + w.de).join('\n');
  function parseWords(s) {
    return lines(s).map((l) => {
      const m = l.match(/^(.+?)\s+(?:–|—|-|=)\s+(.+)$/) || l.match(/^(.+?)\s*[=:]\s*(.+)$/);
      return m ? { en: m[1].trim(), de: m[2].trim() } : null;
    }).filter(Boolean);
  }

  // Hausaufgaben: „SB p. 15: Aufgabe“, „WB p. 9–10“, sonst nur die Aufgabe
  function homeworkText(items) {
    return items.map((x) => {
      if (x.book === 'other') return x.task;
      return x.book.toUpperCase() + (x.page ? ' p. ' + x.page : '') + (x.task ? ': ' + x.task : '');
    }).join('\n');
  }
  function parseHomework(s) {
    return lines(s).map((l) => {
      const m = l.match(/^(SB|WB)\b\s*(?:(?:p\.?|S\.)\s*([^:]+?))?\s*(?::\s*(.*))?$/i);
      if (!m) return { book: 'other', page: '', task: l };
      return { book: m[1].toLowerCase(), page: (m[2] || '').trim(), task: (m[3] || '').trim() };
    });
  }

  // Steht diese Aufgabe schon im Hausaufgabenheft (gleiche Stunde, gleiches Buch, gleiche Seite bzw. Aufgabe)?
  const norm = (s) => String(s || '').toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, '');
  function inHomework(hw, day, x) {
    return Object.keys(hw.items).some((id) => {
      const f = hw.items[id].f;
      if (!f || f.day !== day || f.book !== x.book) return false;
      return x.page ? norm(f.page) === norm(x.page) : norm(f.task) === norm(x.task);
    });
  }

  function load() {
    try {
      const raw = globalThis.localStorage.getItem(KEY);
      return raw ? sanitize(JSON.parse(raw)) : defaults();
    } catch (e) {
      return defaults();
    }
  }

  function save(log) {
    try {
      globalThis.localStorage.setItem(KEY, JSON.stringify(log));
      return true;
    } catch (e) {
      return false;
    }
  }

  TT.lessonLog = {
    KEY, DOC, defaults, sanitize, merge, add, update, remove, get, list, load, save, inHomework,
    listText, parseList, mistakeText, parseMistakes, wordText, parseWords, homeworkText, parseHomework,
  };
})(globalThis.TT = globalThis.TT || {});
