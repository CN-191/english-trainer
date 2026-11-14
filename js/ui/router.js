(function (TT) {
  'use strict';

  const ROUTES = {
    start: 'start', ueben: 'practice', training: 'run', auswertung: 'summary', geschichten: 'stories',
    geschichte: 'story', grammatik: 'grammar', statistik: 'stats', einstellungen: 'settings', vokabeln: 'vocab',
    unterricht: 'lesson', hausaufgaben: 'homework', stunden: 'lessonLog',
  };
  const TABS = [['start', 'Start'], ['ueben', 'Üben'], ['vokabeln', 'Vokabeln'], ['grammatik', 'Grammatik'], ['statistik', 'Statistik']];
  const TAB_OF = { einstellungen: 'start', geschichten: 'ueben', geschichte: 'ueben', auswertung: 'ueben', unterricht: 'ueben', hausaufgaben: 'start', stunden: 'start' };
  const HIDE_TABS = ['training', 'geschichte'];

  let appEl = null;
  let tabEl = null;
  let cleanup = null;

  function current() {
    const parts = (location.hash.replace(/^#\/?/, '') || 'start').split('/');
    return { name: parts[0] || 'start', param: parts.length > 1 && parts[1] ? parts.slice(1).map(decodeURIComponent).join('/') : null };
  }

  function placeholder() {
    return TT.ui.page(TT.ui.header('Bald verfügbar'), TT.h('p.muted', null, 'Dieser Bereich ist noch nicht fertig.'));
  }

  function renderTabs(name, param) {
    const active = TAB_OF[name] || name;
    const hide = HIDE_TABS.includes(name) || (name === 'vokabeln' && param === 'lernen');
    tabEl.hidden = hide;
    document.body.classList.toggle('no-tabs', hide);
    tabEl.replaceChildren(
      ...TABS.map(([id, label]) =>
        TT.h('a.tab' + (id === active ? '.active' : ''), { href: '#/' + id, 'aria-current': id === active ? 'page' : null },
          TT.h('span.tab-icon', null, TT.ui.icon(id)), TT.h('span', null, label)))
    );
  }

  function render() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    const { name, param } = current();
    const screen = TT.screens[ROUTES[name]];
    let el;
    if (!screen) {
      el = placeholder();
    } else {
      const res = screen.render(param);
      el = res instanceof Node ? res : res.el;
      cleanup = res instanceof Node ? null : res.cleanup || null;
    }
    appEl.replaceChildren(el);
    renderTabs(name, param);
    window.scrollTo(0, 0);
  }

  TT.router = {
    start(app, tabbar) {
      appEl = app;
      tabEl = tabbar;
      window.addEventListener('hashchange', render);
      render();
    },
    go(path) {
      if (location.hash === '#' + path) render();
      else location.hash = '#' + path;
    },
    refresh: render,
  };
})(globalThis.TT = globalThis.TT || {});
