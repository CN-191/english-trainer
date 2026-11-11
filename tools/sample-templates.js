'use strict';
// Erzeugt 10 Beispielsätze pro Vorlage in tools/samples.txt. Aufruf: node tools/sample-templates.js [seed]
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
for (const rel of [
  'js/core.js', 'js/data/tenses.js', 'js/data/verbs.js', 'js/data/subjects.js', 'js/data/slots.js',
  'js/data/templates.js', 'js/engine/conjugate.js', 'js/engine/generate.js',
]) require(path.join(root, rel));

const rng = TT.util.makeRng(Number(process.argv[2]) || 1);
const lines = [];
for (const id of TT.TENSE_IDS) {
  lines.push('', '=== ' + TT.tense(id).name + ' ===');
  for (const tpl of TT.TEMPLATES.filter((t) => t.tense === id)) {
    lines.push('', '# ' + tpl.id + '   ' + tpl.pattern);
    for (let i = 0; i < 10; i++) {
      const s = TT.generateFromTemplate(tpl, null, rng);
      const marked = s.segments.map((g) => (g.t === 'verb' ? '[' + g.v + ']' : g.v)).join('');
      lines.push('  ' + marked + '   (' + s.form + ')');
    }
  }
}
fs.writeFileSync(path.join(__dirname, 'samples.txt'), lines.join('\n'), 'utf8');
console.log('Geschrieben: tools/samples.txt (' + TT.TEMPLATES.length + ' Vorlagen)');
