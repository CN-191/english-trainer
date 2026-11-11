(function (TT) {
  'use strict';

  const { h, ui } = TT;
  TT.exercises = TT.exercises || {};
  const ex = (TT.ex = {});

  ex.LABELS = {
    cloze: 'Lückentext', identify: 'Zeitform erkennen', errorspot: 'Fehler finden',
    transform: 'Satz umformen', translate: 'Deutsch → Englisch', story: 'Geschichte',
  };

  ex.gapSentence = (segments, infinitive, o = {}) => {
    const p = h('p.sentence');
    const inputs = [];
    const total = segments.filter((s) => s.t === 'verb').length;
    for (const s of segments) {
      if (s.t !== 'verb') {
        p.appendChild(document.createTextNode(s.v));
        continue;
      }
      let el;
      if (o.blanks) {
        el = h('span.gap.blank', null, ' ');
      } else {
        el = h('input.gap', {
          type: 'text', autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off', spellcheck: 'false',
          enterkeyhint: inputs.length + 1 < total ? 'next' : 'done', 'aria-label': 'Lücke ' + (inputs.length + 1),
        });
        el.addEventListener('input', () => {
          el.style.width = Math.max(8, el.value.length + 2) + 'ch';
        });
      }
      inputs.push(el);
      p.appendChild(el);
      if (inputs.length === total && infinitive) p.appendChild(h('span.inf', null, ' (' + infinitive + ')'));
    }
    return { el: p, inputs };
  };

  ex.joinInputs = (inputs) => inputs.map((i) => i.value.trim()).join(' ').trim();

  // Bei verneinten Aufgaben zeigt die Grundform in der Klammer „not“ an
  ex.infinitive = (s) => (s.form === 'neg' ? 'not ' + s.infinitive : s.infinitive);

  ex.hints = (tense, maxLevel = 3, form) => {
    let level = 0;
    const box = h('div.hint-box');
    const btn = ui.button('Hilfe', { kind: 'plain', small: true });
    btn.addEventListener('click', () => {
      level++;
      box.appendChild(h('p', null, TT.hint(tense, level, form)));
      btn.textContent = 'Mehr Hilfe';
      if (level >= maxLevel) btn.disabled = true;
    });
    return { el: h('div', null, box, btn), used: () => level, disable: () => { btn.disabled = true; } };
  };

  ex.score = (correct, hintsUsed) => (correct ? (hintsUsed ? 0.5 : 1) : 0);

  ex.choiceList = (options, onPick) => {
    const wrap = h('div.choices');
    const buttons = options.map((o) => {
      const b = h('button.choice', { type: 'button' }, o.label);
      b.addEventListener('click', () => {
        buttons.forEach((x, i) => {
          x.disabled = true;
          if (options[i].correct) x.classList.add('correct');
        });
        if (!o.correct) b.classList.add('wrong');
        onPick(o);
      });
      wrap.appendChild(b);
      return b;
    });
    return wrap;
  };

  ex.evaluate = (answer, s) => {
    const d = TT.checkAnswer(answer, { accept: s.accept, verb: s.verb, subject: s.subject, tense: s.tense, polarity: s.form });
    return {
      correct: d.ok,
      usedTense: d.used || null,
      diagHtml: d.ok ? null : TT.explain(d, { verb: s.verb, subject: s.subject, tense: s.tense, strict: !!s.strict }),
    };
  };

  ex.finish = (root, ctx, r) => {
    root.querySelectorAll('.actions').forEach((a) => a.remove());
    // Unterrichtsthemen bringen ihre eigene Rückmeldung mit (r.feedbackEl), Zeitformen die Standard-Rückmeldung
    root.appendChild(r.feedbackEl || ui.feedback({
      correct: r.correct, halfCredit: r.correct && r.hintsUsed > 0, segments: r.segments,
      diagHtml: r.diagHtml, why: r.why, tense: r.tense,
    }));
    const next = ui.button('Weiter', { onclick: ctx.next });
    root.appendChild(h('div.actions', null, next));
    ctx.onAnswered({ correct: r.correct, score: ex.score(r.correct, r.hintsUsed), usedTense: r.usedTense || null, ex: r.ex });
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  ex.gapTask = (ctx, s, o) => {
    const root = h('div.exercise');
    root.append(...o.prelude);
    const hints = ex.hints(s.tense, 3, s.form);
    const done = (r, fields) => {
      hints.disable();
      fields.forEach((f) => {
        f.disabled = true;
        f.classList.add(r.correct ? 'ok' : 'bad');
      });
      ex.finish(root, ctx, {
        correct: r.correct, hintsUsed: hints.used(), tense: s.tense, segments: s.segments,
        diagHtml: r.diagHtml, why: s.why, usedTense: r.usedTense, ex: o.exName,
      });
    };

    if (ctx.inputMode === 'choice') {
      const { el, inputs: blanks } = ex.gapSentence(s.segments, ex.infinitive(s), { blanks: true });
      root.append(el, hints.el);
      root.appendChild(ex.choiceList(TT.makeChoices(s), (opt) => {
        const parts = TT.gapParts(s, opt.conj);
        blanks.forEach((b, i) => { b.textContent = i === blanks.length - 1 ? parts.slice(i).join(' ') : parts[i] || ''; });
        done(ex.evaluate(opt.conj.full, s), blanks);
      }));
      return { el: root };
    }

    const { el, inputs } = ex.gapSentence(s.segments, ex.infinitive(s));
    root.append(el, hints.el);
    const check = () => {
      const answer = ex.joinInputs(inputs);
      if (!answer) {
        ui.toast('Bitte zuerst ausfüllen');
        inputs[0].focus();
        return;
      }
      done(ex.evaluate(answer, s), inputs);
    };
    root.appendChild(h('div.actions', null, ui.button('Prüfen', { onclick: check })));
    return { el: root, focus: () => inputs[0].focus({ preventScroll: true }) };
  };
})(globalThis.TT = globalThis.TT || {});
