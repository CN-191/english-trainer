'use strict';
// Hängt an jede Skript- und Stil-Datei in index.html eine Versionsnummer (?v=…) aus dem Inhalt aller Dateien.
// GitHub Pages lässt Browser Dateien 10 Minuten zwischenspeichern; ohne Versionsnummer lädt ein Browser nach
// einer Veröffentlichung sonst teils alte, teils neue Dateien. Vor jedem Veröffentlichen ausführen:
//   node tools/stamp.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const file = path.join(root, 'index.html');
const html = fs.readFileSync(file, 'utf8');
const REF = /(src|href)="((?:js|css)\/[^"?]+)(?:\?v=[a-z0-9]*)?"/g;

const hash = crypto.createHash('sha256');
const seen = [];
for (const m of html.matchAll(REF)) {
  seen.push(m[2]);
  hash.update(m[2] + '\0' + fs.readFileSync(path.join(root, m[2])));
}
hash.update(fs.existsSync(path.join(root, 'icon.svg')) ? fs.readFileSync(path.join(root, 'icon.svg')) : '');
const v = hash.digest('hex').slice(0, 10);
const out = html.replace(REF, (all, attr, p) => attr + '="' + p + '?v=' + v + '"');
if (out !== html) fs.writeFileSync(file, out);
console.log('Version ' + v + ' für ' + seen.length + ' Dateien' + (out === html ? ' (unverändert)' : ''));
