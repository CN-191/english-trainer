(function (TT) {
  'use strict';

  const { h, ui } = TT;
  const KIND_LABELS = { transform: 'Umformen', cloze: 'Lückentext', errorspot: 'Fehler finden', identify: 'Erkennen', replace: 'Pronomen einsetzen', order: 'Satz ordnen' };

  // Satz aus Segmenten, die markierte Stelle hervorgehoben
  const sentenceEl = (segs) => h('p.sentence', null, segs.map((s) => (s.t === 'mark' ? h('span.verb', null, s.v) : s.v)));

  // Eine Hilfe-Stufe: zeigt die Merkhilfe des Themas (halbe Punkte, wie bei den Zeitformen)
  function tipButton(lesson) {
    let used = 0;
    const box = h('div.hint-box');
    const btn = ui.button('Hilfe', { kind: 'plain', small: true });
    btn.addEventListener('click', () => {
      used = 1;
      box.appendChild(h('p', null, lesson.tip));
      btn.disabled = true;
    });
    return { el: h('div', null, box, btn), used: () => used, disable: () => { btn.disabled = true; } };
  }

  function feedbackEl(lesson, correct, half, solution, explain) {
    return h('div.feedback.' + (correct ? 'good' : 'bad'), { role: 'status' },
      h('h3', null, correct ? (half ? 'Richtig – mit Hilfe' : 'Richtig!') : 'Nicht ganz'),
      solution ? h('p.sentence', null, solution) : null,
      h('p.why', null, explain),
      h('p', null, h('a', { href: TT.lessonHref ? TT.lessonHref(lesson) : '#/unterricht/' + lesson.id }, 'Regel ansehen: ' + lesson.title + ' ›')));
  }

  function create(kind) {
    return {
      create(task, ctx) {
        const lesson = TT.lesson(task.tense);
        const item = lesson.make(kind);
        const root = h('div.exercise');
        const tip = tipButton(lesson);
        const done = (correct, solution) => {
          tip.disable();
          TT.ex.finish(root, ctx, {
            correct, hintsUsed: tip.used(), ex: 'l-' + kind,
            feedbackEl: feedbackEl(lesson, correct, correct && tip.used() > 0, solution, item.explain),
          });
        };
        const label = KIND_LABELS[kind] === lesson.title ? lesson.title : KIND_LABELS[kind] + ' · ' + lesson.title;
        root.append(h('p.ex-label', null, label), h('p.ex-task', null, item.task));
        return VIEWS[kind](root, item, ctx, tip, done);
      },
    };
  }

  const VIEWS = {
    transform(root, item, ctx, tip, done) {
      const field = h('input.field.answer', {
        type: 'text', autocomplete: 'off', spellcheck: 'false', autocorrect: 'off',
        autocapitalize: item.input === 'word' ? 'off' : 'sentences',
        'aria-label': item.input === 'word' ? 'Pronomen' : 'Dein Satz',
        placeholder: item.input === 'word' ? 'Pronomen' : 'Ganzer Satz',
      });
      const check = () => {
        if (!field.value.trim()) {
          ui.toast('Bitte zuerst eine Antwort eingeben');
          field.focus();
          return;
        }
        field.disabled = true;
        done(TT.lessonCheck(field.value, item.accept), item.answer);
      };
      root.append(sentenceEl(item.source), h('div', null, h('span.target-label', null, item.label)), field, tip.el,
        h('div.actions', null, ui.button('Prüfen', { onclick: check })));
      return { el: root, focus: () => field.focus({ preventScroll: true }) };
    },

    cloze(root, item, ctx, tip, done) {
      const segs = [{ t: 'text', v: item.before }, { t: 'verb', v: '' }, { t: 'text', v: item.after }];
      const solution = item.before + item.answer + item.after;
      if (ctx.inputMode === 'choice') {
        const { el, inputs: blanks } = TT.ex.gapSentence(segs, item.hint, { blanks: true });
        root.append(el, tip.el, TT.ex.choiceList(item.choices.map((c) => ({ label: c, correct: TT.lessonCheck(c, item.accept) })), (opt) => {
          blanks[0].textContent = opt.label;
          done(opt.correct, solution);
        }));
        return { el: root };
      }
      const { el, inputs } = TT.ex.gapSentence(segs, item.hint);
      const check = () => {
        const answer = TT.ex.joinInputs(inputs);
        if (!answer) {
          ui.toast('Bitte zuerst ausfüllen');
          inputs[0].focus();
          return;
        }
        const ok = TT.lessonCheck(answer, item.accept);
        inputs[0].disabled = true;
        inputs[0].classList.add(ok ? 'ok' : 'bad');
        done(ok, solution);
      };
      root.append(el, tip.el, h('div.actions', null, ui.button('Prüfen', { onclick: check })));
      return { el: root, focus: () => inputs[0].focus({ preventScroll: true }) };
    },

    errorspot(root, item, ctx, tip, done) {
      const judge = (saysCorrect) => {
        yesNo.querySelectorAll('button').forEach((b) => (b.disabled = true));
        if (item.correct || saysCorrect) {
          done(saysCorrect === item.correct, item.answer);
          return;
        }
        // Fehler erkannt: richtige Version auswählen
        root.insertBefore(h('p.ex-task', null, 'Gut erkannt! Welche Version ist richtig?'), tip.el);
        root.insertBefore(TT.ex.choiceList(item.options.map((o) => ({ label: o, correct: o === item.answer })), (opt) => done(opt.correct, item.answer)), tip.el);
      };
      const yesNo = h('div.btn-row', null,
        ui.button('Richtig', { kind: 'secondary', onclick: () => judge(true) }),
        ui.button('Falsch', { kind: 'secondary', onclick: () => judge(false) }));
      root.append(h('p.sentence', null, item.shown), tip.el, yesNo);
      return { el: root };
    },

    // Mehrere Lücken, immer getippt (auch bei der Einstellung „Auswahl“); richtig nur, wenn alle stimmen
    replace(root, item, ctx, tip, done) {
      const segs = item.target.map((s) => (s.t === 'gap' ? { t: 'verb', v: '' } : s));
      const { el, inputs } = TT.ex.gapSentence(segs, null);
      const check = () => {
        const empty = inputs.find((i) => !i.value.trim());
        if (empty) {
          ui.toast(inputs.length > 1 ? 'Bitte alle Lücken ausfüllen' : 'Bitte zuerst ausfüllen');
          empty.focus();
          return;
        }
        const oks = inputs.map((inp, i) => TT.lessonCheck(inp.value, item.gaps[i].accept));
        inputs.forEach((inp, i) => {
          inp.disabled = true;
          inp.classList.add(oks[i] ? 'ok' : 'bad');
          // falsche Lücke: Lösung direkt dahinter zeigen (bei mehreren Lücken sonst schwer zu finden)
          if (!oks[i]) inp.after(h('span.gap-fix', null, item.gaps[i].answer));
        });
        done(oks.every(Boolean), item.answer);
      };
      root.append(sentenceEl(item.source), h('div', null, h('span.target-label', null, '→ mit Pronomen')), el, tip.el,
        h('div.actions', null, ui.button('Prüfen', { onclick: check })));
      return { el: root, focus: () => inputs[0].focus({ preventScroll: true }) };
    },

    // Bausteine antippen: oben entsteht der Satz, ein Tippen auf einen gewählten Baustein nimmt ihn zurück
    order(root, item, ctx, tip, done) {
      const picked = [];
      let locked = false;
      const line = h('div.order-line', { role: 'group', 'aria-label': 'Dein Satz' });
      const pool = h('div.order-pool', { role: 'group', 'aria-label': 'Bausteine' });
      const chips = item.chunks.map((c, i) => {
        const b = h('button.order-chip', { type: 'button' }, c);
        b.addEventListener('click', () => {
          if (locked || picked.includes(i)) return;
          picked.push(i);
          draw();
        });
        return b;
      });
      const draw = () => {
        line.replaceChildren(...(picked.length
          ? picked.map((i, pos) => h('button.order-chip.picked', { type: 'button', disabled: locked, onclick: () => {
            if (locked) return;
            picked.splice(pos, 1);
            draw();
          } }, item.chunks[i]))
          : [h('span.order-empty', null, 'Tippe die Bausteine unten der Reihe nach an.')]),
        ...(picked.length === item.chunks.length ? [h('span.order-punct', null, item.punct)] : []));
        chips.forEach((b, i) => {
          b.disabled = locked || picked.includes(i);
          b.classList.toggle('used', picked.includes(i));
        });
      };
      pool.append(...chips);
      draw();
      const check = () => {
        if (picked.length < item.chunks.length) {
          ui.toast('Bitte alle Bausteine verwenden');
          return;
        }
        const ok = TT.lessonCheck(picked.map((i) => item.chunks[i]).join(' '), item.accept);
        locked = true;
        draw();
        pool.hidden = true; // alle Bausteine stehen oben – leeren Platz nicht stehen lassen
        line.classList.add(ok ? 'ok' : 'bad');
        done(ok, item.answer);
      };
      root.append(line, pool, tip.el, h('div.actions', null, ui.button('Prüfen', { onclick: check })));
      return { el: root };
    },

    identify(root, item, ctx, tip, done) {
      const right = item.options.find((o) => o.correct).label;
      root.append(sentenceEl(item.sentence), tip.el, TT.ex.choiceList(item.options, (opt) => done(opt.correct, right)));
      return { el: root };
    },
  };

  for (const kind of TT.LESSON_KINDS) {
    TT.exercises['l-' + kind] = create(kind);
    TT.ex.LABELS['l-' + kind] = KIND_LABELS[kind] + ' (Unterricht)';
  }
})(globalThis.TT = globalThis.TT || {});
