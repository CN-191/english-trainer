(function (TT) {
  'use strict';

  // Web-Version (GitHub Pages): Konten und Lernstand liegen in Supabase.
  // URL und Schlüssel sind öffentlich gedacht (publishable key); den Zugriff regeln die Rechte in der
  // Datenbank: Jeder angemeldete Nutzer liest und schreibt nur seine eigenen Zeilen.
  // Diese Datei wird nur in der Web-Version geladen (im claude.ai-Link fehlt sie, siehe tools/build-artifact.js).
  TT.CLOUD = {
    url: 'https://rjrkmpbtxczseyllqamv.supabase.co',
    key: 'sb_publishable_GuAMRxUIvKJN4GKd8UKw_w_PVGaSIrz',
    emailDomain: 'english-trainer.invalid', // Nutzername → interne Adresse, es wird nie eine E-Mail verschickt
  };
})(globalThis.TT = globalThis.TT || {});
