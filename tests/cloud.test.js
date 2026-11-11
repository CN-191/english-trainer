// Web-Version: Anmeldung und Dokumentspeicher (js/cloud/supa.js) gegen ein nachgestelltes fetch.
// Das Modul wird hier mit einer Test-Konfiguration frisch geladen; für die übrigen Tests bleibt TT.cloud wie zuvor.
const cloudPath = require('path').join(__dirname, '..', 'js', 'cloud', 'supa.js');
const realFetch = globalThis.fetch;
const prevCloud = TT.cloud;
const prevNs = TT.storageNs;
const calls = [];
let handler = () => ({ status: 500, body: null });
globalThis.fetch = async (url, o) => {
  const call = { url: String(url).replace('https://demo.test', ''), method: (o && o.method) || 'GET', headers: (o && o.headers) || {}, body: o && o.body ? JSON.parse(o.body) : undefined };
  calls.push(call);
  const r = handler(call);
  if (r === 'offline') throw new Error('network');
  return { status: r.status, text: async () => (r.body === null || r.body === undefined ? '' : JSON.stringify(r.body)) };
};
TT.CLOUD = { url: 'https://demo.test', key: 'pk', emailDomain: 'x.invalid' };
delete require.cache[cloudPath];
require(cloudPath);
const CL = TT.cloud;
TT.cloud = prevCloud;
TT.storageNs = prevNs;
TT.CLOUD = undefined;
// fetch bleibt nachgestellt: kein anderer Test braucht das Netz

const wait = (ms) => new Promise((r) => setTimeout(r, ms || 5));
const tokens = (n) => ({ access_token: 'at' + n, refresh_token: 'rt' + n, expires_in: 3600, user: { id: 'uid-1' } });
const reset = () => { calls.length = 0; CL._test.writeSession(null); CL._test.seen.clear(); CL._test.subs.clear(); };
const signIn = () => CL._test.writeSession({ access_token: 'at1', refresh_token: 'rt1', expires_at: Date.now() + 3600000, user: { id: 'uid-1', username: 'anna', admin: false } });

test('Cloud: eingeschaltet nur mit Konfiguration; Anmeldung speichert Sitzung und Profil', async () => {
  assert.strictEqual(CL.enabled, true);
  assert.ok(!prevCloud || prevCloud.enabled === false, 'ohne Konfiguration bleibt die Web-Anmeldung aus');
  reset();
  handler = (c) => {
    if (c.url.startsWith('/auth/v1/token?grant_type=password')) return c.body.password === 'geheim12' ? { status: 200, body: tokens(1) } : { status: 400, body: { error_code: 'invalid_credentials' } };
    if (c.url.startsWith('/rest/v1/profiles')) return { status: 200, body: [{ username: 'anna', is_admin: true }] };
    return { status: 404, body: null };
  };
  await assert.rejects(() => CL.login('Anna', 'falsch'), (e) => e.code === 'invalid_credentials');
  assert.strictEqual(CL.session(), null);
  const user = await CL.login('  Anna ', 'geheim12');
  assert.deepStrictEqual(user, { id: 'uid-1', username: 'anna', admin: true });
  assert.strictEqual(calls[1].body.email, 'anna@x.invalid');
  assert.strictEqual(calls[1].headers.apikey, 'pk');
  assert.strictEqual(CL.session().refresh_token, 'rt1');
  assert.strictEqual(await (await CL.use('user')).id(), 'uid-1');
});

test('Cloud: Dokumente laden in einer Anfrage, fehlendes Dokument, erstes Schreiben legt an', async () => {
  reset();
  signIn();
  handler = (c) => {
    if (c.method === 'GET' && c.url.startsWith('/rest/v1/docs?select=name,body,updated_at')) return { status: 200, body: [{ name: 'progress', body: { v: 1, json: '{}' }, updated_at: 't1' }] };
    if (c.method === 'POST' && c.url.startsWith('/rest/v1/docs')) return { status: 201, body: [{ name: c.body.name, updated_at: 't9' }] };
    return { status: 404, body: null };
  };
  const db = await CL.use('db');
  const got = {};
  db.doc('data/users/uid-1/progress').onSnapshot((s) => { got.progress = s; });
  db.doc('data/users/uid-1/vocab-meta').onSnapshot((s) => { got.meta = s; });
  await wait();
  assert.strictEqual(calls.filter((c) => c.method === 'GET').length, 1);
  assert.ok(calls[0].url.includes('name=in.(progress,vocab-meta)'));
  assert.strictEqual(calls[0].headers.Authorization, 'Bearer at1');
  assert.ok(got.progress.exists && got.progress.data().json === '{}' && got.progress.metadata.fromCache === false);
  assert.strictEqual(got.meta.exists, false);
  await db.doc('data/users/uid-1/vocab-meta').set({ v: 1, json: '[]' });
  const post = calls[calls.length - 1];
  assert.strictEqual(post.method, 'POST');
  assert.deepStrictEqual(post.body, { name: 'vocab-meta', body: { v: 1, json: '[]' } });
  assert.strictEqual(CL._test.seen.get('vocab-meta'), 't9');
});

