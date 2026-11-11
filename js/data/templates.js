(function (TT) {
  'use strict';

  const T = (id, tense, pattern, why, extra) => Object.assign({ id, tense, pattern, why }, extra || {});
  const S = (text, person, number) => ({ text, person, number });
  const ACT = ['activity'];
  const EV = ['event'];
  const STATE = ['state'];
  const AFF = ['aff'];
  const Q = ['q'];
  const AFF_Q = ['aff', 'q'];
  const AFF_NEG = ['aff', 'neg'];
  const NEG_Q = ['neg', 'q'];
  const I = S('I', 1, 'sg');
  const YOU = S('you', 2, 'sg');
  const IT = S('it', 3, 'sg');
  const THEY = S('they', 3, 'pl');

  TT.TEMPLATES = [
    // ── Simple Present ──
    T('ps-every', 'present-simple', '{CLAUSE} *{EVERY}*{.}', 'Regelmäßige Handlung (every …, on Mondays) → Simple Present.', { verbTypes: ACT }),
    T('ps-every-front', 'present-simple', '*{EVERY}*, {CLAUSE}{.}', 'Gewohnheit, Routine → Simple Present.', { verbTypes: ACT, forms: AFF }),
    T('ps-freq', 'present-simple', '{CLAUSE}{.}', 'Häufigkeitsadverb (always, usually, often, sometimes) → Simple Present.', { verbTypes: ACT, mid: ['always', 'usually', 'often', 'sometimes'], forms: AFF_Q }),
    T('ps-never', 'present-simple', '{CLAUSE} *on Sundays*{.}', '„never“ + regelmäßiger Zeitpunkt (on Sundays) → Gewohnheit → Simple Present.', { verbTypes: ACT, mid: ['never'], forms: AFF }),
    T('ps-weekdays', 'present-simple', '{CLAUSE} *on weekdays*{.}', 'Regelmäßigkeit (on weekdays) → Simple Present.', { verbTypes: ACT, forms: NEG_Q }),
    T('ps-how-often', 'present-simple', '*How often* {CLAUSE}{.}', 'Frage nach der Häufigkeit (How often …?) → Simple Present.', { verbTypes: ACT, forms: Q }),
    T('ps-after-work', 'present-simple', '{CLAUSE} *after work*{.}', 'Routine mit usually/often → Simple Present.', { verbTypes: ACT, mid: ['usually', 'often'], forms: AFF_Q }),
    T('ps-evenings', 'present-simple', '*In the evenings*, {CLAUSE}{.}', 'Wiederkehrende Zeit (in the evenings) → Simple Present.', { verbTypes: ACT, forms: AFF_NEG }),
    T('ps-state-now', 'present-simple', '{CLAUSE} *now*{.}', 'Zustandsverb → Simple Present, auch bei „now“ (kein -ing).', { verbTypes: STATE, noProgressiveOk: true }),
    T('ps-state-days', 'present-simple', '*These days*, {CLAUSE}{.}', 'Zustand in der Gegenwart mit Zustandsverb → Simple Present.', { verbTypes: STATE, noProgressiveOk: true, forms: AFF_NEG }),
    T('ps-fact-water', 'present-simple', '{CLAUSE} *at 100 degrees Celsius*{.}', 'Allgemeine Tatsache → Simple Present.', { fixed: { subject: S('water', 3, 'sg'), verb: 'boil', object: '' }, forms: AFF_Q }),
    T('ps-fact-sun', 'present-simple', '{CLAUSE} *every morning*{.}', 'Naturgesetz, immer gültig → Simple Present.', { fixed: { subject: S('the sun', 3, 'sg'), verb: 'rise', object: 'in the east' }, forms: AFF_Q }),
    T('ps-timetable', 'present-simple', '{CLAUSE} *at 6.15 every morning*{.}', 'Fahrplan / feste Regelmäßigkeit → Simple Present.', { fixed: { subject: S('the first train', 3, 'sg'), verb: 'leave', object: '' } }),

    // ── Present Progressive ──
    T('prog-look', 'present-progressive', '*{LOOK}* {CLAUSE}{.}', 'Look! → passiert genau jetzt → Present Progressive.', { verbTypes: ACT, forms: AFF_Q }),
    T('prog-now', 'present-progressive', '{CLAUSE} *{NOW}*{.}', 'right now / at the moment → läuft gerade → Present Progressive.', { verbTypes: ACT }),
    T('prog-now-front', 'present-progressive', '*Right now*, {CLAUSE}{.}', 'Right now → läuft gerade → Present Progressive.', { verbTypes: ACT, forms: AFF_NEG }),
    T('prog-period', 'present-progressive', '{CLAUSE} *{PERIOD}*{.}', 'Vorübergehend (this week, this month) → Present Progressive. Present Progressive betont das Vorübergehende; Simple Present ist hier auch korrekt.', { fixed: { verb: 'work' }, alsoAccept: ['present-simple'] }),
    T('prog-cant-talk', 'present-progressive', '*I can’t talk now –* {CLAUSE}{.}', 'Handlung läuft im Moment des Sprechens → Present Progressive.', { fixed: { subject: I, verb: 'drive' }, forms: AFF }),
    T('prog-why', 'present-progressive', '*Why* {CLAUSE} *at the moment*{.}', 'at the moment → Present Progressive.', { verbTypes: ACT, fixed: { subject: YOU }, forms: Q }),
    T('prog-currently', 'present-progressive', '{CLAUSE}{.}', 'currently → läuft gerade (vorübergehend) → Present Progressive. Simple Present ist hier auch korrekt.', { fixed: { verb: 'stay' }, mid: ['currently'], forms: AFF, alsoAccept: ['present-simple'] }),
    T('prog-still', 'present-progressive', '*It’s getting late, but* {CLAUSE}{.}', 'still: läuft jetzt immer noch → Present Progressive.', { verbTypes: ACT, mid: ['still'], forms: AFF }),
    T('prog-hear', 'present-progressive', '*{LISTEN}* {CLAUSE}{.}', 'Listen! / Can you hear that? → man hört es gerade → Present Progressive.', { fixed: { verb: 'sing' }, forms: AFF }),
    T('prog-window', 'present-progressive', '*Look out of the window!* {CLAUSE}{.}', 'Man sieht es gerade → Present Progressive.', { fixed: { subject: S('our neighbours', 3, 'pl'), verb: 'walk' }, forms: AFF }),
    T('prog-call-back', 'present-progressive', '*Can you call back later?* {CLAUSE} *right now*{.}', 'right now → Present Progressive.', { verbTypes: ACT, forms: AFF }),

    // ── Present Perfect ──
    T('pf-just', 'present-perfect', '{CLAUSE}{.}', 'just/already, Ergebnis zählt jetzt → Present Perfect.', { verbTypes: EV, mid: ['just', 'already'], forms: AFF_Q }),
    T('pf-yet', 'present-perfect', '{CLAUSE} *yet*{.}', 'yet (Frage/Verneinung) → Present Perfect.', { verbTypes: EV, forms: NEG_Q }),
    T('pf-since', 'present-perfect', '{CLAUSE} *since {SINCE_LONG}*{.}', 'Zustandsverb + since → Zustand dauert bis jetzt → Present Perfect. Bei Verben wie support/trust ist auch das Present Perfect Progressive korrekt.', { verbTypes: STATE, forms: AFF_Q , alsoAccept: ['present-perfect-progressive'] }),
    T('pf-for', 'present-perfect', '{CLAUSE} *for {FOR_LONG}*{.}', 'Zustandsverb + for → Zustand dauert bis jetzt → Present Perfect. Bei Verben wie support/trust ist auch das Present Perfect Progressive korrekt.', { verbTypes: STATE, forms: AFF_Q , alsoAccept: ['present-perfect-progressive'] }),
    T('pf-ever', 'present-perfect', '{CLAUSE}{.}', 'ever → Erfahrung bis jetzt → Present Perfect.', { fixed: { verb: 'see' }, mid: ['ever'], forms: Q }),
    T('pf-never', 'present-perfect', '{CLAUSE} *before*{.}', 'never … before → Erfahrung bis jetzt → Present Perfect.', { fixed: { verb: 'try' }, mid: ['never'], forms: AFF }),
    T('pf-times', 'present-perfect', '{CLAUSE} *{TIMES} this year*{.}', 'Wie oft bis jetzt (this year läuft noch) → Present Perfect.', { fixed: { verb: 'lose' }, forms: AFF_Q }),
    T('pf-so-far', 'present-perfect', '*So far*, {CLAUSE} *{TIMES}*{.}', 'so far → bis jetzt → Present Perfect.', { fixed: { verb: 'forget' }, forms: AFF }),
    T('pf-first-time', 'present-perfect', '*This is the first time* {CLAUSE}{.}', 'This is the first time … → Present Perfect.', { fixed: { verb: 'ride' }, forms: AFF }),
    T('pf-oh-no', 'present-perfect', '*Oh no!* {CLAUSE}{.}', 'Gerade passiert, Ergebnis jetzt sichtbar (just) → Present Perfect.', { fixed: { verb: 'break' }, mid: ['just'], forms: AFF }),
    T('pf-this-week', 'present-perfect', '{CLAUSE} *so far this week*{.}', 'so far this week → Zeitraum bis jetzt → Present Perfect.', { fixed: { verb: 'miss' }, forms: NEG_Q }),
    T('pf-how-long', 'present-perfect', '*How long* {CLAUSE}{.}', 'How long + Zustandsverb → Present Perfect. Bei Verben wie support/trust ist auch das Present Perfect Progressive korrekt.', { verbTypes: STATE, fixed: { subject: YOU }, forms: Q , alsoAccept: ['present-perfect-progressive'] }),

    // ── Present Perfect Progressive ──
    T('pfp-for', 'present-perfect-progressive', '{CLAUSE} *for {FOR_SHORT}*{.}', 'for + Dauer, Tätigkeit läuft bis jetzt → Present Perfect Progressive.', { verbTypes: ACT, forms: AFF_Q }),
    T('pfp-since', 'present-perfect-progressive', '{CLAUSE} *since {SINCE_SHORT}*{.}', 'since + Zeitpunkt, Tätigkeit läuft bis jetzt → Present Perfect Progressive.', { verbTypes: ACT, forms: AFF_Q }),
    T('pfp-how-long', 'present-perfect-progressive', '*How long* {CLAUSE}{.}', 'How long + Tätigkeit → Present Perfect Progressive.', { verbTypes: ACT, fixed: { subject: YOU }, forms: Q }),
    T('pfp-tired', 'present-perfect-progressive', '*You look tired.* {CLAUSE} *all day*{.}', 'Sichtbare Folge einer längeren Tätigkeit → Present Perfect Progressive.', { fixed: { subject: YOU, verb: 'work' }, forms: Q }),
    T('pfp-all-day', 'present-perfect-progressive', '*It’s 6 pm now, and* {CLAUSE} *all day*{.}', 'all day bis jetzt (now) → Dauer betont → Present Perfect Progressive.', { verbTypes: ACT, forms: AFF }),
    T('pfp-for-now', 'present-perfect-progressive', '{CLAUSE} *for {FOR_SHORT} now*{.}', 'for … now → läuft seit … bis jetzt → Present Perfect Progressive.', { verbTypes: ACT, forms: AFF }),
    T('pfp-lately', 'present-perfect-progressive', '{CLAUSE} *lately*{.}', 'lately → in letzter Zeit bis jetzt → Present Perfect Progressive.', { fixed: { verb: 'jog' }, forms: AFF_NEG }),
    T('pfp-late', 'present-perfect-progressive', '*Sorry I’m late!* {CLAUSE} *long*{.}', 'Wartezeit bis jetzt → Present Perfect Progressive.', { fixed: { subject: YOU, verb: 'wait', object: '' }, forms: Q }),
    T('pfp-rain', 'present-perfect-progressive', '{CLAUSE} *since {SINCE_SHORT}*{.}', 'Wetter seit … bis jetzt → Present Perfect Progressive. Present Perfect Progressive betont die Dauer; Present Perfect ist hier auch korrekt.', { fixed: { subject: IT, verb: 'rain', object: '' }, forms: AFF, alsoAccept: ['present-perfect'] }),
    T('pfp-dirty', 'present-perfect-progressive', '*Your hands are dirty.* {CLAUSE}{.}', 'Sichtbare Folge einer Tätigkeit → Present Perfect Progressive. Present Perfect Progressive betont die Tätigkeit; Present Perfect ist hier auch korrekt.', { fixed: { subject: YOU, verb: 'dig', object: 'in the garden' }, forms: Q, alsoAccept: ['present-perfect'] }),
    T('pfp-since-front', 'present-perfect-progressive', '*Since {SINCE_SHORT}*, {CLAUSE}{.}', 'Since + Zeitpunkt → Present Perfect Progressive.', { verbTypes: ACT, forms: AFF }),

    // ── Simple Past ──
    T('pst-past', 'past-simple', '{CLAUSE} *{PAST}*{.}', 'Abgeschlossener Zeitpunkt (yesterday, last …, ago) → Simple Past.'),
    T('pst-past-front', 'past-simple', '*{PAST}*, {CLAUSE}{.}', 'Zeitpunkt in der Vergangenheit genannt → Simple Past.', { forms: AFF_NEG }),
    T('pst-when-q', 'past-simple', '*When* {CLAUSE}{.}', 'Frage nach dem Zeitpunkt (When …?) → Simple Past, nicht Present Perfect.', { verbTypes: EV, forms: Q }),
    T('pst-last-year', 'past-simple', '*Last year*, {CLAUSE} *{EVERY}*{.}', 'Gewohnheit in einem abgeschlossenen Zeitraum (last year) → Simple Past.', { verbTypes: ACT, forms: AFF }),
    T('pst-and-then', 'past-simple', '*First* {CLAUSE}, *and then we had dinner*{.}', 'Abfolge von Handlungen (first … and then) → Simple Past.', { verbTypes: ACT, forms: AFF }),
    T('pst-day-before', 'past-simple', '{CLAUSE} *the day before yesterday*{.}', 'the day before yesterday → Simple Past.'),
    T('pst-what-time', 'past-simple', '*What time* {CLAUSE} *{PAST_DAY}*{.}', 'Frage nach Uhrzeit in der Vergangenheit → Simple Past.', { fixed: { verb: 'go' }, forms: Q }),
    T('pst-busy', 'past-simple', '*Yesterday was busy:* {CLAUSE} *in the morning*{.}', 'Erzählung über gestern → Simple Past.', { verbTypes: EV, forms: AFF }),
    T('pst-back-then', 'past-simple', '{CLAUSE} *back then*{.}', 'back then → abgeschlossen → Simple Past (Zustandsverb ohne -ing).', { verbTypes: STATE, noProgressiveOk: true, forms: AFF_NEG }),
    T('pst-years-ago', 'past-simple', '*{LONG_AGO}*, {CLAUSE}{.}', 'ago / in 2019 → abgeschlossene Zeit → Simple Past.', { verbTypes: STATE, noProgressiveOk: true, forms: AFF_NEG }),
    T('pst-two-hours', 'past-simple', '*Two hours ago*, {CLAUSE}{.}', 'ago → Simple Past.', { verbTypes: EV, forms: AFF }),
    T('pst-holiday', 'past-simple', '*On holiday last year*, {CLAUSE}{.}', 'last year → Simple Past.', { verbTypes: ACT, forms: AFF_NEG }),

    // ── Past Progressive ──
    T('pstp-when', 'past-progressive', '{CLAUSE} *when* {EVENT:past-simple}{.}', 'Lief gerade, als etwas dazwischenkam (when + Simple Past) → Past Progressive.', { verbTypes: ACT }),
    T('pstp-when-front', 'past-progressive', '*When* {EVENT:past-simple}, {CLAUSE}{.}', 'Hintergrundhandlung, die gerade lief → Past Progressive.', { verbTypes: ACT, forms: AFF_NEG }),
    T('pstp-at', 'past-progressive', '{CLAUSE} *{AT_PAST}*{.}', 'Bestimmter Zeitpunkt in der Vergangenheit, Handlung lief gerade → Past Progressive.', { verbTypes: ACT }),
    T('pstp-at-front', 'past-progressive', '*{AT_PAST}*, {CLAUSE}{.}', 'Zeitpunkt + Handlung lief gerade → Past Progressive.', { verbTypes: ACT, forms: AFF_NEG }),
    T('pstp-while', 'past-progressive', '*While* {ACTION:past-progressive}, {CLAUSE}{.}', 'Zwei Handlungen laufen gleichzeitig (while) → Past Progressive. Past Progressive betont den Verlauf; Simple Past ist hier auch korrekt.', { verbTypes: ACT, forms: AFF, alsoAccept: ['past-simple'] }),
    T('pstp-while-end', 'past-progressive', '{CLAUSE} *while* {ACTION:past-progressive}{.}', 'while → gleichzeitig ablaufend → Past Progressive. Past Progressive betont den Verlauf; Simple Past ist hier auch korrekt.', { verbTypes: ACT, forms: AFF, alsoAccept: ['past-simple'] }),
    T('pstp-what', 'past-progressive', '*What* {CLAUSE} *when* {EVENT:past-simple}{.}', 'What … doing when …? → Past Progressive.', { fixed: { verb: 'do', object: '' }, forms: Q }),
    T('pstp-last-year', 'past-progressive', '{CLAUSE} *at this time last year*{.}', 'at this time last year → lief damals gerade → Past Progressive.', { fixed: { verb: 'travel', object: 'around Asia' } }),
    T('pstp-sun', 'past-progressive', '*It was a lovely afternoon: the sun was shining, the birds were singing and* {CLAUSE}{.}', 'Hintergrundbeschreibung einer Szene → Past Progressive.', { verbTypes: ACT, forms: AFF }),
    T('pstp-rain', 'past-progressive', '{CLAUSE} *when we left the house*{.}', 'Wetter lief gerade, als … → Past Progressive.', { fixed: { subject: IT, verb: 'rain', object: '' } }),
    T('pstp-sorry', 'past-progressive', '*Sorry, I didn’t hear you –* {CLAUSE}{.}', 'Lief gerade in dem Moment → Past Progressive.', { verbTypes: ACT, fixed: { subject: I }, forms: AFF }),
    T('pstp-called', 'past-progressive', '*When my aunt called*, {CLAUSE}{.}', 'Handlung lief gerade, als der Anruf kam → Past Progressive.', { verbTypes: ACT, forms: AFF }),

    // ── Past Perfect ──
    T('ppf-by-the-time', 'past-perfect', '*By the time* {EVENT:past-simple}, {CLAUSE}{.}', 'Schon vorher abgeschlossen (by the time + Simple Past) → Past Perfect.', { verbTypes: EV, mid: ['already'], forms: AFF }),
    T('ppf-when-already', 'past-perfect', '*When* {EVENT:past-simple}, {CLAUSE}{.}', 'Als das passierte, war das andere schon passiert (already/just) → Past Perfect.', { verbTypes: EV, mid: ['already', 'just'], forms: AFF }),
    T('ppf-before', 'past-perfect', '{CLAUSE} *before* {EVENT:past-simple}{.}', 'Die frühere von zwei vergangenen Handlungen → Past Perfect.', { verbTypes: EV, mid: ['already'], forms: AFF }),
    T('ppf-after', 'past-perfect', '*After* {CLAUSE}, *we had a cup of tea*{.}', 'after: zuerst abgeschlossen, dann … → Past Perfect. Past Perfect betont, was zuerst passiert ist; Simple Past ist hier auch korrekt.', { verbTypes: EV, forms: AFF, alsoAccept: ['past-simple'] }),
    T('ppf-never-before', 'past-perfect', '{CLAUSE} *before that day*{.}', 'never … before that day → Erfahrung bis zu einem Punkt in der Vergangenheit → Past Perfect.', { fixed: { verb: 'see' }, mid: ['never'], forms: AFF }),
    T('ppf-by-the-time-neg', 'past-perfect', '{CLAUSE} *by the time* {EVENT:past-simple}{.}', 'by the time + Simple Past → Past Perfect. Past Perfect betont den früheren Zeitpunkt; Simple Past ist hier auch korrekt.', { verbTypes: EV, forms: NEG_Q, alsoAccept: ['past-simple'] }),
    T('ppf-surprised', 'past-perfect', '*I was surprised because* {CLAUSE}{.}', 'already: Grund liegt vor dem vergangenen Moment → Past Perfect.', { verbTypes: EV, mid: ['already'], forms: AFF }),
    T('ppf-after-end', 'past-perfect', '*We went home after* {CLAUSE}{.}', 'after + frühere Handlung → Past Perfect. Past Perfect betont, was zuerst passiert ist; Simple Past ist hier auch korrekt.', { verbTypes: EV, forms: AFF, alsoAccept: ['past-simple'] }),
    T('ppf-first-time', 'past-perfect', '*It was the first time* {CLAUSE}{.}', 'It was the first time … → Past Perfect (vgl. This is the first time → Present Perfect).', { fixed: { verb: 'visit' }, forms: AFF }),
    T('ppf-until', 'past-perfect', '*Until that day*, {CLAUSE}{.}', 'Until that day … never → Past Perfect.', { fixed: { verb: 'try' }, mid: ['never'], forms: AFF }),
    T('ppf-aunt', 'past-perfect', '*When my aunt arrived*, {CLAUSE}{.}', 'already: war schon weg, als sie ankam → Past Perfect.', { fixed: { verb: 'leave' }, mid: ['already'], forms: AFF }),
    T('ppf-told', 'past-perfect', '*They told me that* {CLAUSE}{.}', 'Indirekte Rede über etwas noch Früheres (already) → Past Perfect. Past Perfect betont, dass es früher passiert ist; Simple Past ist hier auch korrekt.', { verbTypes: EV, mid: ['already'], forms: AFF, alsoAccept: ['past-simple'] }),

    // ── Past Perfect Progressive ──
    T('ppfp-for-when', 'past-perfect-progressive', '{CLAUSE} *for {FOR_SHORT} when* {EVENT:past-simple}{.}', 'Lief schon eine Weile (for …), als etwas passierte → Past Perfect Progressive.', { verbTypes: ACT, forms: AFF_Q }),
    T('ppfp-by-the-time', 'past-perfect-progressive', '*By the time* {EVENT:past-simple}, {CLAUSE} *for {FOR_SHORT}*{.}', 'Dauer bis zu einem Punkt in der Vergangenheit → Past Perfect Progressive.', { verbTypes: ACT, forms: AFF }),
    T('ppfp-how-long', 'past-perfect-progressive', '*How long* {CLAUSE} *when* {EVENT:past-simple}{.}', 'How long … when + Simple Past → Past Perfect Progressive.', { verbTypes: ACT, forms: Q }),
    T('ppfp-since-when', 'past-perfect-progressive', '{CLAUSE} *since {SINCE_SHORT} when* {EVENT:past-simple}{.}', 'since … when + Simple Past → Past Perfect Progressive.', { verbTypes: ACT, forms: AFF }),
    T('ppfp-rain-night', 'past-perfect-progressive', '{CLAUSE} *all night, so the streets were wet*{.}', 'Hatte die ganze Nacht angedauert (Folge in der Vergangenheit) → Past Perfect Progressive. Past Perfect Progressive betont die Dauer; Past Perfect und Past Progressive sind hier auch korrekt.', { fixed: { subject: IT, verb: 'rain', object: '' }, forms: AFF, alsoAccept: ['past-perfect', 'past-progressive'] }),
    T('ppfp-tired', 'past-perfect-progressive', '*They were exhausted because* {CLAUSE} *for hours*{.}', 'Dauer vor einem vergangenen Moment → Past Perfect Progressive. Past Perfect Progressive betont die Dauer; Past Perfect ist hier auch korrekt.', { fixed: { subject: THEY, verb: 'carry' }, forms: AFF, alsoAccept: ['past-perfect'] }),
    T('ppfp-ages', 'past-perfect-progressive', '{CLAUSE} *for ages before* {EVENT:past-simple}{.}', 'for ages before + Simple Past → Past Perfect Progressive.', { verbTypes: ACT, forms: AFF }),
    T('ppfp-arrived', 'past-perfect-progressive', '*When the taxi arrived*, {CLAUSE} *for {FOR_SHORT}*{.}', 'Dauer bis zu dem Moment, als das Taxi kam → Past Perfect Progressive.', { verbTypes: ACT, forms: AFF }),
    T('ppfp-mess', 'past-perfect-progressive', '*The kitchen was a mess because* {CLAUSE}{.}', 'Sichtbare Folge in der Vergangenheit → Past Perfect Progressive. Past Perfect Progressive betont die Tätigkeit; Past Perfect und Past Progressive sind hier auch korrekt.', { fixed: { verb: 'bake' }, forms: AFF, alsoAccept: ['past-perfect', 'past-progressive'] }),
    T('ppfp-before', 'past-perfect-progressive', '*Before* {EVENT:past-simple}, {CLAUSE} *for {FOR_SHORT}*{.}', 'Dauer vor einem vergangenen Ereignis → Past Perfect Progressive.', { verbTypes: ACT, forms: AFF }),
    T('ppfp-morning', 'past-perfect-progressive', '{CLAUSE} *all morning before* {EVENT:past-simple}{.}', 'all morning before + Simple Past → Past Perfect Progressive.', { verbTypes: ACT, forms: AFF }),
    T('ppfp-grass', 'past-perfect-progressive', '*The grass was wet because* {CLAUSE}{.}', 'Folge in der Vergangenheit von etwas, das vorher andauerte → Past Perfect Progressive. Past Perfect Progressive betont die Dauer; Past Perfect und Past Progressive sind hier auch korrekt.', { fixed: { subject: IT, verb: 'rain', object: '' }, forms: AFF, alsoAccept: ['past-perfect', 'past-progressive'] }),
    T('ppfp-not-long', 'past-perfect-progressive', '{CLAUSE} *long when* {EVENT:past-simple}{.}', 'Noch nicht lange (long) bis zu einem vergangenen Ereignis → Past Perfect Progressive.', { verbTypes: ACT, forms: NEG_Q }),

    // ── will-Future ──
    T('fut-think', 'future-simple', '*I think* {CLAUSE} *{FUTURE}*{.}', 'Vermutung (I think) über die Zukunft → will-Future.', { forms: AFF_NEG }),
    T('fut-sure', 'future-simple', '*I’m sure* {CLAUSE}{.}', 'Vorhersage (I’m sure) → will-Future.', { verbTypes: EV, forms: AFF_NEG }),
    T('fut-perhaps', 'future-simple', '*Perhaps* {CLAUSE} *{FUTURE}*{.}', 'Vermutung (perhaps) → will-Future.', { forms: AFF }),
    T('fut-if-front', 'future-simple', '*If* {COND}, {CLAUSE}{.}', 'Bedingungssatz Typ 1: if + Simple Present, Hauptsatz will-Future.', { verbTypes: EV, forms: AFF_Q }),
    T('fut-if-end', 'future-simple', '{CLAUSE} *if* {COND}{.}', 'Bedingungssatz Typ 1: Hauptsatz will-Future, if-Satz Simple Present.', { verbTypes: EV, forms: AFF_Q }),
    T('fut-do-you-think', 'future-simple', '*Do you think* {CLAUSE} *{FUTURE}*?', 'Frage nach einer Vermutung (Do you think …?) → will-Future.', { forms: AFF }),
    T('fut-dont-worry', 'future-simple', '*Don’t worry*, {CLAUSE}{.}', 'Versprechen / Beruhigung → will-Future.', { verbTypes: EV, forms: AFF , noGoingTo: true}),
    T('fut-probably', 'future-simple', '{CLAUSE} *{FUTURE}*{.}', 'probably → Vermutung → will-Future.', { mid: ['probably'], forms: AFF }),
    T('fut-promise', 'future-simple', '*I promise* {CLAUSE}{.}', 'Versprechen (I promise) → will-Future.', { verbTypes: EV, fixed: { subject: I }, forms: AFF , noGoingTo: true}),
    T('fut-expect', 'future-simple', '*I expect* {CLAUSE} *{FUTURE}*{.}', 'Erwartung (I expect) → will-Future.', { forms: AFF }),
    T('fut-forecast', 'future-simple', '*According to the forecast*, {CLAUSE} *{FUTURE}*{.}', 'Vorhersage → will-Future.', { fixed: { subject: IT, verb: 'rain', object: '' }, forms: AFF_NEG }),
    T('fut-phone', 'future-simple', '*The phone is ringing.* {CLAUSE}!', 'Spontane Entscheidung im Moment → will-Future.', { fixed: { subject: I, verb: 'answer', object: 'it' }, forms: AFF , noGoingTo: true}),

    // ── Future Progressive ──
    T('futp-at-front', 'future-progressive', '*{AT_FUTURE}*, {CLAUSE}{.}', 'Zu einem Zeitpunkt in der Zukunft läuft die Handlung gerade → Future Progressive.', { verbTypes: ACT, forms: AFF_NEG }),
    T('futp-at', 'future-progressive', '{CLAUSE} *{AT_FUTURE}*{.}', 'this time tomorrow / at 8 tomorrow → läuft dann gerade → Future Progressive.', { verbTypes: ACT }),
    T('futp-dont-call', 'future-progressive', '*Don’t call me at 8 pm –* {CLAUSE} *then*{.}', 'Läuft zu dem Zeitpunkt gerade → Future Progressive.', { verbTypes: ACT, fixed: { subject: I }, forms: AFF }),
    T('futp-still', 'future-progressive', '*When the guests arrive*, {CLAUSE}{.}', 'still: wird dann immer noch laufen → Future Progressive.', { verbTypes: ACT, mid: ['still'], forms: AFF }),
    T('futp-all-day', 'future-progressive', '{CLAUSE} *all day tomorrow*{.}', 'all day tomorrow → läuft den ganzen Tag → Future Progressive. Future Progressive betont den Verlauf; will-Future ist hier auch korrekt.', { verbTypes: ACT, alsoAccept: ['future-simple'] }),
    T('futp-next-year', 'future-progressive', '*At this time next year*, {CLAUSE}{.}', 'At this time next year → läuft dann gerade → Future Progressive. Future Progressive betont den Verlauf; will-Future ist hier auch korrekt.', { fixed: { verb: 'live' }, forms: AFF_NEG, alsoAccept: ['future-simple'] }),
    T('futp-car', 'future-progressive', '{CLAUSE} *tonight*{.}', 'Höfliche Frage nach Plänen → Future Progressive. Die Progressive-Form ist die höfliche Variante; will-Future und Present Progressive sind hier auch korrekt.', { fixed: { subject: YOU, verb: 'use', object: 'the car' }, forms: Q, alsoAccept: ['future-simple', 'present-progressive'] }),
    T('futp-home', 'future-progressive', '{CLAUSE} *when my uncle arrives*{.}', 'Läuft gerade, wenn mein Onkel ankommt → Future Progressive.', { verbTypes: ACT, mid: ['probably'], forms: AFF }),
    T('futp-think-of-me', 'future-progressive', '*Think of me tomorrow at 3 –* {CLAUSE} *then*{.}', 'Läuft morgen um 3 gerade → Future Progressive.', { verbTypes: ACT, fixed: { subject: I }, forms: AFF }),
    T('futp-next-week', 'future-progressive', '*Next week at this time*, {CLAUSE}{.}', 'Zeitpunkt in der Zukunft, Handlung läuft gerade → Future Progressive.', { verbTypes: ACT, forms: AFF_NEG }),

    // ── Future Perfect ──
    T('futpf-by', 'future-perfect', '{CLAUSE} *{BY_FUTURE}*{.}', 'by + Zeitpunkt in der Zukunft → dann schon abgeschlossen → Future Perfect. Future Perfect betont, dass es bis dahin abgeschlossen ist; will-Future ist hier auch korrekt.', { verbTypes: EV, alsoAccept: ['future-simple'] }),
    T('futpf-by-front', 'future-perfect', '*{BY_FUTURE}*, {CLAUSE}{.}', 'By … → bis dahin abgeschlossen → Future Perfect. Future Perfect betont, dass es bis dahin abgeschlossen ist; will-Future ist hier auch korrekt.', { verbTypes: EV, forms: AFF_NEG, alsoAccept: ['future-simple'] }),
    T('futpf-by-the-time', 'future-perfect', '*By the time my aunt gets home*, {CLAUSE}{.}', 'By the time + Simple Present → bis dahin schon fertig → Future Perfect.', { verbTypes: EV, mid: ['already'], forms: AFF }),
    T('futpf-get-home', 'future-perfect', '{CLAUSE} *by the time you get home*{.}', 'by the time you get home → dann schon abgeschlossen → Future Perfect. Future Perfect betont, dass es bis dahin abgeschlossen ist; will-Future ist hier auch korrekt.', { verbTypes: EV, alsoAccept: ['future-simple'] }),
    T('futpf-guests', 'future-perfect', '*Don’t worry –* {CLAUSE} *by the time the guests arrive*{.}', 'by the time + Zukunft → bis dahin abgeschlossen → Future Perfect.', { fixed: { verb: 'clean' }, mid: ['already'], forms: AFF }),
    T('futpf-by-then', 'future-perfect', 'We’ll be back at six. *By then*, {CLAUSE}{.}', 'By then (= bis wir zurück sind) → bis dahin abgeschlossen → Future Perfect.', { verbTypes: EV, mid: ['already'], forms: AFF }),
    T('futpf-meeting', 'future-perfect', '{CLAUSE} *by the end of the meeting*{.}', 'by the end of … → Future Perfect. Future Perfect betont, dass es bis dahin abgeschlossen ist; will-Future ist hier auch korrekt.', { fixed: { verb: 'sign' }, forms: Q, alsoAccept: ['future-simple'] }),
    T('futpf-call-me', 'future-perfect', '*Call me at 9 –* {CLAUSE} *by then*{.}', 'by then → bis dahin fertig → Future Perfect.', { verbTypes: EV, fixed: { subject: I }, mid: ['already'], forms: AFF }),
    T('futpf-before-leave', 'future-perfect', '{CLAUSE} *before we leave*{.}', 'already … before → bis dahin schon erledigt → Future Perfect.', { verbTypes: EV, mid: ['already'], forms: AFF }),
    T('futpf-film', 'future-perfect', '*By the time we arrive*, {CLAUSE}{.}', 'By the time + Simple Present → Future Perfect.', { fixed: { subject: S('the film', 3, 'sg'), verb: 'start', object: '' }, forms: AFF_NEG }),

    // ── Future Perfect Progressive ──
    T('futpfp-by-point', 'future-perfect-progressive', '*{BY_POINT}*, {CLAUSE} *for {FOR_SHORT}*{.}', 'By … + for … → Dauer bis zu einem Zeitpunkt in der Zukunft → Future Perfect Progressive.', { verbTypes: ACT, forms: AFF }),
    T('futpfp-by-the-time', 'future-perfect-progressive', '{CLAUSE} *for {FOR_SHORT} by the time the taxi comes*{.}', 'for … by the time → Future Perfect Progressive.', { verbTypes: ACT, forms: AFF }),
    T('futpfp-long', 'future-perfect-progressive', '*{BY_LONG}*, {CLAUSE} *for {FOR_LONG}*{.}', 'By … + for … → Dauer bis dahin → Future Perfect Progressive.', { fixed: { verb: 'teach' }, forms: AFF }),
    T('futpfp-how-long', 'future-perfect-progressive', '*How long* {CLAUSE} *by next summer*{.}', 'How long … by …? → Future Perfect Progressive. Future Perfect Progressive betont die Dauer; Future Perfect ist hier auch korrekt.', { fixed: { subject: YOU, verb: 'live' }, forms: Q, alsoAccept: ['future-perfect'] }),
    T('futpfp-year', 'future-perfect-progressive', '*By next month*, {CLAUSE} *for exactly a year*{.}', 'By … + for … → Future Perfect Progressive. Future Perfect Progressive betont die Dauer; Future Perfect ist hier auch korrekt.', { fixed: { verb: 'live', object: 'here' }, forms: AFF, alsoAccept: ['future-perfect'] }),
    T('futpfp-arrive', 'future-perfect-progressive', '{CLAUSE} *for {FOR_SHORT} by the time the guests arrive*{.}', 'for … by the time the guests arrive → Future Perfect Progressive.', { verbTypes: ACT, forms: AFF_Q }),
    T('futpfp-bus', 'future-perfect-progressive', '*When the bus finally comes*, {CLAUSE} *for over an hour*{.}', 'Dauer bis zu einem Moment in der Zukunft → Future Perfect Progressive.', { fixed: { verb: 'wait', object: '' }, forms: AFF }),
    T('futpfp-guests-leave', 'future-perfect-progressive', '*By the time the guests leave*, {CLAUSE} *for hours*{.}', 'By the time … + for hours → Future Perfect Progressive.', { verbTypes: ACT, forms: AFF }),
    T('futpfp-ten-hours', 'future-perfect-progressive', '*By 6 pm tomorrow*, {CLAUSE} *for ten hours*{.}', 'By … + for … → Dauer bis zu einem Zeitpunkt in der Zukunft → Future Perfect Progressive.', { fixed: { verb: 'work' }, forms: AFF_NEG }),
    T('futpfp-evening', 'future-perfect-progressive', '{CLAUSE} *for {FOR_SHORT} by this evening*{.}', 'for … by this evening → Future Perfect Progressive.', { verbTypes: ACT, forms: AFF_Q }),
  ];
})(globalThis.TT = globalThis.TT || {});
