(function (TT) {
  'use strict';

  // Vokabel-Einträge: Wortliste aus der PDF (TT.VOCAB_LIST) plus Inhalte aus den Paketen in
  // js/data/vocab/ (Übersetzung, Hinweis, Beispielsatz, Emoji). Nur Einträge mit Inhalt sind lernbar.
  // Dazu die Wörter aus dem Lehrbuch StartUp 6 (js/data/su6/): Gibt es ein Wort schon in Oxford 3000,
  // nutzt es dessen Eintrag (gemeinsame Karte); neue Wörter bekommen das Niveau „SU6“.

  const LEVELS = ['A1', 'A2', 'B1', 'B2'];
  const POS_DE = {
    n: 'Nomen', v: 'Verb', adj: 'Adjektiv', adv: 'Adverb', prep: 'Präposition', conj: 'Konjunktion',
    pron: 'Pronomen', det: 'Begleiter', exclam: 'Ausruf', num: 'Zahlwort', modal: 'Modalverb',
    aux: 'Hilfsverb', art: 'Artikel', inf: 'Infinitiv-Partikel', phrase: 'Wendung',
  };
  const BOOK_LEVEL = 'SU6';
  const bookRows = [];

  const content = {};
  const duplicates = [];
  let entries = null;
  let byId = null;
  let levelById = null;

  TT.addVocab = (list) => {
    for (const c of list) {
      if (content[c.id]) duplicates.push(c.id);
      content[c.id] = c;
    }
    entries = null;
    byId = null;
  };

  // Buchwörter (StartUp 6) in Buchreihenfolge: {u, l, en, pos, id, def} – ohne de: gemeinsame Karte mit dem
  // Oxford-Eintrag id; mit de/hint/ex/exDe/emoji/exWord: neuer Eintrag mit Niveau „SU6“.
  TT.addBookSU6 = (rows) => {
    for (const r of rows) {
      bookRows.push(r);
      if (r.de !== undefined) {
        TT.addVocab([{ id: r.id, de: r.de, hint: r.hint || '', ex: r.ex, exDe: r.exDe, emoji: r.emoji || '', exWord: r.exWord || '' }]);
      }
    }
    entries = null;
    byId = null;
    levelById = null;
  };

  // Stelle im Buch je Eintrags-ID (erstes Vorkommen): {u, l, seq} und die englische Definition.
  function bookInfo() {
    const out = {};
    bookRows.forEach((r, seq) => {
      if (!out[r.id]) out[r.id] = { book: Object.freeze({ u: r.u, l: r.l, seq }), def: r.def || '', row: r };
    });
    return out;
  }

  // Alle lernbaren Einträge: Oxford in PDF-Reihenfolge, danach neue Buchwörter (eingefroren, zwischengespeichert).
  TT.vocabEntries = () => {
    if (entries) return entries;
    entries = [];
    const info = bookInfo();
    const inList = new Set();
    const make = (id, en, pos, level, sense, c) => {
      const b = info[id];
      return Object.freeze({
        id, en, pos, level, sense,
        de: c.de, hint: c.hint || '', ex: c.ex, exDe: c.exDe, emoji: c.emoji || '', exWord: c.exWord || '',
        book: b ? b.book : null, def: b ? b.def : '',
      });
    };
    for (const [id, en, pos, level, sense] of TT.VOCAB_LIST || []) {
      inList.add(id);
      const c = content[id];
      if (c) entries.push(make(id, en, pos, level, sense, c));
    }
    for (const id of Object.keys(info)) {
      const r = info[id].row;
      if (!inList.has(id) && content[id]) entries.push(make(id, r.en, r.pos, BOOK_LEVEL, '', content[id]));
    }
    return entries;
  };

  // Alle Einträge aus dem Buch (gemeinsame und neue) in Buchreihenfolge.
  TT.bookEntries = () => TT.vocabEntries().filter((e) => e.book).sort((a, b) => a.book.seq - b.book.seq);

  TT.vocabEntry = (id) => {
    if (!byId) {
      byId = {};
      for (const e of TT.vocabEntries()) byId[e.id] = e;
    }
    return byId[id] || null;
  };

  // Niveau einer Eintrags-ID laut Wortliste (auch ohne Inhalt), sonst null.
  TT.vocabLevel = (id) => {
    if (!levelById) {
      levelById = {};
      for (const row of TT.VOCAB_LIST || []) levelById[row[0]] = row[3];
      for (const r of bookRows) if (!levelById[r.id]) levelById[r.id] = BOOK_LEVEL;
    }
    return levelById[id] || null;
  };

  TT.vocabPosLabel = (pos) => pos.split('/').map((p) => POS_DE[p] || p).join(' / ');
  TT.vocabContentIds = () => Object.keys(content);
  TT.vocabDuplicates = () => duplicates.slice();
  TT.VOCAB_LEVELS = LEVELS;
  TT.BOOK_LEVEL = BOOK_LEVEL;
})(globalThis.TT = globalThis.TT || {});
