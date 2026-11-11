(function (TT) {
  'use strict';

  // Gleicht den Fortschritt über den Cloud-Speicher des claude.ai-Links zwischen Geräten ab.
  // Die Cloud ist die Wahrheit, localStorage nur ein Zwischenspeicher. In der Datei-Version
  // (kein window.claude) bleibt alles lokal.

  const META_KEY = (TT.storageNs || '') + 'tenseTrainer.v1.sync';
  const PUSH_DELAY = 800;
  // Vokabel-Dokumente sind groß – Bewertungen sammeln; beim Verlassen/Wegschalten lädt flush() sofort hoch.
  const JOIN_PUSH_DELAY = 8000;
  const LOAD_TIMEOUT = 10000;

  function hasProgress(state) {
    return Object.values(state.history).some((l) => l.length > 0) || state.review.length > 0 ||
      Object.keys(state.days).length > 0 || Object.keys(state.stories).length > 0;
  }

  // Vereinigt zwei Stände, ohne Übungsergebnisse zu verlieren (nur nötig, wenn beide
  // Geräte unabhängig voneinander geübt haben).
  function merge(a, b, now) {
    const newer = (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
    const older = newer === a ? b : a;
    const out = TT.store.defaults();
    out.settings = Object.assign({}, newer.settings);
    out.updatedAt = Math.max(now || 0, (a.updatedAt || 0) + 1, (b.updatedAt || 0) + 1);

    for (const k of new Set([...Object.keys(a.history), ...Object.keys(b.history)])) {
      const seen = new Set();
      const list = [];
      for (const e of [...(a.history[k] || []), ...(b.history[k] || [])]) {
        const key = e.t + '|' + e.ex + '|' + e.score;
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({ t: e.t, score: e.score, ex: e.ex });
      }
      out.history[k] = list.sort((x, y) => x.t - y.t).slice(-20);
    }
    for (const field of ['confusions', 'days']) {
      for (const src of [a, b]) {
        for (const [k, v] of Object.entries(src[field])) out[field][k] = Math.max(out[field][k] || 0, v);
      }
    }
    for (const src of [a, b]) {
      for (const [k, v] of Object.entries(src.stories)) {
        if (!out.stories[k] || v.best > out.stories[k].best) out.stories[k] = { best: v.best };
      }
    }
    // Schalter fürs tägliche Training: pro Thema gewinnt die neuere Änderung
    for (const src of [a, b]) {
      for (const [k, v] of Object.entries(src.daily || {})) {
        if (!out.daily[k] || v.t > out.daily[k].t) out.daily[k] = { t: v.t, on: v.on };
      }
    }
    // Fehlerkiste: ein Eintrag pro Fehlerart (wie in progress.addMistake), der neuere Stand gewinnt.
    const bySig = new Map();
    for (const r of [...older.review, ...newer.review]) bySig.set(r.tense + '|' + r.confusedWith + '|' + r.ex, Object.assign({}, r));
    out.review = [...bySig.values()];
    return out;
  }

  // Entscheidet, was beim Eintreffen eines Cloud-Stands passiert.
  // meta.baseAt: Stand der Cloud, auf dem das Gerät aufbaut; meta.dirty: lokale Änderungen,
  // die die Cloud noch nicht hat; inFlight: ein Schreibvorgang ist unterwegs.
  // Ergebnis: state = neuer lokaler Stand (oder null), push = lokalen Stand hochladen.
  function reconcile(local, remote, meta, inFlight, now) {
    if (!remote) return { state: null, push: true };
    if (remote.updatedAt === meta.baseAt) return { state: null, push: meta.dirty };
    if (!meta.dirty && !inFlight) return { state: remote, push: false };
    return { state: merge(local, remote, now), push: true };
  }

  // Stabile Textform eines Werts (Schlüssel sortiert) – zum Vergleichen zweier Stände.
  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
    return JSON.stringify(v);
  }

  let app = null;
  let db = null;
  let uid = null;
  let ref = null;
  let ready = false;
  let inFlight = false;
  let blocked = false;
  let retried = false;
  let resubscribes = 0;
  let timer = null;
  let meta = { baseAt: 0, dirty: false };
  let base = 'local'; // local | off | connecting | online
  let status = 'local';
  const sources = {}; // Status je Dokument, solange base = online
  const joins = {}; // weitere Dokumente (Vokabeln), siehe joinDoc
  const listeners = new Set();

  function overall() {
    if (base !== 'online') return base;
    const all = Object.values(sources);
    for (const s of ['error', 'offline', 'connecting']) if (all.includes(s)) return s;
    return 'synced';
  }

  function emit() {
    const s = overall();
    if (s === status) return;
    status = s;
    for (const fn of listeners) fn(s);
  }

  function setBase(b) {
    base = b;
    emit();
  }

  function setStatus(source, s) {
    sources[source] = s;
    emit();
  }

  function readMeta(state) {
    try {
      const m = JSON.parse(globalThis.localStorage.getItem(META_KEY));
      if (m && typeof m.baseAt === 'number' && typeof m.dirty === 'boolean') return m;
    } catch (e) {
      /* kein Speicher oder beschädigt */
    }
    // Erster Start mit Sync: vorhandener Fortschritt wird mit der Cloud vereinigt, nicht überschrieben.
    return { baseAt: 0, dirty: hasProgress(state) };
  }

  function writeMeta() {
    try {
      globalThis.localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch (e) {
      /* kein Speicher */
    }
  }

  function replaceState(next) {
    for (const k of Object.keys(app.state)) delete app.state[k];
    Object.assign(app.state, next);
  }

  // Mehrere Aufrufe kurz hintereinander (beim ersten Laden bis zu 10) werden zu einem Neuaufbau.
  let redrawTimer = null;
  function redraw() {
    if (redrawTimer) return;
    redrawTimer = setTimeout(() => {
      redrawTimer = null;
      app.applyTheme();
      // Laufende Übung, Lernrunde und Eingabefelder nicht unter den Fingern neu aufbauen.
      if (/^#\/?(training|einstellungen|grammatik\/training|geschichte(\/|$)|vokabeln\/(lernen|wort|einstellungen|liste))/.test(location.hash)) return;
      TT.router.refresh();
    }, 0);
  }

  function pushSoon(delay) {
    clearTimeout(timer);
    timer = setTimeout(push, delay);
  }

  async function push() {
    timer = null;
    if (!ready || inFlight || blocked || !ref) return;
    inFlight = true;
    const state = app.state;
    const json = TT.store.exportText(state);
    meta.baseAt = state.updatedAt;
    meta.dirty = false;
    writeMeta();
    let code = null;
    try {
      await ref.set({ v: 1, updatedAt: state.updatedAt, json });
    } catch (e) {
      code = (e && e.code) || 'unavailable';
    }
    inFlight = false;
    if (code) {
      meta.dirty = true;
      writeMeta();
      if (code === 'unavailable' || code === 'resource_exhausted') {
        setStatus('progress', 'offline');
        if (!retried) {
          retried = true;
          pushSoon(4000 + Math.random() * 4000);
        }
      } else {
        blocked = true;
        setStatus('progress', 'error');
      }
      return;
    }
    retried = false;
    if (meta.dirty) pushSoon(PUSH_DELAY);
    else setStatus('progress', 'synced');
  }

  function onRemote(snap) {
    let remote = null;
    if (snap.exists) {
      const body = snap.data();
      try {
        remote = TT.store.importText(body && body.json);
      } catch (e) {
        remote = null; // unlesbar: wird mit dem lokalen Stand überschrieben
      }
    }
    const first = !ready;
    ready = true;
    const r = reconcile(app.state, remote, meta, inFlight, Date.now());
    if (r.state) {
      replaceState(r.state);
      TT.store.save(app.state);
      if (r.push) meta.dirty = true;
      else {
        meta.baseAt = r.state.updatedAt;
        meta.dirty = false;
      }
      writeMeta();
      redraw();
      if (first) TT.ui.toast('Fortschritt synchronisiert');
    }
    if (r.push) pushSoon(0);
    else if (!inFlight && !meta.dirty) setStatus('progress', 'synced');
  }

  function subscribe() {
    const loadTimer = setTimeout(() => {
      if (!ready) setStatus('progress', 'offline');
    }, LOAD_TIMEOUT);
    ref.onSnapshot((snap) => {
      // Ein zwischengespeicherter Stand reicht nicht, um die Cloud zu überschreiben.
      if (snap.metadata.fromCache && !ready) return;
      clearTimeout(loadTimer);
      if (!snap.metadata.fromCache) resubscribes = 0;
      onRemote(snap);
    }, (e) => {
      clearTimeout(loadTimer);
      if (e && e.code === 'unavailable') {
        resubscribes++;
        setStatus('progress', 'offline');
        setTimeout(subscribe, Math.min(60000, 5000 * resubscribes));
        return;
      }
      blocked = true;
      setStatus('progress', 'error');
    });
  }

  // ---- Weitere Dokumente, die sich ohne Konflikte zusammenführen lassen (Vokabeln) ----
  // adapter: get() → aktueller Teilstand, apply(obj) → Teilstand übernehmen und lokal speichern,
  // merge(a, b) → zusammengeführter Teilstand (prüft b). Weil merge pro Eintrag den neueren nimmt,
  // braucht es keine Buchführung über Basisstände: zusammenführen, übernehmen, hochladen, wenn verschieden.

  function joinDoc(name, adapter) {
    const j = (joins[name] = { name, adapter, ref: null, ready: false, inFlight: false, dirty: false, blocked: false, retried: false, resubscribes: 0, timer: null });
    if (db && uid) openJoin(j);
  }

  function openJoin(j) {
    j.ref = db.doc('data/users/' + uid + '/' + j.name);
    setStatus(j.name, 'connecting');
    subscribeJoin(j);
  }

  function joinPushSoon(j, delay) {
    clearTimeout(j.timer);
    j.timer = setTimeout(() => pushJoin(j), delay);
  }

  async function pushJoin(j) {
    j.timer = null;
    if (!j.ready || j.inFlight || j.blocked) return;
    j.inFlight = true;
    j.dirty = false;
    let code = null;
    try {
      await j.ref.set({ v: 1, json: JSON.stringify(j.adapter.get()) });
    } catch (e) {
      code = (e && e.code) || 'unavailable';
    }
    j.inFlight = false;
    if (code) {
      j.dirty = true;
      if (code === 'unavailable' || code === 'resource_exhausted') {
        setStatus(j.name, 'offline');
        if (!j.retried) {
          j.retried = true;
          joinPushSoon(j, 4000 + Math.random() * 4000);
        }
      } else {
        j.blocked = true;
        setStatus(j.name, 'error');
      }
      return;
    }
    j.retried = false;
    if (j.dirty) joinPushSoon(j, JOIN_PUSH_DELAY);
    else setStatus(j.name, 'synced');
  }

  function onJoinRemote(j, snap) {
    let remote = null;
    if (snap.exists) {
      try {
        remote = JSON.parse(snap.data().json);
      } catch (e) {
        remote = null; // unlesbar: wird mit dem lokalen Stand überschrieben
      }
    }
    const wasReady = j.ready;
    j.ready = true;
    const local = j.adapter.get();
    const merged = remote ? j.adapter.merge(local, remote) : local;
    const text = canon(merged);
    if (text !== canon(local)) {
      j.adapter.apply(merged);
      redraw();
    } else if (!wasReady && joinsReady()) {
      redraw(); // der letzte Lernstand ist da: Bildschirme mit „Lernstand wird geladen“ neu aufbauen
    }
    if (!remote || text !== canon(remote)) {
      j.dirty = true;
      joinPushSoon(j, 0);
    } else if (!j.inFlight) {
      // Server und Gerät sind gleich: auch ein liegengebliebener Hochlade-Wunsch ist damit erledigt
      j.dirty = false;
      clearTimeout(j.timer);
      j.timer = null;
      setStatus(j.name, 'synced');
    }
    // Der Status ändert sich dabei nicht unbedingt: wartende Bildschirme extra benachrichtigen.
    if (!wasReady && joinsReady()) for (const fn of listeners) fn(status);
  }

  function subscribeJoin(j) {
    const loadTimer = setTimeout(() => {
      if (!j.ready) setStatus(j.name, 'offline');
    }, LOAD_TIMEOUT);
    j.ref.onSnapshot((snap) => {
      if (snap.metadata.fromCache && !j.ready) return;
      // Echo des eigenen Schreibens: die bestätigte Fassung folgt gleich.
      if (j.ready && snap.metadata.hasPendingWrites) return;
      clearTimeout(loadTimer);
      if (!snap.metadata.fromCache) j.resubscribes = 0;
      onJoinRemote(j, snap);
    }, (e) => {
      clearTimeout(loadTimer);
      if (e && e.code === 'unavailable') {
        j.resubscribes++;
        setStatus(j.name, 'offline');
        setTimeout(() => subscribeJoin(j), Math.min(60000, 5000 * j.resubscribes));
        return;
      }
      j.blocked = true;
      setStatus(j.name, 'error');
    });
  }

  // Ist der Lernstand aller Vokabel-Dokumente aus der Cloud da? (Ohne Sync immer ja.)
  function joinsReady() {
    if (base === 'local' || base === 'off') return true;
    if (base === 'connecting') return false;
    return Object.values(joins).every((j) => j.ready);
  }

  // Nach einer lokalen Änderung an Dokument `name` aufrufen.
  function touch(name) {
    const j = joins[name];
    if (!j) return;
    j.dirty = true;
    if (!j.ready || j.blocked) return;
    j.retried = false;
    joinPushSoon(j, JOIN_PUSH_DELAY);
  }

  // Liegengebliebene Änderungen sofort hochladen (beim Verlassen, beim Zurückkommen, wieder online).
  function flush() {
    if (ready && meta.dirty && !blocked && !inFlight) {
      clearTimeout(timer);
      retried = false;
      push();
    }
    for (const j of Object.values(joins)) {
      if (j.ready && j.dirty && !j.blocked && !j.inFlight) {
        clearTimeout(j.timer);
        j.retried = false;
        pushJoin(j);
      }
    }
  }

  // Wartet noch etwas auf das Hochladen? (geplant, unterwegs oder nach einem Fehler liegengeblieben)
  function pending() {
    if (base !== 'online') return false;
    if (meta.dirty || inFlight || timer) return true;
    return Object.values(joins).some((j) => j.dirty || j.inFlight || j.timer);
  }

  function unavailable() {
    setBase('off');
    if (!TT.store.available) TT.ui.toast('Fortschritt kann in diesem Browser nicht gespeichert werden.');
  }

  async function start(theApp) {
    app = theApp;
    meta = readMeta(app.state);
    // Web-Version: Supabase-Konto (js/cloud/supa.js); claude.ai-Link: Speicher des Artifacts; sonst nur lokal
    const c = TT.cloud && TT.cloud.enabled ? TT.cloud : globalThis.claude;
    if (!c || typeof c.use !== 'function') {
      setBase('local');
      if (!TT.store.available) TT.ui.toast('Fortschritt kann in diesem Browser nicht gespeichert werden.');
      return;
    }
    setBase('connecting');
    try {
      const [d, user] = await Promise.all([c.use('db'), c.use('user')]);
      db = d;
      uid = user ? await user.id() : null;
      if (db && uid) ref = db.doc('data/users/' + uid + '/progress');
    } catch (e) {
      ref = null;
    }
    if (!ref) {
      db = null;
      uid = null;
      return unavailable();
    }
    sources.progress = 'connecting';
    setBase('online');
    subscribe();
    for (const j of Object.values(joins)) openJoin(j);
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    window.addEventListener('online', flush);
  }

  // Von app.save() nach jeder lokalen Änderung aufgerufen.
  function changed() {
    meta.dirty = true;
    writeMeta();
    if (!ready || blocked) return;
    retried = false;
    pushSoon(PUSH_DELAY);
  }

  TT.sync = {
    merge,
    reconcile,
    hasProgress,
    canon,
    start,
    changed,
    joinDoc,
    touch,
    flush,
    pending,
    joinsReady,
    status: () => status,
    onStatus(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
})(globalThis.TT = globalThis.TT || {});
