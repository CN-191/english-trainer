(function (TT) {
  'use strict';

  // Hausaufgabenheft: Aufgaben aus dem Unterricht zum Abhaken, je Konto.
  // Lokal unter eigenem Schlüssel, in der Cloud im Dokument „homework“ (über TT.sync.joinDoc).
  // Eintrag: { t (geändert), c (angelegt), f: { day, book, page, task, done } | null (gelöscht) }.
  // Zusammenführen pro Eintrag: die neuere Änderung gewinnt; Gelöschte bleiben als Merker, damit sie nicht
  // von einem anderen Gerät zurückkommen.

  const KEY = (TT.storageNs || '') + 'englishTrainer.homework.v1';
  const DOC = 'homework';
  const BOOKS = ['sb', 'wb', 'other'];
  const BOOK_LABEL = { sb: 'Student Book', wb: 'Workbook', other: 'Sonstiges' };
  const ID = /^hw_[a-z0-9]{4,24}$/;
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const MAX = 2000;
  const MAX_T = 4e12;
  const BAD_KEYS = ['__proto__', 'constructor', 'prototype'];

  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isTime = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_T;
  const str = (v, max) => typeof v === 'string' && v.length <= max;

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
      if (e.f === null) {
        out.items[id] = { t: e.t, c, f: null };
        n++;
        continue;
      }
      const f = e.f;
      if (!isObj(f) || !DAY.test(f.day) || !BOOKS.includes(f.book) || !str(f.page, 20) || !str(f.task, 300) || typeof f.done !== 'boolean') continue;
      if (!f.page.trim() && !f.task.trim()) continue;
      out.items[id] = { t: e.t, c, f: { day: f.day, book: f.book, page: f.page, task: f.task, done: f.done } };
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

  // Lokales Datum als JJJJ-MM-TT
  function today(now) {
    const d = new Date(now || Date.now());
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function add(hw, fields, now) {
    const id = 'hw_' + now.toString(36) + Math.random().toString(36).slice(2, 6);
    hw.items[id] = {
      t: now, c: now,
      f: {
        day: DAY.test(fields.day) ? fields.day : today(now),
        book: BOOKS.includes(fields.book) ? fields.book : 'other',
        page: String(fields.page || '').trim().slice(0, 20),
        task: String(fields.task || '').trim().slice(0, 300),
        done: false,
      },
    };
    return id;
  }

  function setDone(hw, id, done, now) {
    const e = hw.items[id];
    if (!e || !e.f) return false;
    hw.items[id] = { t: now, c: e.c, f: Object.assign({}, e.f, { done: !!done }) };
    return true;
  }

  function remove(hw, id, now) {
    const e = hw.items[id];
    if (!e || !e.f) return false;
    hw.items[id] = { t: now, c: e.c, f: null };
    return true;
  }

  // Sichtbare Aufgaben: offene nach Stunde (älteste zuerst), erledigte nach Stunde (neueste zuerst)
  function list(hw) {
    const all = Object.keys(hw.items).filter((id) => hw.items[id].f).map((id) => Object.assign({ id, c: hw.items[id].c }, hw.items[id].f));
    const byDay = (dir) => (a, b) => (a.day < b.day ? -dir : a.day > b.day ? dir : a.c - b.c);
    return {
      open: all.filter((x) => !x.done).sort(byDay(1)),
      done: all.filter((x) => x.done).sort(byDay(-1)),
    };
  }

  function load() {
    try {
      const raw = globalThis.localStorage.getItem(KEY);
      return raw ? sanitize(JSON.parse(raw)) : defaults();
    } catch (e) {
      return defaults();
    }
  }

  function save(hw) {
    try {
      globalThis.localStorage.setItem(KEY, JSON.stringify(hw));
      return true;
    } catch (e) {
      return false;
    }
  }

  TT.homework = { KEY, DOC, BOOKS, BOOK_LABEL, defaults, sanitize, merge, today, add, setDone, remove, list, load, save };
})(globalThis.TT = globalThis.TT || {});
