(function (TT) {
  'use strict';

  const { h, ui } = TT;
  const LEVELS = { 1: 'Stufe 1 · Einstieg', 2: 'Stufe 2 · mit Perfect-Formen', 3: 'Stufe 3 · alle 12 Zeitformen' };

  TT.screens.stories = {
    render() {
      const st = TT.app.state;
      return ui.page(
        ui.header('Geschichten', { back: '#/ueben', backLabel: 'Üben', subtitle: 'Zusammenhängende Lückentexte. Die Zeitform ergibt sich aus dem Kontext.' }),
        ...[1, 2, 3].map((lvl) =>
          ui.group(LEVELS[lvl], TT.STORIES.filter((s) => s.level === lvl).map((s) => {
            const best = st.stories[s.id] && st.stories[s.id].best;
            const gaps = TT.parseStory(s.text).filter((p) => p.t === 'gap').length;
            return ui.row({ href: '#/geschichte/' + s.id, title: s.title, subtitle: gaps + ' Lücken', right: best === undefined ? '' : Math.round(best * 100) + ' %' });
          })))
      );
    },
  };

  TT.screens.story = {
    render(id) {
      const story = TT.STORIES.find((s) => s.id === id);
      if (!story) return ui.page(ui.header('Geschichte nicht gefunden', { back: '#/geschichten', backLabel: 'Geschichten' }));
      const app = TT.app;
      const parts = TT.parseStory(story.text);
      const textEl = h('p.story-text');
      const gaps = [];
      const total = parts.filter((p) => p.t === 'gap').length;
      for (const p of parts) {
        if (p.t === 'text') {
          textEl.appendChild(document.createTextNode(p.v));
          continue;
        }
        const input = h('input.gap', {
          type: 'text', autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off', spellcheck: 'false',
          'aria-label': 'Lücke ' + (gaps.length + 1) + ': ' + p.verb,
          enterkeyhint: gaps.length + 1 < total ? 'next' : 'done',
        });
        input.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' || e.isComposing) return;
          e.preventDefault();
          if (e.repeat) return;
          const i = gaps.findIndex((g) => g.input === input);
          const next = gaps.slice(i + 1).find((g) => !g.input.value.trim());
          if (next) next.input.focus();
        });
        input.addEventListener('input', () => { input.style.width = Math.max(8, input.value.length + 2) + 'ch'; });
        const fix = h('span.gap-fix');
        textEl.append(input, h('span.inf', null, ' (' + (p.polarity === 'neg' ? 'not ' : '') + p.verb + ')'), fix);
        gaps.push({ part: p, input, fix });
      }

      const result = h('div');
      const actions = h('div.actions');

      const check = () => {
        const now = new Date();
        const st = app.state;
        const notes = [];
        let ok = 0;
        gaps.forEach((g, i) => {
          const verb = TT.findVerb(g.part.verb);
          const task = { accept: g.part.accept, verb, tense: g.part.tense, polarity: g.part.polarity };
          const d = TT.checkAnswer(g.input.value, task);
          g.input.disabled = true;
          g.input.classList.add(d.ok ? 'ok' : 'bad');
          TT.progress.record(st, { tense: g.part.tense, score: d.ok ? 1 : 0, ex: 'story', usedTense: d.used || null, now });
          if (d.ok) {
            ok++;
          } else {
            g.fix.textContent = g.part.accept[0];
            TT.progress.addMistake(st, { tense: g.part.tense, confusedWith: d.used || null, ex: 'story', now });
            notes.push(h('div.row.stack', null,
              h('span.row-title', null, 'Lücke ' + (i + 1) + ': ' + g.part.accept[0]),
              h('span.row-sub', { html: TT.explain(d, task) + (d.kind === 'wrong-tense' ? '' : ' Gesucht: ' + TT.tense(g.part.tense).name + '.') })));
          }
        });
        const score = ok / gaps.length;
        const prev = st.stories[story.id];
        st.stories[story.id] = { best: Math.max(score, prev ? prev.best : 0) };
        app.save();
        result.replaceChildren(
          h('div.card', null, h('h2', { style: { margin: '0 0 8px', fontSize: '22px' } }, ok + ' von ' + gaps.length + ' richtig'), ui.bar(score)),
          notes.length ? ui.group('Erklärungen', notes) : null
        );
        actions.replaceChildren(
          ui.button('Nochmal', { kind: 'secondary', onclick: () => TT.router.refresh() }),
          ui.button('Andere Geschichte', { kind: 'plain', onclick: () => TT.router.go('/geschichten') })
        );
        result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      actions.appendChild(ui.confirmTap(ui.button('Prüfen'), 'Lücken leer – trotzdem prüfen?', check, {
        needed: () => gaps.some((g) => !g.input.value.trim()),
      }));
      return ui.page(
        ui.header(story.title, { back: '#/geschichten', backLabel: 'Geschichten', subtitle: LEVELS[story.level] }),
        h('div.card', null, textEl),
        result,
        actions
      );
    },
  };
})(globalThis.TT = globalThis.TT || {});
