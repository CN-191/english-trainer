(function (TT) {
  'use strict';

  // Findet das Lernwort im Beispielsatz – auch gebeugt (worried, went, children, better) –,
  // damit es hervorgehoben werden kann. Eintrag.exWord überschreibt die Suche mit einer festen Form.

  // Grundform Vergangenheit Partizip (Varianten mit Komma), getrennt durch |
  const IRREGULAR =
    'arise arose arisen|awake awoke awoken|bear bore born,borne|beat beat beaten|become became become|' +
    'begin began begun|bend bent bent|bet bet bet|bind bound bound|bite bit bitten|bleed bled bled|' +
    'blow blew blown|break broke broken|breed bred bred|bring brought brought|broadcast broadcast broadcast|' +
    'build built built|burn burned,burnt burned,burnt|burst burst burst|buy bought bought|cast cast cast|' +
    'catch caught caught|choose chose chosen|cling clung clung|come came come|cost cost cost|creep crept crept|' +
    'cut cut cut|deal dealt dealt|dig dug dug|do did done|draw drew drawn|dream dreamed,dreamt dreamed,dreamt|' +
    'drink drank drunk|drive drove driven|eat ate eaten|fall fell fallen|feed fed fed|feel felt felt|' +
    'fight fought fought|find found found|flee fled fled|fly flew flown|forbid forbade forbidden|' +
    'forecast forecast forecast|forget forgot forgotten|forgive forgave forgiven|freeze froze frozen|' +
    'get got gotten,got|give gave given|go went gone|grind ground ground|grow grew grown|hang hung,hanged hung,hanged|' +
    'have had had|hear heard heard|hide hid hidden|hit hit hit|hold held held|hurt hurt hurt|keep kept kept|' +
    'kneel knelt knelt|know knew known|lay laid laid|lead led led|lean leaned,leant leaned,leant|' +
    'leap leaped,leapt leaped,leapt|learn learned,learnt learned,learnt|leave left left|lend lent lent|let let let|' +
    'lie lay,lied lain,lied|light lit,lighted lit,lighted|lose lost lost|make made made|mean meant meant|meet met met|' +
    'mislead misled misled|overcome overcame overcome|pay paid paid|prove proved proven,proved|put put put|' +
    'quit quit quit|read read read|ride rode ridden|ring rang rung|rise rose risen|run ran run|say said said|' +
    'see saw seen|seek sought sought|sell sold sold|send sent sent|set set set|sew sewed sewn|shake shook shaken|' +
    'shine shone,shined shone,shined|shoot shot shot|show showed shown|shrink shrank shrunk|shut shut shut|' +
    'sing sang sung|sink sank sunk|sit sat sat|sleep slept slept|slide slid slid|speak spoke spoken|speed sped sped|' +
    'spell spelled,spelt spelled,spelt|spend spent spent|spill spilled,spilt spilled,spilt|spin spun spun|' +
    'split split split|spread spread spread|spring sprang sprung|stand stood stood|steal stole stolen|' +
    'stick stuck stuck|sting stung stung|strike struck struck|swear swore sworn|sweep swept swept|swim swam swum|' +
    'swing swung swung|take took taken|teach taught taught|tear tore torn|tell told told|think thought thought|' +
    'throw threw thrown|understand understood understood|undertake undertook undertaken|upset upset upset|' +
    'wake woke woken|wear wore worn|weep wept wept|win won won|wind wound wound|withdraw withdrew withdrawn|' +
    'write wrote written';
  const NOUNS =
    'child children|man men|woman women|person people|foot feet|tooth teeth|mouse mice|knife knives|life lives|' +
    'wife wives|leaf leaves|half halves|shelf shelves|wolf wolves|thief thieves|potato potatoes|tomato tomatoes|' +
    'hero heroes|crisis crises|analysis analyses|phenomenon phenomena|criterion criteria|medium media';
  const COMPARE =
    'good better best|bad worse worst|well better best|far farther,further farthest,furthest|' +
    'little less least|many more most|much more most';

  const TABLE = { be: ['am', 'is', 'are', 'was', 'were', 'been', 'being'] };
  for (const list of [IRREGULAR, NOUNS, COMPARE]) {
    for (const line of list.split('|')) {
      const [base, ...rest] = line.split(' ');
      TABLE[base] = (TABLE[base] || []).concat(...rest.map((r) => r.split(',')));
    }
  }
  TABLE.have.push('has');

  // Mögliche Formen eines einzelnen Worts (bewusst großzügig; zu viele Formen schaden nicht).
  function wordForms(word) {
    const w = word.toLowerCase();
    // Sehr kurze Wörter nur mit wenigen Formen, sonst treffen sie fremde Wörter (an → and, be → bed)
    if (w.length <= 2) {
      const short = new Set([w, ...(TABLE[w] || [])]);
      if (w.length === 2) for (const x of ['s', 'es', 'ing']) short.add(w + x);
      return [...short];
    }
    const last = w.slice(-1);
    const out = new Set([w, w + 's', w + 'es', w + 'ed', w + 'd', w + 'ing', w + 'er', w + 'est', w + 'r', w + 'st', w + 'ly']);
    if (last === 'e') for (const x of ['ing', 'ed', 'er', 'est']) out.add(w.slice(0, -1) + x);
    if (/[^aeiou]y$/.test(w)) for (const x of ['ies', 'ied', 'ier', 'iest', 'ily']) out.add(w.slice(0, -1) + x);
    if (/ie$/.test(w)) out.add(w.slice(0, -2) + 'ying');
    if (/c$/.test(w)) for (const x of ['ked', 'king']) out.add(w + x);
    if (/[^aeiouy]$/.test(w)) for (const x of ['ed', 'ing', 'er', 'est']) out.add(w + last + x);
    if (/fe?$/.test(w)) out.add(w.replace(/fe?$/, 'ves'));
    for (const f of TABLE[w] || []) {
      out.add(f);
      out.add(f + 's');
    }
    return [...out];
  }

  // Formen für einen Eintrag: „a, an“ = zwei Alternativen; bei Wortgruppen wird das erste Wort gebeugt.
  function forms(en) {
    const out = new Set();
    for (const alt of en.split(/,\s*/)) {
      const words = alt.trim().split(/\s+/);
      if (words.length === 1) {
        for (const f of wordForms(words[0])) out.add(f);
      } else {
        out.add(words.join(' ').toLowerCase());
        for (const f of wordForms(words[0])) out.add([f, ...words.slice(1)].join(' ').toLowerCase());
      }
    }
    return [...out];
  }

  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Erste Fundstelle des Lernworts als {start, end} oder null.
  function find(text, entry) {
    const cands = (entry.exWord ? [entry.exWord] : forms(entry.en)).sort((a, b) => b.length - a.length);
    const alts = cands.map((c) => c.split(/\s+/).map(escape).join('\\s+'));
    const re = new RegExp('(^|[^A-Za-z0-9])(' + alts.join('|') + ')(?![A-Za-z0-9])', 'gi');
    const capital = /^[A-Z]/.test(entry.en);
    let m;
    while ((m = re.exec(text))) {
      if (capital && !/^[A-Z]/.test(m[2])) {
        re.lastIndex = m.index + m[1].length + 1;
        continue;
      }
      const start = m.index + m[1].length;
      return { start, end: start + m[2].length };
    }
    return null;
  }

  // Satz in Teile zerlegen: [{t: 'text'|'word', v}] – für die Hervorhebung in der Oberfläche.
  function split(text, entry) {
    const hit = find(text, entry);
    if (!hit) return [{ t: 'text', v: text }];
    return [
      { t: 'text', v: text.slice(0, hit.start) },
      { t: 'word', v: text.slice(hit.start, hit.end) },
      { t: 'text', v: text.slice(hit.end) },
    ].filter((p) => p.v);
  }

  TT.vocabText = { forms, find, split };
})(globalThis.TT = globalThis.TT || {});
