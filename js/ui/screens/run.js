(function (TT) {
  'use strict';

  const { h, ui } = TT;

  function render() {
    const app = TT.app;
    const S = app.session;
    if (!S) {
      setTimeout(() => TT.router.go('/start'));
      return ui.page(ui.header('Keine Übung aktiv'));
    }

    const bar = h('div');
    const count = h('span.ex-count');
    const body = h('div');

    function finish() {
      app.lastSummary = { mode: S.mode, duel: S.duel, results: S.results };
      app.session = null;
      TT.router.go('/auswertung');
    }

    const close = h('button.icon-btn', { type: 'button', 'aria-label': 'Übung beenden' }, ui.icon('close'));
    ui.confirmTap(close, 'Wirklich beenden?', () => {
      if (S.results.length) {
        finish();
      } else {
        app.session = null;
        TT.router.go('/start');
      }
    }, {
      swapText: false,
      needed: () => S.results.length > 0,
      onArm: () => ui.toast('Zum Beenden nochmal tippen'),
    });

    function updateProgress() {
      const total = S.tasks.length;
      bar.style.width = Math.round((S.results.length / total) * 100) + '%';
      count.textContent = Math.min(S.index + 1, total) + ' / ' + total;
    }

    function handle(task, res) {
      const now = new Date();
      const st = app.state;
      const exName = res.ex || task.ex;
      TT.progress.record(st, { tense: task.tense, score: res.score, ex: exName, usedTense: res.usedTense, now });
      if (task.reviewId) TT.progress.reviewAnswer(st, task.reviewId, res.correct, now);
      else if (!res.correct) TT.progress.addMistake(st, { tense: task.tense, confusedWith: res.usedTense, ex: exName, now });
      if (!res.correct && !task.repeat) TT.session.insertRepeat(S.tasks, S.index, task);
      S.results.push({ tense: task.tense, correct: res.correct, score: res.score, usedTense: res.usedTense, ex: exName });
      S.answeredIndex = S.index;
      app.save();
      updateProgress();
    }

    function show() {
      if (S.answeredIndex === S.index) S.index++;
      if (S.index >= S.tasks.length) {
        finish();
        return;
      }
      updateProgress();
      const task = S.tasks[S.index];
      const exercise = TT.exercises[task.ex] || TT.exercises.cloze;
      const view = exercise.create(task, {
        inputMode: S.inputMode,
        duel: S.duel,
        onAnswered: (res) => handle(task, res),
        next: show,
      });
      body.replaceChildren(view.el);
      window.scrollTo(0, 0);
      if (view.focus) view.focus();
    }

    // Enter prüft bzw. geht weiter, außer der Fokus liegt auf einem Button (der löst selbst aus)
    function onKey(e) {
      if (e.key !== 'Enter' || e.isComposing) return;
      if (e.repeat) {
        e.preventDefault();
        return;
      }
      const t = e.target;
      if (t instanceof HTMLButtonElement || t instanceof HTMLTextAreaElement || t instanceof HTMLAnchorElement) return;
      // Enter in einer Lücke springt zur nächsten leeren Lücke, statt eine halbe Antwort zu prüfen
      if (t instanceof HTMLInputElement && t.classList.contains('gap')) {
        const gaps = Array.from(body.querySelectorAll('input.gap'));
        const next = gaps.slice(gaps.indexOf(t) + 1).find((g) => !g.disabled && !g.value.trim());
        if (next) {
          e.preventDefault();
          next.focus();
          return;
        }
      }
      const buttons = body.querySelectorAll('.actions .btn-primary:not(:disabled)');
      if (buttons.length) {
        e.preventDefault();
        buttons[buttons.length - 1].click();
      }
    }
    document.addEventListener('keydown', onKey);

    const page = ui.page(h('div.ex-top', null, close, h('div.progress', null, bar), count), body);
    show();
    return { el: page, cleanup: () => document.removeEventListener('keydown', onKey) };
  }

  TT.screens.run = { render };
})(globalThis.TT = globalThis.TT || {});