test('Cloud: Schreiben nur auf den gesehenen Stand; ist ein anderes Gerät schneller, kommt dessen Stand nach', async () => {
  reset();
  signIn();
  let server = { name: 'progress', body: { v: 1, json: 'A' }, updated_at: '2026-01-01T10:00:00+00:00' };
  handler = (c) => {
    if (c.method === 'GET') return { status: 200, body: [server] };
    if (c.method === 'PATCH') {
      const want = decodeURIComponent(c.url.split('updated_at=eq.')[1]);
      if (want !== server.updated_at) return { status: 200, body: [] };
      server = { name: 'progress', body: c.body.body, updated_at: server.updated_at + 'x' };
      return { status: 200, body: [{ name: 'progress', updated_at: server.updated_at }] };
    }
    return { status: 404, body: null };
  };
  const ref = (await CL.use('db')).doc('data/users/uid-1/progress');
  const snaps = [];
  ref.onSnapshot((s) => snaps.push(s.data().json));
  await wait();
  await ref.set({ v: 1, json: 'B' });
  assert.strictEqual(server.body.json, 'B');
  assert.ok(calls[calls.length - 1].url.includes('updated_at=eq.2026-01-01T10%3A00%3A00%2B00%3A00'));
  // anderes Gerät schreibt dazwischen
  server = { name: 'progress', body: { v: 1, json: 'C' }, updated_at: 'other' };
  await assert.rejects(() => ref.set({ v: 1, json: 'D' }), (e) => e.code === 'unavailable');
  assert.strictEqual(server.body.json, 'C', 'nichts überschrieben');
  await wait(15);
  assert.deepStrictEqual(snaps, ['A', 'C']);
  await ref.set({ v: 1, json: 'CD' });
  assert.strictEqual(server.body.json, 'CD');
});

test('Cloud: Abfrage liefert nur geänderte Dokumente; Netzfehler heißt unavailable', async () => {
  reset();
  signIn();
  let rows = [{ name: 'progress', body: { json: '1' }, updated_at: 'a' }, { name: 'vocab-meta', body: { json: 'm' }, updated_at: 'm1' }];
  handler = (c) => {
    if (c.method !== 'GET') return { status: 404, body: null };
    if (c.url.includes('select=name,updated_at')) return { status: 200, body: rows.map((r) => ({ name: r.name, updated_at: r.updated_at })) };
    const names = c.url.split('name=in.(')[1].split(')')[0].split(',');
    return { status: 200, body: rows.filter((r) => names.includes(r.name)) };
  };
  const db = await CL.use('db');
  const got = [];
  db.doc('x/progress').onSnapshot((s) => got.push('p' + s.data().json));
  db.doc('x/vocab-meta').onSnapshot((s) => got.push('m' + s.data().json));
  await wait();
  await CL._test.poll();
  assert.deepStrictEqual(got, ['p1', 'mm']);
  rows = [{ name: 'progress', body: { json: '2' }, updated_at: 'b' }, rows[1]];
  await CL._test.poll();
  assert.deepStrictEqual(got, ['p1', 'mm', 'p2']);
  handler = () => 'offline';
  await CL._test.poll(); // schluckt den Fehler
  await assert.rejects(() => db.doc('x/progress').set({ v: 1 }), (e) => e.code === 'unavailable');
  // Laden ohne Netz meldet den Fehler an sync (das sich später neu anmeldet)
  let errCode = null;
  db.doc('x/vocab-A1-ed').onSnapshot(() => {}, (e) => { errCode = e.code; });
  await wait();
  assert.strictEqual(errCode, 'unavailable');
  assert.strictEqual(CL._test.subs.get('vocab-A1-ed').size, 0);
});

