(function (TT) {
  'use strict';

  // Web-Version: Anmeldung mit Nutzername + Passwort und Lernstand je Konto in Supabase.
  // Spricht die REST-Schnittstellen direkt an (kein Fremdcode): /auth/v1 (Anmeldung), /rest/v1/docs (Lernstand),
  // /functions/v1/accounts (Konten verwalten). TT.cloud.use('db' | 'user') liefert dieselbe Schnittstelle,
  // die js/learn/sync.js vom claude.ai-Speicher kennt (doc(path).set / onSnapshot) – der Abgleich bleibt derselbe.
  //
  // Der Zwischenspeicher im Browser liegt je Konto unter eigenen Schlüsseln (TT.storageNs), damit sich zwei
  // Personen am selben Gerät nie den Lernstand mischen. Aus demselben Grund ist eine geladene Seite fest an
  // das Konto gebunden, mit dem sie geladen wurde (bootUid): Meldet sich in einem anderen Tab jemand anderes an,
  // arbeitet diese Seite nicht mit dessen Sitzung weiter, sondern lädt neu.

  const C = TT.CLOUD;
  const SESSION_KEY = 'englishTrainer.session';
  const POLL_MS = 45000;
  const KEEPALIVE_MAX = 60000; // bis zu dieser Größe darf eine Anfrage das Schließen der Seite überleben
  const inArtifact = () => !!(globalThis.claude && typeof globalThis.claude.use === 'function');
  // Nur als Webseite (http/https). Die Datei-Version (file://) bleibt lokal wie bisher.
  const onWeb = !globalThis.location || /^https?:$/.test(globalThis.location.protocol);
  const enabled = !!(C && C.url && C.key && typeof globalThis.fetch === 'function') && onWeb && !inArtifact();

  const ls = (() => {
    try {
      const s = globalThis.localStorage;
      if (!s) return null;
      s.getItem(SESSION_KEY);
      return s;
    } catch (e) {
      return null;
    }
  })();
  let memorySession = null; // Ersatz ohne localStorage (Node, private Fenster): Anmeldung hält bis zum Neuladen

  const isStr = (v) => typeof v === 'string' && v.length > 0;
  function validSession(s) {
    return !!(s && isStr(s.access_token) && isStr(s.refresh_token) && typeof s.expires_at === 'number' &&
      s.user && isStr(s.user.id) && isStr(s.user.username));
  }
  // Die gespeicherte Sitzung, egal welchem Konto sie gehört
  function storedSession() {
    try {
      const s = ls ? JSON.parse(ls.getItem(SESSION_KEY)) : memorySession;
      return validSession(s) ? s : null;
    } catch (e) {
      return null;
    }
  }
  function writeSession(s) {
    memorySession = s;
    try {
      if (ls) {
        if (s) ls.setItem(SESSION_KEY, JSON.stringify(s));
        else ls.removeItem(SESSION_KEY);
      }
    } catch (e) {
      /* Speicher voll oder gesperrt: Anmeldung hält dann nur bis zum Neuladen */
    }
  }

  // Konto dieser Seite: beim Laden festgelegt (null = Anmeldeseite)
  const boot = enabled ? storedSession() : null;
  let bootUid = boot ? boot.user.id : null;
  // Die Sitzung, mit der diese Seite arbeiten darf: nur die des eigenen Kontos
  function readSession() {
    const s = storedSession();
    return s && (!bootUid || s.user.id === bootUid) ? s : null;
  }

  // reason: 'expired' (Sitzung ungültig) oder 'changed' (anderes Konto oder Abmeldung in einem anderen Tab)
  const signedOutListeners = new Set();
  let signedOutSent = false;
  function notifySignedOut(reason) {
    if (signedOutSent) return;
    signedOutSent = true;
    for (const fn of signedOutListeners) fn(reason);
  }
  function signedOut() {
    // Nur die eigene Sitzung beenden – nie die eines anderen Kontos, das sich inzwischen angemeldet hat
    if (readSession()) writeSession(null);
    notifySignedOut(storedSession() ? 'changed' : 'expired');
  }
  // Gehört die gespeicherte Sitzung nicht (mehr) zu dieser Seite?
  function foreign() {
    if (!bootUid || readSession()) return false;
    notifySignedOut('changed');
    return true;
  }

  const err = (code, message) => Object.assign(new Error(message || code), { code });

  // Eine Anfrage; Netzfehler, Überlastung und unlesbare Antworten werden zu { code: 'unavailable' }.
  async function request(path, o = {}) {
    let res;
    const body = o.body === undefined ? undefined : JSON.stringify(o.body);
    try {
      res = await fetch(C.url + path, {
        method: o.method || 'GET',
        headers: Object.assign({ apikey: C.key, 'Content-Type': 'application/json' },
          o.token ? { Authorization: 'Bearer ' + o.token } : {}, o.headers || {}),
        body,
        keepalive: !!(o.keepalive && body && body.length < KEEPALIVE_MAX),
      });
    } catch (e) {
      throw err('unavailable', 'Keine Verbindung.');
    }
    let data = null;
    let readable = true;
    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      readable = false; // z. B. die Anmeldeseite eines WLANs statt der Antwort des Servers
    }
    if (res.status >= 500 || res.status === 429 || res.status === 408 || !readable) throw err('unavailable', 'Server gerade nicht erreichbar.');
    return { status: res.status, ok: res.status >= 200 && res.status < 300, data };
  }

  function sessionFrom(tokens, user) {
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (Number(tokens.expires_in) || 3600) * 1000,
      user,
    };
  }

  // Zugangstoken, kurz vor Ablauf erneuert. Mehrere Aufrufe gleichzeitig teilen sich eine Erneuerung.
  let refreshing = null;
  function refresh() {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const cur = readSession(); // ein anderer Tab hat vielleicht schon erneuert
      if (!cur) {
        foreign();
        throw err('unauthenticated', 'Bitte neu anmelden.');
      }
      if (cur.expires_at - Date.now() > 120000) return cur.access_token;
      const r = await request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: cur.refresh_token } });
      if (!r.ok || !r.data || !isStr(r.data.access_token)) {
        // Vielleicht war ein anderer Tab schneller (Token schon getauscht): dessen Sitzung nehmen
        const again = readSession();
        if (again && again.refresh_token !== cur.refresh_token) return again.access_token;
        signedOut();
        throw err('unauthenticated', 'Bitte neu anmelden.');
      }
      // Hat sich währenddessen ein anderes Konto angemeldet, dessen Sitzung nicht überschreiben
      if (!readSession()) {
        foreign();
        throw err('unauthenticated', 'Bitte neu anmelden.');
      }
      writeSession(sessionFrom(r.data, cur.user));
      return r.data.access_token;
    })();
    const done = () => { refreshing = null; };
    refreshing.then(done, done);
    return refreshing;
  }

  async function token() {
    const s = readSession();
    if (!s) {
      foreign();
      throw err('unauthenticated', 'Bitte neu anmelden.');
    }
    return s.expires_at - Date.now() > 60000 ? s.access_token : refresh();
  }

  // Anfrage als angemeldeter Nutzer; bei abgelaufenem Token einmal erneuern und wiederholen.
  // o.keepSession: ein zweites 401 meldet nicht ab (Edge Function – dort kann 401 andere Gründe haben).
  async function authed(path, o = {}) {
    let r = await request(path, Object.assign({}, o, { token: await token() }));
    if (r.status === 401) {
      const s = readSession();
      if (s) writeSession(Object.assign({}, s, { expires_at: 0 }));
      r = await request(path, Object.assign({}, o, { token: await refresh() }));
      if (r.status === 401) {
        if (!o.keepSession) signedOut();
        throw err('unauthenticated', 'Bitte neu anmelden.');
      }
    }
    return r;
  }

  const cleanName = (v) => String(v || '').trim().toLowerCase();
  const emailOf = (username) => username + '@' + C.emailDomain;

  async function grant(username, password) {
    const r = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: emailOf(username), password } });
    if (!r.ok || !r.data || !isStr(r.data.access_token)) throw err('invalid_credentials', 'Nutzername oder Passwort stimmt nicht.');
    return r.data;
  }

  // Anmelden (nur auf der Anmeldeseite; danach lädt die Seite mit dem Lernstand dieses Kontos neu)
  async function login(username, password) {
    const name = cleanName(username);
    if (!name || !password) throw err('invalid_credentials', 'Bitte Nutzername und Passwort eingeben.');
    const tokens = await grant(name, password);
    const p = await request('/rest/v1/profiles?select=username,is_admin', { token: tokens.access_token });
    const profile = p.ok && Array.isArray(p.data) ? p.data[0] : null;
    if (!profile) throw err('no_profile', 'Dieses Konto ist nicht freigeschaltet.');
    signedOutSent = false;
    bootUid = tokens.user.id;
    writeSession(sessionFrom(tokens, { id: tokens.user.id, username: profile.username, admin: !!profile.is_admin }));
    return readSession().user;
  }

  async function logout() {
    const s = readSession();
    if (!s) return;
    signedOutSent = true; // die eigene Abmeldung ist kein „abgelaufen“
    writeSession(null);
    try {
      await request('/auth/v1/logout?scope=local', { method: 'POST', token: s.access_token });
    } catch (e) {
      /* offline: die Sitzung ist auf diesem Gerät trotzdem beendet */
    }
  }

  async function changePassword(current, next) {
    const s = readSession();
    if (!s) throw err('unauthenticated', 'Bitte neu anmelden.');
    if (typeof next !== 'string' || next.length < 8 || next.length > 72) throw err('weak_password', 'Neues Passwort: mindestens 8 Zeichen.');
    let tokens;
    try {
      tokens = await grant(s.user.username, current);
    } catch (e) {
      if (e.code === 'invalid_credentials') throw err('invalid_credentials', 'Das aktuelle Passwort stimmt nicht.');
      throw e;
    }
    const r = await request('/auth/v1/user', { method: 'PUT', token: tokens.access_token, body: { password: next } });
    if (!r.ok) {
      const code = r.data && (r.data.error_code || r.data.code);
      throw err('weak_password', code === 'same_password' ? 'Das neue Passwort ist das alte.' : 'Das neue Passwort wurde nicht angenommen (mindestens 8 Zeichen).');
    }
    if (readSession()) writeSession(sessionFrom(tokens, s.user));
  }

  // Konten verwalten (Edge Function). Ohne Anmeldung: status, bootstrap. Sonst nur der Verwalter.
  async function accounts(action, payload, anonymous) {
    const o = { method: 'POST', body: Object.assign({ action }, payload || {}), keepSession: true };
    const r = anonymous ? await request('/functions/v1/accounts', o) : await authed('/functions/v1/accounts', o);
    if (!r.ok) throw Object.assign(err('accounts', (r.data && r.data.error) || 'Das hat nicht geklappt.'), { status: r.status });
    return r.data || {};
  }

  // ---- Dokumentspeicher mit der Schnittstelle des claude.ai-Speichers ----
  // doc('data/users/<id>/<name>') → { set(body), onSnapshot(next, error) }; der Name ist das letzte Pfadstück.
  // Änderungen von anderen Geräten kommen per Abfrage (beim Zurückkehren in die App und alle 45 s).
  // Geschrieben wird nur, wenn der Server-Stand noch der zuletzt gesehene ist; sonst kommt erst der neuere
  // Stand an (sync führt zusammen und lädt erneut hoch) – so überschreibt kein Gerät unbemerkt ein anderes.

  const subs = new Map(); // name → Set von { next, error }
  const seen = new Map(); // name → updated_at des zuletzt gelieferten oder geschriebenen Stands ('' = gibt es nicht)
  let loadTimer = null;
  let pollTimer = null;
  let polling = false;

  const snap = (row) => ({ exists: !!row, data: () => (row ? row.body : undefined), metadata: { fromCache: false, hasPendingWrites: false } });
  function deliver(name, row) {
    seen.set(name, row ? row.updated_at : '');
    for (const s of Array.from(subs.get(name) || [])) s.next(snap(row));
  }
  const inList = (names) => 'name=in.(' + names.join(',') + ')'; // Namen bestehen nur aus Buchstaben, Ziffern, Bindestrich
  // Ist der Server-Stand neuer als der zuletzt gesehene? (Eine Abfrage kann einen eigenen, inzwischen
  // überholten Schreibvorgang zurückliefern – der darf den neueren nicht ersetzen.)
  function newer(name, updatedAt) {
    const have = seen.get(name);
    if (have === updatedAt) return false;
    if (!have) return true;
    const a = Date.parse(updatedAt);
    const b = Date.parse(have);
    return !(a < b);
  }

  // Erstes Laden: alle neu angemeldeten Dokumente in einer Anfrage
  function scheduleLoad() {
    if (loadTimer) return;
    loadTimer = setTimeout(async () => {
      loadTimer = null;
      const pending = [];
      for (const [name, set] of subs) for (const s of set) if (!s.loaded) pending.push({ name, s });
      if (!pending.length) return;
      const names = Array.from(new Set(pending.map((p) => p.name)));
      try {
        const r = await authed('/rest/v1/docs?select=name,body,updated_at&' + inList(names));
        if (!r.ok) throw err(r.status === 401 || r.status === 403 ? 'permission_denied' : 'invalid_argument');
        if (!Array.isArray(r.data)) throw err('unavailable');
        const rows = new Map(r.data.map((row) => [row.name, row]));
        for (const p of pending) p.s.loaded = true;
        for (const name of names) deliver(name, rows.get(name) || null);
        startPolling();
      } catch (e) {
        for (const p of pending) {
          subs.get(p.name).delete(p.s); // sync meldet sich nach einer Pause neu an
          p.s.error({ code: e.code || 'unavailable' });
        }
      }
    }, 0);
  }

  async function poll() {
    if (polling || !subs.size) return;
    if (!readSession()) {
      foreign();
      return;
    }
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    polling = true;
    try {
      const r = await authed('/rest/v1/docs?select=name,updated_at');
      if (r.ok && Array.isArray(r.data)) {
        const changed = r.data.filter((row) => subs.has(row.name) && seen.has(row.name) && newer(row.name, row.updated_at)).map((row) => row.name);
        if (changed.length) {
          const full = await authed('/rest/v1/docs?select=name,body,updated_at&' + inList(changed));
          if (full.ok && Array.isArray(full.data)) for (const row of full.data) if (newer(row.name, row.updated_at)) deliver(row.name, row);
        }
        // Der Server ist erreichbar: liegengebliebene Änderungen jetzt hochladen
        if (TT.sync && typeof TT.sync.flush === 'function') TT.sync.flush();
      }
    } catch (e) {
      /* offline: beim nächsten Mal wieder */
    }
    polling = false;
  }

  function startPolling() {
    if (pollTimer || typeof setInterval !== 'function') return;
    pollTimer = setInterval(poll, POLL_MS);
    if (pollTimer && typeof pollTimer.unref === 'function') pollTimer.unref();
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') poll(); });
    if (typeof window !== 'undefined') window.addEventListener('online', poll);
  }

  function doc(path) {
    const name = String(path).split('/').pop();
    return {
      onSnapshot(next, error) {
        if (!subs.has(name)) subs.set(name, new Set());
        const s = { next, error: error || (() => {}), loaded: false };
        subs.get(name).add(s);
        scheduleLoad();
        return () => subs.get(name).delete(s);
      },
      async set(body) {
        if (!seen.has(name)) throw err('unavailable');
        const base = seen.get(name);
        const r = base === ''
          ? await authed('/rest/v1/docs?select=name,updated_at', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { name, body }, keepalive: true })
          : await authed('/rest/v1/docs?select=name,updated_at&name=eq.' + encodeURIComponent(name) + '&updated_at=eq.' + encodeURIComponent(base),
            { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { body }, keepalive: true });
        if (r.ok && Array.isArray(r.data) && r.data.length === 1) {
          // Nur wenn inzwischen kein neuerer Stand angekommen ist (sonst gilt der)
          if (seen.get(name) === base) seen.set(name, r.data[0].updated_at);
          return;
        }
        if ((r.ok && Array.isArray(r.data) && r.data.length === 0) || r.status === 409) {
          // Ein anderes Gerät war schneller: dessen Stand nachliefern (nach dieser Ablehnung), sync führt zusammen
          setTimeout(async () => {
            try {
              const cur = await authed('/rest/v1/docs?select=name,body,updated_at&' + inList([name]));
              if (cur.ok && Array.isArray(cur.data)) deliver(name, cur.data[0] || null);
            } catch (e) {
              /* offline: die Abfrage holt es nach */
            }
          }, 0);
          throw err('unavailable', 'Neuerer Stand auf dem Server.');
        }
        if (r.ok) throw err('unavailable'); // unerwartete Antwort
        throw err(r.status === 401 || r.status === 403 ? 'permission_denied' : 'invalid_argument');
      },
    };
  }

  // Anmeldung oder Abmeldung in einem anderen Tab: diese Seite gehört dann nicht mehr zur gespeicherten Sitzung
  if (enabled && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', (e) => {
      if (e.key !== SESSION_KEY && e.key !== null) return;
      if (bootUid) foreign();
      else if (storedSession()) notifySignedOut('changed'); // Anmeldeseite: nebenan hat sich jemand angemeldet
    });
  }

  // Schlüssel-Vorsatz für den Zwischenspeicher dieses Kontos (leer in der Datei-Version und im claude.ai-Link)
  TT.storageNs = bootUid ? 'u.' + bootUid + '.' : '';

  TT.cloud = {
    enabled,
    session: readSession,
    user: () => { const s = readSession(); return s ? s.user : null; },
    login,
    logout,
    changePassword,
    accounts,
    status: () => accounts('status', null, true),
    bootstrap: (username, password) => accounts('bootstrap', { username: cleanName(username), password }, true),
    onSignedOut(fn) {
      signedOutListeners.add(fn);
      return () => signedOutListeners.delete(fn);
    },
    // wie claude.use(name): 'db' und 'user' für js/learn/sync.js
    async use(name) {
      const s = readSession();
      if (!enabled || !s) return null;
      if (name === 'db') return { doc };
      if (name === 'user') return { id: async () => s.user.id };
      return null;
    },
    _test: { doc, poll, seen, subs, readSession, writeSession, bind: (uid) => { bootUid = uid; signedOutSent = false; } },
  };
})(globalThis.TT = globalThis.TT || {});
