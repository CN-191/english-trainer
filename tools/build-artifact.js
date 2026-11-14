'use strict';
// Baut die Seite für den claude.ai-Link aus index.html (ohne <html>/<head>/<body>, die ergänzt claude.ai):
// node tools/build-artifact.js <Zieldatei>
const fs = require('fs');
const path = require('path');

const out = process.argv[2];
if (!out) {
  console.error('Zieldatei angeben');
  process.exit(1);
}
// Versionsnummern (?v=…, siehe tools/stamp.js) braucht der claude.ai-Link nicht
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n').replace(/\?v=[a-z0-9]+"/g, '"');
const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const themeColors = html.match(/<meta name="theme-color"[^>]*>/g).join('\n');
const stylesheet = html.match(/<link rel="stylesheet"[^>]*>/)[0];
// Skripte mit data-web gehören nur zur Web-Version (Anmeldung über Supabase) und fehlen im claude.ai-Link
const body = html.match(/<body>\n([\s\S]*?)<\/body>/)[1]
  .split('\n').filter((line) => !/<script[^>]*\sdata-web/.test(line)).join('\n');
fs.writeFileSync(out, [title, '<meta name="claude:viewport-fit-sides" content="cover">', themeColors, stylesheet, body].join('\n'));
const scripts = (body.match(/<script src="/g) || []).length;
console.log('Artifact-Seite geschrieben: ' + out + ' (' + scripts + ' Skripte)');
