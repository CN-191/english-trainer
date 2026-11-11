# English Trainer

Lern-App für Englisch: 12 Zeitformen, Grammatik-Themen (typische Fehler für Deutsche), Unterrichtsthemen und Vokabel-Karteikarten (Oxford 3000, FSRS).

- Reines HTML, CSS und JavaScript, kein Build-Schritt. `index.html` öffnen genügt.
- Web-Version: Anmeldung mit Nutzername und Passwort, der Lernstand liegt je Konto in Supabase (`js/cloud/`, `supabase/`).
- Tests: `node tests/run-tests.js`

## Betrieb der Web-Version

- Seite: GitHub Pages aus dem Zweig `main`. Ein `git push` veröffentlicht.
- Supabase (kostenloser Tarif): Tabellen und Rechte in `supabase/migrations/`, Kontoverwaltung in `supabase/functions/accounts/`.
- Das erste Konto legt sich auf der Anmeldeseite selbst an und ist Verwalter. Weitere Konten vergibt der Verwalter unter Einstellungen → Konten verwalten.
- Im kostenlosen Tarif pausiert Supabase ein Projekt nach etwa einer Woche ohne Zugriffe. Dann ist keine Anmeldung möglich, bis das Projekt im Supabase-Dashboard wieder gestartet wird („Restore project“). Der Lernstand bleibt dabei erhalten.
