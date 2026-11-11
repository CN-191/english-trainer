// Edge Function „accounts“: Konten mit Nutzername + Passwort für den English Trainer.
// Das erste Konto legt sich selbst an und wird Verwalter; danach legt nur ein Verwalter Konten an.
// Aufruf: POST { action, … } – status | bootstrap | create | list | reset | delete
// verify_jwt ist aus: „status“ und „bootstrap“ kommen ohne Anmeldung, alles andere prüft das Nutzer-Token selbst.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const EMAIL_DOMAIN = "english-trainer.invalid"; // Nutzername → interne Adresse; es wird nie eine E-Mail verschickt
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (status: number, error: string) => json(status, { error });

const USERNAME = /^[a-z0-9][a-z0-9._-]{2,19}$/;
const cleanName = (v: unknown) => String(v ?? "").trim().toLowerCase();
const emailOf = (username: string) => `${username}@${EMAIL_DOMAIN}`;

function checkInput(username: string, password: unknown): string | null {
  if (!USERNAME.test(username)) return "Nutzername: 3 bis 20 Zeichen, nur Kleinbuchstaben, Ziffern, Punkt, Bindestrich, Unterstrich.";
  if (typeof password !== "string" || password.length < 8 || password.length > 72) return "Passwort: mindestens 8 Zeichen (höchstens 72).";
  return null;
}

// Wer ruft an? 401 nur bei ungültigem Token (der Client meldet sich dann neu an); ein gültiges Konto ohne Profil
// oder ohne Verwalter-Recht bekommt 403, eine Störung 503.
async function caller(req: Request): Promise<{ status: number; profile?: { user_id: string; username: string; is_admin: boolean } }> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { status: 401 };
  const { data, error } = await admin.auth.getUser(token);
  if (error) return { status: error.status && error.status >= 500 ? 503 : 401 };
  if (!data.user) return { status: 401 };
  const { data: profile, error: pErr } = await admin.from("profiles").select("user_id, username, is_admin").eq("user_id", data.user.id).maybeSingle();
  if (pErr) return { status: 503 };
  if (!profile) return { status: 403 };
  return { status: 200, profile };
}

// Ein Auth-Konto ohne Profil unter dieser Adresse (z. B. über die offene Registrierung angelegt) blockiert den
// Nutzernamen: entfernen, damit der Verwalter das Konto anlegen kann. Konten mit Profil werden nie angefasst.
async function removeOrphan(email: string): Promise<boolean> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) return false;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) {
      const { data: profile } = await admin.from("profiles").select("user_id").eq("user_id", hit.id).maybeSingle();
      if (profile) return false;
      const { error: dErr } = await admin.auth.admin.deleteUser(hit.id);
      return !dErr;
    }
    if (data.users.length < 200) return false;
  }
  return false;
}

async function createAccount(username: string, password: string, isAdmin: boolean) {
  const { data: taken } = await admin.from("profiles").select("user_id").eq("username", username).maybeSingle();
  if (taken) return { error: "Diesen Nutzernamen gibt es schon.", status: 409 };
  const make = () => admin.auth.admin.createUser({ email: emailOf(username), password, email_confirm: true, user_metadata: { username } });
  let { data, error } = await make();
  if (error && /already|registered|exists/i.test(error.message) && await removeOrphan(emailOf(username))) ({ data, error } = await make());
  if (error || !data.user) return { error: "Konto konnte nicht angelegt werden: " + (error?.message ?? "unbekannter Fehler"), status: 400 };
  const { error: pErr } = await admin.from("profiles").insert({ user_id: data.user.id, username, is_admin: isAdmin });
  if (pErr) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "Konto konnte nicht angelegt werden: " + pErr.message, status: 400 };
  }
  return { user: { username, is_admin: isAdmin } };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail(405, "Nur POST.");
  if (!key) return fail(500, "Server ist nicht eingerichtet.");
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_e) {
    return fail(400, "Ungültige Anfrage.");
  }
  const action = String(body.action ?? "");

  try {
    if (action === "status") {
      const { count, error } = await admin.from("profiles").select("user_id", { count: "exact", head: true });
      if (error) return fail(500, "Datenbank nicht erreichbar.");
      return json(200, { hasUsers: (count ?? 0) > 0 });
    }

    if (action === "bootstrap") {
      const username = cleanName(body.username);
      const bad = checkInput(username, body.password);
      if (bad) return fail(400, bad);
      const { count } = await admin.from("profiles").select("user_id", { count: "exact", head: true });
      if ((count ?? 0) > 0) return fail(409, "Es gibt schon ein Konto. Bitte melde dich an.");
      // Merker mit Primärschlüssel: von zwei gleichzeitigen Versuchen gewinnt genau einer.
      let { error: lockErr } = await admin.from("app_meta").insert({ key: "bootstrap", value: { username } });
      if (lockErr) {
        // Merker ohne Konto (ein früherer Versuch ist mittendrin abgebrochen): nach 2 Minuten freigeben
        const old = new Date(Date.now() - 120000).toISOString();
        const { data: stale } = await admin.from("app_meta").delete().eq("key", "bootstrap").lt("created_at", old).select("key");
        if (stale && stale.length) ({ error: lockErr } = await admin.from("app_meta").insert({ key: "bootstrap", value: { username } }));
      }
      if (lockErr) return fail(409, "Es gibt schon ein Konto. Bitte melde dich an.");
      const r = await createAccount(username, body.password as string, true);
      if (r.error) {
        await admin.from("app_meta").delete().eq("key", "bootstrap");
        return fail(r.status ?? 400, r.error);
      }
      return json(200, r);
    }

    const who = await caller(req);
    if (who.status === 401) return fail(401, "Bitte neu anmelden.");
    if (who.status === 503) return fail(503, "Server gerade nicht erreichbar.");
    const me = who.profile;
    if (!me || !me.is_admin) return fail(403, "Nur der Verwalter darf Konten verwalten.");

    if (action === "list") {
      const { data, error } = await admin.from("profiles").select("username, is_admin, created_at").order("created_at");
      if (error) return fail(500, "Datenbank nicht erreichbar.");
      return json(200, { users: data });
    }

    if (action === "create") {
      const username = cleanName(body.username);
      const bad = checkInput(username, body.password);
      if (bad) return fail(400, bad);
      const r = await createAccount(username, body.password as string, false);
      if (r.error) return fail(r.status ?? 400, r.error);
      return json(200, r);
    }

    if (action === "reset" || action === "delete") {
      const username = cleanName(body.username);
      const { data: target } = await admin.from("profiles").select("user_id, username").eq("username", username).maybeSingle();
      if (!target) return fail(404, "Dieses Konto gibt es nicht.");
      if (action === "reset") {
        const bad = checkInput(username, body.password);
        if (bad) return fail(400, bad);
        const { error } = await admin.auth.admin.updateUserById(target.user_id, { password: body.password as string });
        if (error) return fail(400, "Passwort konnte nicht gesetzt werden: " + error.message);
        return json(200, { ok: true });
      }
      if (target.user_id === me.user_id) return fail(400, "Das eigene Konto lässt sich hier nicht löschen.");
      const { error } = await admin.auth.admin.deleteUser(target.user_id);
      if (error) return fail(400, "Konto konnte nicht gelöscht werden: " + error.message);
      return json(200, { ok: true });
    }

    return fail(400, "Unbekannte Aktion.");
  } catch (_e) {
    return fail(500, "Unerwarteter Fehler.");
  }
});
