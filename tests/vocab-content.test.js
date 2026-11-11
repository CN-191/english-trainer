// Prüft die Inhalte aller vorhandenen Vokabel-Pakete (js/data/vocab/*.js).
const LIST_IDS = new Set(TT.VOCAB_LIST.map((r) => r[0]));
const seg = new Intl.Segmenter('de', { granularity: 'grapheme' });
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('Vokabel-Inhalte: IDs gehören zur Wortliste (oder sind neue Buchwörter) und kommen nur einmal vor', () => {
  const bookIds = new Set(TT.bookEntries().map((e) => e.id));
  assert.deepStrictEqual(TT.vocabContentIds().filter((id) => !LIST_IDS.has(id) && !bookIds.has(id)), []);
  assert.deepStrictEqual(TT.vocabDuplicates(), []);
});

test('Vokabel-Inhalte: Pflichtfelder, Formate, Lernwort im Satz', () => {
  const problems = [];
  for (const e of TT.vocabEntries()) {
    const p = (msg) => problems.push(e.id + ': ' + msg);
    for (const f of ['de', 'ex', 'exDe']) if (typeof e[f] !== 'string' || !e[f].trim()) p(f + ' fehlt');
    if (typeof e.hint !== 'string' || typeof e.emoji !== 'string') p('hint/emoji müssen Text sein');
    if (e.de.length > 80) p('de länger als 80 Zeichen');
    if (!/^[A-Z0-9"]/.test(e.ex)) p('ex beginnt nicht mit Großbuchstaben');
    if (!/[.!?]"?$/.test(e.ex)) p('ex endet nicht mit . ! ?');
    if (!/[.!?]"?$/.test(e.exDe)) p('exDe endet nicht mit . ! ?');
    if (e.ex.split(/\s+/).length > 16) p('ex länger als 16 Wörter');
    if (/[’‘“”„]/.test(e.ex)) p('ex mit typografischen Anführungszeichen/Apostroph');
    if (!TT.vocabText.find(e.ex, e)) p('Lernwort nicht im Satz gefunden (exWord setzen)');
    if (e.pos === 'n' && !/^(der|die|das) /.test(e.de)) p('Nomen ohne Artikel');
    if (/[()]/.test(e.hint)) p('Hinweis ohne Klammern schreiben');
    const first = e.en.split(/,\s*/)[0];
    if (e.hint && first.length >= 3 && new RegExp('\\b' + escapeRe(first) + '\\b', 'i').test(e.hint)) p('Hinweis verrät das englische Wort');
    if (e.emoji && ([...seg.segment(e.emoji)].length !== 1 || !/\p{Extended_Pictographic}/u.test(e.emoji))) p('emoji ist nicht genau ein Emoji');
  }
  assert.deepStrictEqual(problems, []);
});

test('Vokabel-Inhalte: alle 3774 Einträge der Wortliste haben Inhalt', () => {
  const missing = TT.VOCAB_LIST.filter((r) => !TT.vocabEntry(r[0])).map((r) => r[0]);
  assert.deepStrictEqual(missing, []);
  assert.strictEqual(TT.vocabEntries().filter((e) => e.level !== TT.BOOK_LEVEL).length, 3774);
});

test('StartUp 6: jede Lesson hat Wörter, jedes Buchwort hat Eintrag und Definition, neue IDs kollidieren nicht', () => {
  const book = TT.bookEntries();
  assert.ok(book.length > 250, String(book.length));
  for (let u = 1; u <= 10; u++) for (let l = 1; l <= 4; l++) assert.ok(book.some((e) => e.book.u === u && e.book.l === l), 'Unit ' + u + ' Lesson ' + l);
  for (const e of book) {
    assert.ok(e.def && e.def.length >= 8 && !/[’‘“”„]/.test(e.def), e.id);
    if (e.level === TT.BOOK_LEVEL) assert.ok(!LIST_IDS.has(e.id), e.id);
    else assert.ok(LIST_IDS.has(e.id), e.id);
    assert.strictEqual(TT.vocabLevel(e.id), e.level, e.id);
  }
  assert.strictEqual(new Set(book.map((e) => e.id)).size, book.length);
  // Buchreihenfolge: Unit und Lesson steigen nie ab
  for (let i = 1; i < book.length; i++) {
    const a = book[i - 1].book;
    const b = book[i].book;
    assert.ok(a.u < b.u || (a.u === b.u && a.l <= b.l), book[i].id);
  }
  assert.ok(TT.BOOK_SU6.grammar.every((g) => (g.tense ? TT.tense(g.tense) : TT.lesson(g.lesson))), 'Grammatik-Verweise');
});
