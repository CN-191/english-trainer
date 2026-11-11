(function (TT) {
  'use strict';

  // TT.storageNs: in der Web-Version ein Vorsatz je Konto (js/cloud/supa.js), sonst leer
  const KEY = (TT.storageNs || '') + 'tenseTrainer.v1';
  let memory = null; // Ersatz, wenn localStorage fehlt (Node, private Fenster)

  function defaults() {
    return {
      version: 1,
      updatedAt: 0,
      settings: { theme: 'auto', inputMode: 'type' },
      history: {},
      confusions: {},
      review: [],
      days: {},
      stories: {},
      daily: {}, // Themen im täglichen Training: nur geänderte Schalter { <Thema>: { t, on } }, sonst an
    };
  }

  const BAD_KEYS = ['__proto__', 'constructor', 'prototype'];
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const okKey = (k) => !BAD_KEYS.includes(k);
  const isTense = (id) => typeof id === 'string' && (TT.TENSE_IDS || []).includes(id);
  // Verlauf und Fehlerkiste gibt es für Zeitformen und Unterrichtsthemen. Themen-IDs und Übungsarten
  // werden nur nach ihrer Form geprüft, nicht gegen die Liste dieser Version: Ein Gerät mit einer älteren
  // oder neueren App-Version darf Themen, die es nicht kennt, nicht verwerfen – sonst würde es beim
  // nächsten Speichern den Fortschritt dieser Themen auch in der Cloud löschen. Abgespielt werden nur
  // bekannte Themen (siehe TT.progress.dueReviews).
  const isTopic = (id) => isTense(id) || (typeof id === 'string' && /^[a-z][a-z0-9-]{1,40}$/.test(id));
  const EX_IDS = ['cloze', 'identify', 'errorspot', 'transform', 'translate', 'story', 'l-transform', 'l-cloze', 'l-errorspot', 'l-identify', 'l-replace', 'l-order'];
  const isEx = (v) => EX_IDS.includes(v) || (typeof v === 'string' && /^l-[a-z]{1,20}$/.test(v));
  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

  // Baut einen frischen Zustand Feld für Feld und verwirft alles Ungültige.
  function sanitize(obj) {
    const out = defaults();
    const src = isObj(obj) ? obj : {};
    if (isNum(src.updatedAt) && src.updatedAt >= 0) out.updatedAt = src.updatedAt;
    const st = isObj(src.settings) ? src.settings : {};
    if (['auto', 'light', 'dark'].includes(st.theme)) out.settings.theme = st.theme;
    if (['type', 'choice'].includes(st.inputMode)) out.settings.inputMode = st.inputMode;

    if (isObj(src.history)) {
      for (const k of Object.keys(src.history)) {
        if (!okKey(k) || !isTopic(k) || !Array.isArray(src.history[k])) continue;
        out.history[k] = src.history[k]
          .filter((e) => isObj(e) && isNum(e.t) && [0, 0.5, 1].includes(e.score) && isEx(e.ex))
          .map((e) => ({ t: e.t, score: e.score, ex: e.ex }))
          .slice(-20);
      }
    }
    if (isObj(src.confusions)) {
      for (const k of Object.keys(src.confusions)) {
        const parts = k.split('>');
        const v = src.confusions[k];
        if (okKey(k) && parts.length === 2 && isTense(parts[0]) && isTense(parts[1]) && parts[0] !== parts[1] && Number.isInteger(v) && v > 0) out.confusions[k] = v;
      }
    }
    if (Array.isArray(src.review)) {
      for (const r of src.review) {
        if (isObj(r) && typeof r.id === 'string' && isTopic(r.tense) && (r.confusedWith === null || isTense(r.confusedWith)) &&
            isEx(r.ex) && Number.isInteger(r.box) && r.box >= 1 && r.box <= 4 && isNum(r.due)) {
          out.review.push({ id: r.id, tense: r.tense, confusedWith: r.confusedWith, ex: r.ex, box: r.box, due: r.due });
        }
      }
    }
    if (isObj(src.days)) {
      for (const k of Object.keys(src.days)) {
        const v = src.days[k];
        if (okKey(k) && /^\d{4}-\d{2}-\d{2}$/.test(k) && isNum(v) && v >= 0) out.days[k] = v;
      }
    }
    if (isObj(src.stories)) {
      for (const k of Object.keys(src.stories)) {
        const v = src.stories[k];
        if (okKey(k) && isObj(v) && isNum(v.best) && v.best >= 0 && v.best <= 1) out.stories[k] = { best: v.best };
      }
    }
    if (isObj(src.daily)) {
      for (const k of Object.keys(src.daily)) {
        const v = src.daily[k];
        if (okKey(k) && isTopic(k) && isObj(v) && isNum(v.t) && v.t >= 0 && typeof v.on === 'boolean') out.daily[k] = { t: v.t, on: v.on };
      }
    }
    return out;
  }

  function storage() {
    try {
      const ls = globalThis.localStorage;
      if (!ls) return null;
      ls.getItem(KEY);
      return ls;
    } catch (e) {
      return null;
    }
  }

  const ls = storage();

  function backup(raw) {
    try {
      if (ls) ls.setItem(KEY + '.backup', raw);
    } catch (e) {
      /* Sicherung nicht möglich */
    }
  }

  function load() {
    let raw = null;
    try {
      raw = ls ? ls.getItem(KEY) : memory;
    } catch (e) {
      return defaults();
    }
    if (!raw) return defaults();
    try {
      const obj = JSON.parse(raw);
      if (isObj(obj) && obj.version === 1) return sanitize(obj);
    } catch (e) {
      /* beschädigt */
    }
    backup(raw);
    return defaults();
  }

  function save(state) {
    try {
      const raw = JSON.stringify(state);
      if (ls) ls.setItem(KEY, raw);
      else memory = raw;
      return true;
    } catch (e) {
      try {
        memory = JSON.stringify(state);
      } catch (e2) {
        /* ignorieren */
      }
      return false;
    }
  }

  function exportText(state) {
    return JSON.stringify(state);
  }

  function importText(text) {
    let obj;
    try {
      obj = JSON.parse(String(text).trim());
    } catch (e) {
      throw new Error('Der Text ist ungültig (kein gültiger Fortschritts-Code).');
    }
    if (!isObj(obj)) throw new Error('Der Text ist ungültig.');
    if (obj.version !== 1) throw new Error('Unbekannte Version des Fortschritts-Codes.');
    return sanitize(obj);
  }

  TT.store = { defaults, load, save, exportText, importText, available: !!ls };
})(globalThis.TT = globalThis.TT || {});
