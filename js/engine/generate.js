(function (TT) {
  'use strict';

  const { pick, weightedPick } = TT.util;
  const ALL_FORMS = ['aff', 'neg', 'q'];
  const DEFAULT_TYPES = ['activity', 'event'];
  const FORM_WEIGHTS = { aff: 0.5, neg: 0.25, q: 0.25 };
  const RECENT_MAX = 200;
  const recent = [];

  function remember(text) {
    recent.push(text);
    if (recent.length > RECENT_MAX) recent.shift();
  }

  function verbsFor(types, tpl) {
    return TT.VERBS.filter((v) => !v.lexiconOnly && types.includes(v.type) && (!tpl.flexOnly || v.flex) && !(tpl.noProgressiveOk && v.progressiveOk));
  }

  function secondaryText(list, tense, rng) {
    const s = pick(list, rng);
    const subj = s.subject || pick(TT.SUBJECTS, rng);
    const conj = TT.conjugate(TT.findVerb(s.verb), subj, tense, 'aff');
    return [subj.text, conj.full, s.object].filter(Boolean).join(' ');
  }

  function resolvePattern(pattern, form, rng) {
    return pattern
      .replace(/\{EVENT:([a-z-]+)\}/g, (_, t) => secondaryText(TT.SECONDARY.events, t, rng))
      .replace(/\{ACTION:([a-z-]+)\}/g, (_, t) => secondaryText(TT.SECONDARY.actions, t, rng))
      .replace(/\{COND\}/g, () => secondaryText(TT.SECONDARY.conditions, 'present-simple', rng))
      .replace(/\{\.\}/g, form === 'q' ? '?' : '.')
      .replace(/\{([A-Z_]+)\}/g, (m, name) => (name !== 'CLAUSE' && TT.SLOTS[name] ? pick(TT.SLOTS[name], rng) : m));
  }

  function parsePattern(str) {
    return str
      .split(/(\*[^*]+\*|\{CLAUSE\})/)
      .filter((p) => p !== '')
      .map((p) => {
        if (p === '{CLAUSE}') return { t: 'clause' };
        if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) return { t: 'signal', v: p.slice(1, -1) };
        return { t: 'text', v: p };
      });
  }

  function clauseSegments(clause, conj) {
    const sp = () => ({ t: 'text', v: ' ' });
    const subj = { t: 'text', v: clause.subject.text };
    const mid = clause.mid ? { t: 'signal', v: clause.mid } : null;
    const out = [];
    if (clause.form === 'q') {
      out.push({ t: 'verb', v: conj.aux, g: 0 }, sp(), subj);
      if (mid) out.push(sp(), mid);
      out.push(sp(), { t: 'verb', v: conj.rest, g: 1 });
    } else {
      out.push(subj, sp());
      const words = conj.full.split(' ');
      if (mid && words.length > 1) {
        out.push({ t: 'verb', v: words[0], g: 0 }, sp(), mid, sp(), { t: 'verb', v: words.slice(1).join(' '), g: 1 });
      } else if (mid) {
        out.push(mid, sp(), { t: 'verb', v: conj.full, g: 0 });
      } else {
        out.push({ t: 'verb', v: conj.full, g: 0 });
      }
    }
    if (clause.object) out.push(sp(), { t: 'text', v: clause.object });
    return out;
  }

  // Großbuchstabe am Satzanfang und nach . ! ? (z. B. „Listen! The kids …“)
  function capitalizeSentences(segs) {
    let capNext = true;
    for (const s of segs) {
      if (!s.v) continue;
      if (capNext && /\S/.test(s.v)) {
        s.v = s.v.replace(/^(\s*)(\S)/, (m, sp, ch) => sp + ch.toUpperCase());
        capNext = false;
      }
      if (/[.!?]\s*$/.test(s.v)) capNext = true;
    }
    return segs;
  }

  function renderSegments(sentence, conj) {
    if (sentence.pieces) return capitalizeSentences(rawPieceSegments(sentence.pieces, (conj || sentence.conj).full));
    const segs = [];
    for (const f of sentence.frame) {
      if (f.t === 'clause') segs.push(...clauseSegments(sentence.clause, conj || sentence.conj));
      else segs.push(Object.assign({}, f));
    }
    return capitalizeSentences(segs);
  }

  function segmentsText(segs) {
    return segs.map((s) => s.v).join('');
  }

  // p: { tense, form, templateId, why, verb, subject, object, mid, frame, alsoAccept?, strict? }
  function build(p) {
    const conj = TT.conjugate(p.verb, p.subject, p.tense, p.form);
    const clause = { subject: p.subject, object: p.object, mid: p.mid, form: p.form };
    const s = Object.assign({}, p, { clause, conj, answer: conj.full, infinitive: p.verb.base });
    s.accept = [conj.full];
    const alt = TT.ALSO_ACCEPT[p.tense];
    if (alt && p.verb.flex && !p.strict) s.accept.push(TT.conjugate(p.verb, p.subject, alt, p.form).full);
    if (!p.strict) {
      for (const id of p.alsoAccept || []) {
        if (/progressive/.test(id) && p.verb.type === 'state' && !p.verb.progressiveOk) continue;
        const full = TT.conjugate(p.verb, p.subject, id, p.form).full;
        if (!s.accept.includes(full)) s.accept.push(full);
      }
    }
    if (p.tense === 'future-simple' && !p.strict && !p.noGoingTo) {
      const gt = TT.goingTo(p.verb, p.subject, p.form).full;
      if (!s.accept.includes(gt)) s.accept.push(gt);
      s.why = (p.why || '') + ' „going to“ ist hier auch korrekt.';
    }
    s.gaps = clauseSegments(clause, conj).filter((x) => x.t === 'verb').map((x) => x.v);
    s.segments = renderSegments(s);
    s.text = segmentsText(s.segments);
    return s;
  }

  function generateFromTemplate(tpl, form, rng) {
    const r = rng || Math.random;
    const f = form || weightedPick(tpl.forms || ALL_FORMS, (x) => FORM_WEIGHTS[x], r);
    const fixed = tpl.fixed || {};
    const verb = fixed.verb ? TT.findVerb(fixed.verb) : pick(verbsFor(tpl.verbTypes || DEFAULT_TYPES, tpl), r);
    if (!verb) throw new Error('Kein passendes Verb für Vorlage ' + tpl.id);
    const subject = fixed.subject || pick(TT.SUBJECTS, r);
    const object = fixed.object !== undefined ? fixed.object : verb.objects.length ? pick(verb.objects, r) : '';
    const mid = tpl.mid ? pick(tpl.mid, r) : null;
    const frame = parsePattern(resolvePattern(tpl.pattern, f, r));
    return build({ tense: tpl.tense, form: f, templateId: tpl.id, why: tpl.why, verb, subject, object, mid, frame, alsoAccept: tpl.alsoAccept, noGoingTo: tpl.noGoingTo });
  }

  function generate(opts) {
    const rng = opts.rng || Math.random;
    const pool = (opts.templates || TT.TEMPLATES).filter(
      (t) => t.tense === opts.tense && (!opts.form || (t.forms || ALL_FORMS).includes(opts.form))
    );
    if (!pool.length) throw new Error('Keine Vorlage für ' + opts.tense + (opts.form ? ' / ' + opts.form : ''));
    let s;
    for (let attempt = 0; attempt < 20; attempt++) {
      s = generateFromTemplate(pick(pool, rng), opts.form, rng);
      if (!recent.includes(s.text)) break;
    }
    remember(s.text);
    return s;
  }

  function generateTransform(opts) {
    const rng = opts.rng || Math.random;
    const progressive = /progressive/.test(opts.from) || /progressive/.test(opts.to);
    const types = progressive ? ['activity'] : ['activity', 'event', 'state'];
    const verb = pick(verbsFor(types, {}), rng);
    const subject = pick(TT.SUBJECTS, rng);
    const object = verb.objects.length ? pick(verb.objects, rng) : '';
    const form = opts.form || 'aff';
    const base = { verb, subject, object, mid: null, templateId: 'transform', why: '', strict: true };
    const source = build(Object.assign({}, base, { tense: opts.from, form: 'aff', frame: parsePattern('{CLAUSE}.') }));
    const target = build(Object.assign({}, base, { tense: opts.to, form, frame: parsePattern(form === 'q' ? '{CLAUSE}?' : '{CLAUSE}.') }));
    return { source, target };
  }

  // Sätze aus Deutsch→Englisch-Einträgen: Text-Stücke zwischen den {GAP}-Stellen
  function rawPieceSegments(pieces, full) {
    const words = full.split(' ');
    const parts = pieces.length === 3 ? [words[0], words.slice(1).join(' ')] : [full];
    const segs = [];
    pieces.forEach((p, i) => {
      if (p) segs.push({ t: 'text', v: p });
      if (i < parts.length) segs.push({ t: 'verb', v: parts[i], g: i });
    });
    return segs;
  }

  function fromTranslation(e) {
    const verb = TT.findVerb(e.verb);
    const subject = TT.findSubject(e.subj) || { text: e.subj, person: e.person, number: e.number };
    const words = e.accept[0].split(' ');
    const conj = e.form === 'q'
      ? { full: e.accept[0], aux: words[0], rest: words.slice(1).join(' ') }
      : { full: e.accept[0], aux: null, rest: e.accept[0] };
    const s = {
      tense: e.tense, form: e.form, templateId: 'tr:' + e.id, why: e.note, verb, subject,
      conj, answer: e.accept[0], accept: e.accept.slice(), infinitive: e.verb, pieces: e.en.split('{GAP}'),
    };
    const raw = rawPieceSegments(s.pieces, conj.full);
    s.gaps = raw.filter((x) => x.t === 'verb').map((x) => x.v); // klein geschrieben, wie bei Vorlagen
    s.segments = capitalizeSentences(raw);
    s.text = segmentsText(s.segments);
    return s;
  }

  TT.generate = generate;
  TT.generateFromTemplate = generateFromTemplate;
  TT.generateTransform = generateTransform;
  TT.renderSegments = renderSegments;
  TT.segmentsText = segmentsText;
  TT.fromTranslation = fromTranslation;
})(globalThis.TT = globalThis.TT || {});
