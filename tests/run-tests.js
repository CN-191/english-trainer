'use strict';
// Lädt alle Quelldateien (sofern vorhanden) in globalThis.TT und führt tests/*.test.js aus.
// Aufruf: node tests/run-tests.js [filter]
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const SOURCES = [
  'js/core.js',
  'js/data/tenses.js', 'js/data/verbs.js', 'js/data/subjects.js', 'js/data/slots.js',
  'js/data/templates.js', 'js/data/translations.js', 'js/data/stories.js',
  'js/engine/conjugate.js', 'js/engine/generate.js', 'js/engine/variants.js', 'js/engine/check.js',
  'js/learn/store.js', 'js/learn/progress.js', 'js/learn/session.js', 'js/learn/sync.js', 'js/ui/timeline.js',
  'js/data/vocab-list.js', 'js/data/vocab.js',
];
// Vokabel-Pakete (js/data/vocab/*.js) in Namensreihenfolge, danach die Lernlogik
const vocabDir = path.join(root, 'js/data/vocab');
if (fs.existsSync(vocabDir)) {
  for (const f of fs.readdirSync(vocabDir).filter((n) => n.endsWith('.js')).sort()) SOURCES.push('js/data/vocab/' + f);
}
// Lehrbuch StartUp 6: Unit-Daten und Buchwörter
SOURCES.push('js/data/su6/book.js', 'js/data/su6/u01-03.js', 'js/data/su6/u04-06.js', 'js/data/su6/u07-10.js');
SOURCES.push('js/learn/fsrs.js', 'js/learn/vocab-text.js', 'js/learn/vocab-store.js', 'js/learn/deck.js', 'js/learn/homework.js', 'js/learn/lesson-log.js');
SOURCES.push('js/lessons/lessons.js', 'js/lessons/what-clauses.js', 'js/lessons/passive.js', 'js/lessons/pronouns.js', 'js/lessons/pronoun-replace.js', 'js/lessons/by-gerund.js');
// Grammatik-Themen „Typische Fehler für Deutsche“: Register, dann die Themen je Kategorie
SOURCES.push('js/lessons/bank.js', 'js/lessons/core/zeit.js', 'js/lessons/core/modal.js', 'js/lessons/core/if.js', 'js/lessons/core/verb1.js', 'js/lessons/core/verb2.js', 'js/lessons/core/satz.js', 'js/lessons/core/wort.js', 'js/lessons/core/praep.js');
for (const rel of SOURCES) {
  const file = path.join(root, rel);
  if (fs.existsSync(file)) require(file);
}

const tests = [];
global.test = (name, fn) => tests.push({ name, fn });
global.assert = assert;

const filter = process.argv[2] || '';
const testDir = __dirname;
for (const f of fs.readdirSync(testDir).filter((n) => n.endsWith('.test.js') && n.includes(filter)).sort()) {
  const before = tests.length;
  require(path.join(testDir, f));
  for (let i = before; i < tests.length; i++) tests[i].file = f;
}

// Tests dürfen async sein (z. B. der Cloud-Speicher mit nachgestelltem fetch); sie laufen nacheinander.
(async () => {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ok   ${t.file} › ${t.name}`);
    } catch (e) {
      failed++;
      console.log(`  FAIL ${t.file} › ${t.name}\n       ${String(e.message).split('\n').join('\n       ')}`);
    }
  }
  console.log(`\n${tests.length - failed}/${tests.length} Tests bestanden`);
  process.exit(failed ? 1 : 0);
})();
