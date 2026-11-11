'use strict';
// Vokabel-Pakete: node tools/vocab-batch.js <Nummer>          -> Einträge des Pakets als JSON
//                 node tools/vocab-batch.js <Nummer> --check  -> prüft js/data/vocab/vNN.js auf Vollständigkeit
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
require(path.join(root, 'js/data/vocab-list.js'));
const SIZE = 146;
const total = Math.ceil(TT.VOCAB_LIST.length / SIZE);
const n = Number(process.argv[2]);
if (!Number.isInteger(n) || n < 1 || n > total) {
  console.error('Paketnummer 1–' + total + ' angeben');
  process.exit(1);
}
const rows = TT.VOCAB_LIST.slice((n - 1) * SIZE, n * SIZE);
const file = path.join(root, 'js/data/vocab/v' + String(n).padStart(2, '0') + '.js');

if (process.argv[3] !== '--check') {
  console.log(JSON.stringify(rows.map(([id, en, pos, level, sense]) => ({ id, en, pos, level, sense })), null, 1));
  console.error('Paket ' + n + ' von ' + total + ': ' + rows.length + ' Einträge (' + rows[0][0] + ' … ' + rows[rows.length - 1][0] + ') -> ' + path.relative(root, file));
  process.exit(0);
}

if (!fs.existsSync(file)) {
  console.error('Fehlt: ' + path.relative(root, file));
  process.exit(1);
}
require(path.join(root, 'js/data/vocab.js'));
require(file);
const want = rows.map((r) => r[0]);
const have = TT.vocabContentIds();
const missing = want.filter((id) => !have.includes(id));
const extra = have.filter((id) => !want.includes(id));
const dupes = TT.vocabDuplicates();
if (missing.length || extra.length || dupes.length) {
  if (missing.length) console.error('Fehlen (' + missing.length + '): ' + missing.join(', '));
  if (extra.length) console.error('Gehören nicht in Paket ' + n + ': ' + extra.join(', '));
  if (dupes.length) console.error('Doppelt: ' + dupes.join(', '));
  process.exit(1);
}
console.log('Paket ' + n + ' vollständig: ' + want.length + ' Einträge');