test('Cloud: abgelaufenes Token wird einmal erneuert; ungültige Sitzung meldet ab', async () => {
  reset();
  CL._test.writeSession({ access_token: 'old', refresh_token: 'rt1', expires_at: Date.now() - 1000, user: { id: 'uid-1', username: 'anna', admin: false } });
  let refreshes = 0;
  handler = (c) => {
    if (c.url.startsWith('/auth/v1/token?grant_type=refresh_token')) {
      refreshes++;
      return c.body.refresh_token === 'rt1' ? { status: 200, body: tokens(2) } : { status: 400, body: { error_code: 'refresh_token_not_found' } };
    }
    if (c.url.startsWith('/functions/v1/accounts')) return c.headers.Authorization === 'Bearer at2' ? { status: 200, body: { users: [] } } : { status: 401, body: { error: 'x' } };
    return { status: 404, body: null };
  };
  const [a, b] = await Promise.all([CL.accounts('list'), CL.accounts('list')]);
  assert.deepStrictEqual([a, b], [{ users: [] }, { users: [] }]);
  assert.strictEqual(refreshes, 1, 'gleichzeitige Anfragen teilen sich eine Erneuerung');
  assert.strictEqual(CL.session().access_token, 'at2');
  assert.strictEqual(CL.session().user.username, 'anna');
  // Sitzung auf dem Server ungültig
  let out = 0;
  const off = CL.onSignedOut(() => { out++; });
  CL._test.writeSession(Object.assign({}, CL.session(), { expires_at: 0, refresh_token: 'kaputt' }));
  await assert.rejects(() => CL.accounts('list'), (e) => e.code === 'unauthenticated');
  assert.strictEqual(CL.session(), null);
  assert.strictEqual(out, 1);
  off();
});

test('Cloud: Konten-Funktion gibt die Fehlermeldung des Servers weiter', async () => {
  reset();
  signIn();
  handler = (c) => (c.body.action === 'create' ? { status: 409, body: { error: 'Diesen Nutzernamen gibt es schon.' } } : { status: 200, body: { hasUsers: true } });
  await assert.rejects(() => CL.accounts('create', { username: 'bob', password: 'abcdefgh' }), (e) => e.message === 'Diesen Nutzernamen gibt es schon.');
  assert.deepStrictEqual(await CL.status(), { hasUsers: true });
  assert.strictEqual(calls[calls.length - 1].headers.Authorization, undefined, 'status ohne Anmeldung');
});

test('Cloud: Seite ist an ihr Konto gebunden – fremde Sitzung wird nicht benutzt und nicht gelöscht', async () => {
  reset();
  signIn();
  CL._test.bind('uid-1');
  handler = () => ({ status: 200, body: [] });
  let reason = null;
  const off = CL.onSignedOut((r) => { reason = r; });
  assert.strictEqual(CL.session().user.id, 'uid-1');
  // in einem anderen Tab meldet sich ein anderes Konto an
  CL._test.writeSession({ access_token: 'atB', refresh_token: 'rtB', expires_at: Date.now() + 3600000, user: { id: 'uid-2', username: 'ben', admin: false } });
  calls.length = 0;
  assert.strictEqual(CL.session(), null);
  assert.strictEqual(await CL.use('db'), null);
  await assert.rejects(() => CL.accounts('list'), (e) => e.code === 'unauthenticated');
  CL._test.subs.set('progress', new Set([{ next: () => { throw new Error('darf nicht liefern'); }, error: () => {}, loaded: true }]));
  await CL._test.poll();
  assert.strictEqual(calls.length, 0, 'keine Anfrage mit der fremden Sitzung');
  assert.strictEqual(reason, 'changed');
  // die Sitzung des anderen Kontos bleibt unangetastet
  CL._test.bind(null);
  assert.strictEqual(CL.session().user.id, 'uid-2');
  off();
});

test('Cloud: ein überholter Stand aus der Abfrage ersetzt den neueren nicht; Konten-401 meldet nicht ab', async () => {
  reset();
  signIn();
  CL._test.bind(null);
  let listAt = '2026-01-01T10:00:00.5+00:00';
  handler = (c) => {
    if (c.url.startsWith('/functions/v1/accounts')) return { status: 401, body: { error: 'Bitte neu anmelden.' } };
    if (c.url.startsWith('/auth/v1/token')) return { status: 200, body: tokens(3) };
    if (c.url.includes('select=name,updated_at')) return { status: 200, body: [{ name: 'progress', updated_at: listAt }] };
    return { status: 200, body: [{ name: 'progress', body: { json: 'alt' }, updated_at: listAt }] };
  };
  const got = [];
  CL._test.subs.set('progress', new Set([{ next: (s) => got.push(s.data().json), error: () => {}, loaded: true }]));
  CL._test.seen.set('progress', '2026-01-01T10:00:01.219182+00:00'); // eigener, neuerer Schreibvorgang
  await CL._test.poll();
  assert.deepStrictEqual(got, []);
  listAt = '2026-01-01T10:00:02+00:00';
  await CL._test.poll();
  assert.deepStrictEqual(got, ['alt']);
  // Edge Function antwortet 401: Fehler, aber die Sitzung bleibt
  let out = 0;
  const off = CL.onSignedOut(() => { out++; });
  await assert.rejects(() => CL.accounts('list'), (e) => e.code === 'unauthenticated');
  assert.ok(CL.session(), 'Sitzung bleibt bestehen');
  assert.strictEqual(out, 0);
  off();
});

test('Cloud: Aufräumen', () => {
  reset();
  globalThis.fetch = realFetch;
});
