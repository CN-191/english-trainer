"""Liest American_Oxford_3000.pdf und schreibt js/data/vocab-list.js (TT.VOCAB_LIST).

Ein Eintrag = ein Wort mit einer Wortart (Schrägstrich-Kombinationen wie det./pron. bleiben ein Eintrag).
Aufruf (im Projektordner): python tools/extract-oxford.py
"""
import json
import re
import sys
from pathlib import Path

import pypdf

ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT / 'American_Oxford_3000.pdf'
OUT = ROOT / 'js' / 'data' / 'vocab-list.js'

POS_MAP = {
    'n': 'n', 'noun': 'n', 'v': 'v', 'adj': 'adj', 'adv': 'adv', 'prep': 'prep', 'conj': 'conj',
    'pron': 'pron', 'det': 'det', 'exclam': 'exclam', 'number': 'num', 'modal v': 'modal',
    'auxiliary v': 'aux', 'indefinite article': 'art', 'definite article': 'art', 'infinitive marker': 'inf',
}
# Längste zuerst, damit „modal v“ vor „v“ greift
POS_ALT = '|'.join(sorted((re.escape(k) for k in POS_MAP), key=len, reverse=True))
LEVEL = r'(?:A1|A2|B1|B2)'
FIXES = {
    '’': "'",  # typografischer Apostroph (o’clock)
    '™': '',  # Markenzeichen (Wi-Fi™)
    'produce v. A2, v. B2': 'produce v. A2, n. B2',  # Tippfehler in der PDF (Nomen „Erzeugnisse“ ist B2)
}
LINE = re.compile(
    r'^(?P<word>[^\s(]+(?:\s[^\s(]+)*?)\s*(?:\((?P<sense>[^)]*)\))?\s+'
    r'(?P<rest>(?:' + POS_ALT + r')(?:[./,\s].*)?)$'
)


def lines_from_pdf():
    reader = pypdf.PdfReader(str(PDF))
    out = []
    for page in reader.pages:
        for raw in page.extract_text().split('\n'):
            line = re.sub(r'\s+', ' ', raw.replace('\xa0', ' ')).strip()
            if not line or 'Oxford University Press' in line or line.startswith('The Oxford 3000'):
                continue
            for bad, good in FIXES.items():
                line = line.replace(bad, good)
            # Umbrochene Zeilen: endet die vorige Zeile nicht auf ein Niveau, gehört diese dazu
            if out and not re.search(LEVEL + r'$', out[-1]):
                out[-1] = out[-1] + ' ' + line
            else:
                out.append(line)
    return out


def slug(text):
    return re.sub(r'_+', '_', re.sub(r'[^a-z0-9]+', '_', text.lower().replace("'", ''))).strip('_')


def parse_pos(group):
    parts = []
    for p in re.split(r'/', group):
        p = p.strip().rstrip('.').strip()
        if p not in POS_MAP:
            raise ValueError('Unbekannte Wortart: %r' % p)
        parts.append(POS_MAP[p])
    return '/'.join(parts)


def parse(line):
    m = LINE.match(line)
    if not m:
        raise ValueError('Zeile nicht erkannt: %r' % line)
    word, sense, rest = m.group('word'), m.group('sense'), m.group('rest')
    num = ''
    dm = re.match(r'^(.*?)(\d)$', word)
    if dm:
        word, num = dm.group(1), dm.group(2)
    entries = []
    for pos_group, level in re.findall(r'(.+?)\s*\b(' + LEVEL[3:-1] + r')\b\s*,?\s*', rest):
        for item in pos_group.split(','):
            item = item.strip()
            if not item:
                continue
            pos = parse_pos(item)
            ident = slug(word) + num + ('_' + slug(sense) if sense else '') + '-' + pos.replace('/', '_')
            e = {'id': ident, 'en': word, 'pos': pos, 'level': level}
            if sense:
                e['sense'] = sense
            entries.append(e)
    if not entries:
        raise ValueError('Keine Wortart gefunden: %r' % line)
    return entries


def main():
    entries = []
    for line in lines_from_pdf():
        entries.extend(parse(line))
    ids = [e['id'] for e in entries]
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    if dupes:
        sys.exit('Doppelte IDs: %s' % ', '.join(dupes))
    rows = ''.join(
        '    %s,\n' % json.dumps([e['id'], e['en'], e['pos'], e['level'], e.get('sense', '')], ensure_ascii=False)
        for e in entries
    )
    header = (
        '// Automatisch erzeugt von tools/extract-oxford.py aus American_Oxford_3000.pdf – nicht von Hand ändern.\n'
        "(function (TT) {\n  'use strict';\n\n"
        '  // [id, englisch, Wortart, Niveau, Bedeutungshinweis aus der PDF]\n'
        '  TT.VOCAB_LIST = [\n'
    )
    footer = '  ];\n})(globalThis.TT = globalThis.TT || {});\n'
    OUT.write_text(header + rows + footer, encoding='utf-8', newline='\n')
    words = len({(e['en'], e.get('sense', '')) for e in entries})
    levels = {lv: sum(1 for e in entries if e['level'] == lv) for lv in ('A1', 'A2', 'B1', 'B2')}
    print('%d Einträge, %d Wörter, %s -> %s' % (len(entries), words, levels, OUT))


if __name__ == '__main__':
    main()
