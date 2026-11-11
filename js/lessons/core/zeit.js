(function (TT) {
  'use strict';

  // Zeitangaben und Nebensätze: „for und since“ sowie „Kein will im Zeit-Nebensatz“.

  // Baut aus Nebensätzen und Hauptsätzen beide Satzstellungen („When …, main.“ und „Main when ….“).
  // Hauptsätze mit '^' am Anfang behalten ihren Großbuchstaben (Namen); sonst wird am Satzanfang klein geschrieben.
  const clauses = (conj, subs, mains) => {
    const out = [];
    const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const low = (s) => (s[0] === '^' ? s.slice(1) : (/^I[ ']/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1)));
    const up = (s) => (s[0] === '^' ? s.slice(1) : s);
    subs.forEach((sub) => mains.forEach((m) => {
      out.push(cap1(conj) + ' ' + sub + ', ' + low(m) + '.');
      out.push(cap1(up(m)) + ' ' + conj + ' ' + sub + '.');
    }));
    return out;
  };

  TT.addBankLesson({
    id: 'for-since', cat: 'zeit', level: 'B1', refs: ['B1-02'],
    title: 'for und since',
    rule: "Mit „for“ nennst du eine Zeitdauer („for two years“, „for an hour“), mit „since“ einen Zeitpunkt, an dem etwas angefangen hat („since 2016“, „since Monday“, „since I was a child“). Wenn etwas in der Vergangenheit begonnen hat und bis jetzt andauert, benutzt du im Englischen das Present Perfect (oft auch das Present Perfect Progressive) – nicht das Present wie im Deutschen: „Ich wohne hier seit 2016“ heißt „I've lived here since 2016“. Bei Verben wie „know“ oder „be“ gibt es nur die einfache Form („I've known her for years“). Mit „ago“ (Zeitpunkt in der Vergangenheit, gerechnet von jetzt) steht dagegen das Past Simple: „I moved here two years ago“.",
    tip: 'Seit + andauernd = Present Perfect, nie Present. Dauer → for, Anfangspunkt → since. „ago“ gehört zum Past Simple.',
    mistakes: [
      ['I live here since 2016.', "I've lived here since 2016."],
      ['She is a teacher since twenty years.', 'She has been a teacher for twenty years.'],
      ['I have met him three years ago.', 'I met him three years ago.'],
      ['How long do you learn English?', 'How long have you been learning English?'],
    ],
    examples: [
      "We've lived in Dresden for six years.",
      'Tom has been working at the hospital since March.',
      "I haven't seen my cousin since Christmas.",
      'My sister moved to Vienna four years ago.',
    ],
    cloze: [
      { s: 'I have lived in Dresden ___ 2016.', a: ['since'], w: ['for', 'ago', 'from'], e: '„2016“ ist ein Zeitpunkt, an dem etwas angefangen hat – dafür steht „since“.' },
      { s: 'We have known each other ___ ten years.', a: ['for'], w: ['since', 'ago', 'from'], e: '„ten years“ ist eine Zeitdauer, deshalb „for“.' },
      { s: "It is four o'clock, and Anna ___ at the station for two hours.", h: 'wait', a: ['has been waiting', 'has waited'], w: ['waits', 'waited'], e: 'Das Warten dauert bis jetzt an: Present Perfect (Progressive), nicht Present oder Past Simple.' },
      { s: 'My brother has worked for the same company ___ he left school.', a: ['since', 'ever since'], w: ['for', 'ago', 'from'], e: 'Vor „he left school“ (ein Zeitpunkt in einem Nebensatz) steht „since“.' },
      { s: 'I started learning English three years ___.', a: ['ago'], w: ['for', 'since', 'from'], e: '„ago“ rechnet von jetzt zurück, und das Verb steht im Past Simple („started“).' },
      { s: 'They ___ in Berlin since 2019.', h: 'live', a: ['have lived', 'have been living'], w: ['live', 'lived', 'are living'], e: 'Mit „since“ steht das Present Perfect, auch wenn es im Deutschen „wohnen sie“ heißt.' },
      { s: 'Tom ___ his parents since Christmas.', h: 'not see', a: ["hasn't seen", 'has not seen'], w: ["doesn't see", "didn't see", "isn't seeing"], e: "„since Christmas“ bis jetzt: Present Perfect verneint, „hasn't seen“." },
      { s: 'How long ___ you had your car?', a: ['have'], w: ['did', 'do', 'are'], e: '„How long“ bis jetzt verlangt das Present Perfect: „How long have you had …?“.' },
      { s: "I haven't been to the gym ___ weeks.", a: ['for', 'in'], w: ['since', 'ago'], e: '„weeks“ ist eine Zeitdauer, deshalb „for“ (nach einer Verneinung geht auch „in weeks“).' },
      { s: 'Mia has been ill ___ last Monday.', a: ['since'], w: ['for', 'ago', 'from'], e: '„last Monday“ ist ein Anfangspunkt, deshalb „since“.' },
      { s: 'Dad ___ two years ago.', h: 'retire', a: ['retired'], w: ['has retired', 'retires'], e: 'Mit „ago“ steht das Past Simple, nicht das Present Perfect.' },
      { s: 'Sarah is a nurse, and she ___ in this hospital for ten years.', h: 'work', a: ['has worked', 'has been working'], w: ['works', 'worked', 'is working'], e: 'Die zehn Jahre reichen bis heute, deshalb Present Perfect.' },
      { s: 'Germany was reunited in 1990. It has been one country ___ then.', a: ['since', 'ever since'], w: ['for', 'ago', 'from'], e: '„then“ nennt den Anfangspunkt, also „since then“.' },
      { s: "I've been learning the guitar ___ about six months.", a: ['for'], w: ['since', 'ago'], e: '„six months“ ist eine Dauer, deshalb „for“.' },
      { s: 'It has been raining ___ this morning.', a: ['since', 'ever since'], w: ['for', 'from', 'ago'], e: '„this morning“ ist der Beginn des Regens, deshalb „since“.' },
      { s: 'We are exhausted because we ___ a holiday for two years.', h: 'not have', a: ["haven't had", 'have not had'], w: ["don't have", "haven't have"], e: "Die zwei Jahre reichen bis jetzt: „haven't had“ im Present Perfect." },
      { s: 'Lena ___ German since she was a child.', h: 'study', a: ['has studied', 'has been studying'], w: ['studies', 'studied', 'is studying'], e: 'Nach „since she was a child“ steht im Hauptsatz das Present Perfect.' },
      { s: 'How long ___ you been waiting?', a: ['have'], w: ['did', 'has'], e: '„have been waiting“ gehört zu „you“, das Hilfsverb ist „have“.' },
    ],
    errorspot: [
      { r: "I've lived here since 2016.", w: 'I live here since 2016.', o: ['I lived here since 2016.'], e: 'Eine Handlung, die bis jetzt dauert, steht im Present Perfect, nicht im Present oder Past Simple.' },
      { r: 'She has been a teacher for twenty years.', w: 'She is a teacher since twenty years.', o: ['She has been a teacher since twenty years.'], e: 'Zwanzig Jahre sind eine Dauer („for“), und es braucht das Present Perfect.' },
      { r: 'We have known each other for a long time.', w: 'We know each other since a long time.', o: ['We know each other for a long time.'], e: 'Im Englischen steht für „schon lange“ das Present Perfect mit „for“.' },
      { r: 'I met him three years ago.', w: 'I met him since three years.', o: ['I have met him three years ago.'], e: '„ago“ gehört zum Past Simple; „since“ passt nicht zu einer Dauer.' },
      { r: 'How long have you been learning Spanish?', w: 'How long do you learn Spanish?', o: ['Since when do you learn Spanish?'], e: '„Wie lange schon?“ wird mit dem Present Perfect gefragt.' },
      { r: "He hasn't called me since Monday.", w: "He doesn't call me since Monday.", o: ["He hasn't called me for Monday."], e: 'Mit „since“ steht das Present Perfect; „Monday“ ist ein Zeitpunkt, also „since“, nicht „for“.' },
      { r: 'They have been waiting for an hour.', w: 'They are waiting since an hour.', o: ['They have been waiting since an hour.'], e: '„an hour“ ist eine Dauer, deshalb „for“, und das Verb steht im Present Perfect Progressive.' },
      { r: 'It has been snowing since yesterday.', w: 'It snows since yesterday.', o: ['It is snowing since yesterday.'], e: 'Der Schnee fällt seit gestern bis jetzt: Present Perfect Progressive.' },
      { r: "I haven't seen her for ages.", w: "I don't see her for ages.", o: ["I haven't seen her since ages."], e: '„for ages“ nennt eine Dauer; dazu das Present Perfect.' },
      { r: 'My parents have been married for 35 years.', w: 'My parents are married since 35 years.', o: ['My parents are married for 35 years.'], e: 'Auch bei „sein“ gilt: bis jetzt andauernd = Present Perfect („have been married“).' },
      { r: 'Max has had his bike since he was twelve.', w: 'Max has his bike since he was twelve.', o: ['Max has had his bike for he was twelve.'], e: '„Haben seit“ heißt im Englischen „has had since“; vor einem Satz steht „since“, nicht „for“.' },
      { r: 'We moved to Leipzig two years ago.', w: 'We have moved to Leipzig two years ago.', o: ['We moved to Leipzig since two years.'], e: 'Mit „ago“ steht das Past Simple („moved“).' },
      { r: 'She has been working here since March.', w: 'She works here since March.', o: ['She has been working here for March.'], e: '„March“ ist ein Anfangspunkt („since“), und das Verb braucht das Present Perfect.' },
      { r: "I've had this phone for three years.", w: 'I have this phone since three years.', o: ['I have this phone for three years.'], e: '„Haben seit drei Jahren“ = „have had … for three years“.' },
    ],
    transform: [
      { s: 'Anna *works* at the hospital. She began there in 2015.', l: '→ ein Satz mit „since“ im Present Perfect', a: ['Anna has worked at the hospital since 2015.', 'Anna has been working at the hospital since 2015.', 'Since 2015, Anna has worked at the hospital.', 'Since 2015, Anna has been working at the hospital.'], e: 'Ein Zustand, der 2015 begann und noch andauert: Present Perfect mit „since“.' },
      { s: 'We *know* Tom. We met him in 2010.', l: '→ ein Satz mit „since“ im Present Perfect', a: ['We have known Tom since 2010.', 'Since 2010, we have known Tom.', 'We have known Tom since we met him in 2010.'], e: '„know“ steht nicht in der -ing-Form: „have known … since 2010“.' },
      { s: 'It started raining two hours ago, and it is still raining.', l: '→ ein Satz mit „for“ im Present Perfect', a: ['It has been raining for two hours.', 'It has been raining for two hours now.', 'It has rained for two hours.', 'For two hours, it has been raining.'], e: 'Die Dauer bis jetzt: Present Perfect (Progressive) mit „for two hours“.' },
      { s: 'Mia *is* ill. It began last week.', l: '→ ein Satz mit „since“ im Present Perfect', a: ['Mia has been ill since last week.', 'Since last week, Mia has been ill.'], e: 'Bei „be“ steht „has been“ + „since“ + Zeitpunkt.' },
      { s: 'I *am* a teacher. I started eight years ago.', l: '→ ein Satz mit „for“ im Present Perfect', a: ['I have been a teacher for eight years.', 'I have been teaching for eight years.', 'For eight years, I have been a teacher.', 'For eight years, I have been teaching.', 'I have worked as a teacher for eight years.', 'I have been working as a teacher for eight years.'], e: 'Die Dauer „eight years“ bis jetzt: Present Perfect mit „for“.' },
      { s: 'They bought the house in 2020. They still own it.', l: '→ ein Satz mit „since 2020“ im Present Perfect', a: ['They have had the house since 2020.', 'They have owned the house since 2020.', 'Since 2020, they have had the house.', 'Since 2020, they have owned the house.'], e: '„have had / have owned … since 2020“ – nicht das Present wie im Deutschen.' },
      { s: 'I last saw Paul in June.', l: "→ ein Satz mit „haven't … since“", a: ["I haven't seen Paul since June.", "Since June, I haven't seen Paul."], e: 'Verneintes Present Perfect + „since“ + Zeitpunkt.' },
      { s: 'He moved to Vienna *five years ago*.', l: '→ „He has …“ mit „for“ (wohnen)', a: ['He has lived in Vienna for five years.', 'He has been living in Vienna for five years.'], e: 'Die Dauer bis jetzt: „has lived“ + „for five years“.' },
      { s: 'Lukas *plays* football. He started when he was six.', l: '→ ein Satz mit „since“ im Present Perfect', a: ['Lukas has played football since he was six.', 'Lukas has been playing football since he was six.', 'Since he was six, Lukas has played football.', 'Since he was six, Lukas has been playing football.', 'Lukas has played football since the age of six.', 'Lukas has been playing football since the age of six.'], e: 'Nach „since“ steht auch ein ganzer Satz im Past Simple („he was six“); im Hauptsatz das Present Perfect.' },
      { s: "I *don't smoke*. I stopped smoking two years ago.", l: '→ „smoke“ im verneinten Present Perfect mit „for“', a: ["I haven't smoked for two years.", "For two years, I haven't smoked."], e: "„Seit zwei Jahren nicht“ = „haven't smoked for two years“." },
      { s: 'How long *do you learn* Chinese?', l: '→ Korrigiere den Satz.', a: ['How long have you been learning Chinese?', 'How long have you learned Chinese?', 'How long have you learnt Chinese?'], e: 'Die Frage „Wie lange schon?“ braucht das Present Perfect.' },
      { s: 'He *is* here since Monday.', l: '→ Korrigiere den Satz.', a: ['He has been here since Monday.', 'Since Monday, he has been here.'], e: 'Seit Montag bis jetzt: „has been“ statt „is“.' },
    ],
  });

  TT.addBankLesson({
    id: 'no-will-time-clause', cat: 'zeit', level: 'B1', refs: ['B1-06'],
    title: 'Kein will im Zeit-Nebensatz',
    rule: "Wenn von der Zukunft die Rede ist, steht nach Zeitkonjunktionen wie „when“, „as soon as“, „before“, „after“, „until“ und „once“ im Nebensatz das Present – nicht „will“. Das „will“ gehört in den Hauptsatz: „When I get home, I'll call you.“ Wenn die Handlung im Nebensatz schon abgeschlossen sein muss, kannst du dort auch das Present Perfect benutzen: „After I've finished, I'll call you.“ Im Deutschen sagt man dagegen oft „Wenn ich nach Hause komme, werde ich …“ – eine wörtliche Übersetzung mit „will“ im Nebensatz ist falsch.",
    tip: 'Zeitkonjunktion (when, after, until …) + Zukunft: Im Nebensatz Present, „will“ nur im Hauptsatz.',
    mistakes: [
      ["When I will get home, I'll call you.", "When I get home, I'll call you."],
      ["I'll wait until you will be ready.", "I'll wait until you are ready."],
      ["As soon as she will arrive, we'll start.", "As soon as she arrives, we'll start."],
      ["After we will have eaten, we'll go out.", "After we have eaten, we'll go out."],
    ],
    examples: [
      "When the bus comes, we'll get on.",
      "I'll send you the photos as soon as I get back.",
      "Don't leave before I say goodbye.",
      "Once the guests have left, we'll tidy up.",
    ],
    cloze: [
      { s: "I'll phone you as soon as I ___.", h: 'arrive', a: ['arrive', 'have arrived'], w: ['will arrive', 'arrived'], e: 'Nach „as soon as“ steht das Present (oder Present Perfect), nicht „will“.' },
      { s: 'Please wait here until the doctor ___ your name.', h: 'call', a: ['calls', 'has called'], w: ['will call', 'called'], e: 'Nach „until“ steht im Nebensatz das Present, auch wenn es um die Zukunft geht.' },
      { s: "When the film ___, we'll go for a pizza.", h: 'end', a: ['ends', 'has ended'], w: ['will end', 'ended'], e: 'Im „when“-Satz steht das Present oder Present Perfect, nicht „will end“.' },
      { s: "Before we ___, I'll lock all the windows.", h: 'leave', a: ['leave'], w: ['will leave', 'left'], e: 'Nach „before“ steht für die Zukunft das Present Simple.' },
      { s: "After she ___ her degree, she'll look for a job in Hamburg.", h: 'finish', a: ['finishes', 'has finished'], w: ['will finish', 'finished'], e: 'Nach „after“ kommt Present Simple oder Present Perfect; „will“ steht nur im Hauptsatz.' },
      { s: "Don't open the oven until the cake ___ ready.", h: 'be', a: ['is'], w: ['will be', 'was'], e: 'Nach „until“ steht „is“, nicht „will be“.' },
      { s: "Once you ___ the flat, you'll love it.", h: 'see', a: ['see', 'have seen'], w: ['will see', 'saw'], e: 'Nach „once“ steht Present Simple oder Present Perfect.' },
      { s: "I'll tell him the news when he ___ back.", h: 'come', a: ['comes', 'has come'], w: ['will come', 'came'], e: 'Nach „when“ in einem Zeit-Nebensatz steht das Present.' },
      { s: 'Call me as soon as the train ___ to Dresden.', h: 'get', a: ['gets', 'has got', 'has gotten'], w: ['will get', 'got'], e: 'Nach „as soon as“ nimmst du Present oder Present Perfect.' },
      { s: "We'll start the meeting when everybody ___ here.", h: 'be', a: ['is'], w: ['will be', 'was'], e: 'Im „when“-Nebensatz bleibt es beim Present: „is“.' },
      { s: 'The shop will be closed until the manager ___ back from holiday.', h: 'come', a: ['comes', 'has come'], w: ['will come', 'came'], e: 'Nach „until“ steht Present oder Present Perfect, nicht „will“.' },
      { s: "As soon as the weather ___ better, we'll go hiking.", h: 'get', a: ['gets', 'has got', 'has gotten'], w: ['will get', 'got'], e: 'Nach „as soon as“ steht kein „will“.' },
      { s: "I'm going to buy a car after I ___ my driving test.", h: 'pass', a: ['pass', 'have passed'], w: ['will pass', 'passed'], e: 'Nach „after“ steht Present oder Present Perfect, auch beim Futur mit „going to“.' },
      { s: "When my parents ___ us next month, we'll show them the castle.", h: 'visit', a: ['visit', 'are visiting'], w: ['will visit', 'visited'], e: 'Der Zeit-Nebensatz mit „when“ steht im Present (auch Present Progressive), obwohl es um nächsten Monat geht – nicht „will“.' },
      { s: 'Tomorrow, when I get home, I ___ you.', h: 'will + call', a: ['will call'], w: ['call', 'called', 'have called'], e: 'Das „will“ gehört in den Hauptsatz: „I will call you“. Das Present Simple („I call“) passt hier nicht für ein Versprechen in der Zukunft.' },
      { s: 'Before you ___, take your umbrella.', h: 'go', a: ['go'], w: ['will go', 'went'], e: 'Nach „before“ steht Present Simple, auch mit dem Imperativ im Hauptsatz.' },
      { s: "She won't relax until she ___ from him.", h: 'hear', a: ['hears', 'has heard'], w: ['will hear', 'heard'], e: "Nach „until“ steht Present oder Present Perfect; „will“ nur im Hauptsatz („won't relax“)." },
    ],
    errorspot: [
      { r: "When I get home, I'll cook dinner.", w: "When I will get home, I'll cook dinner.", o: ["When I got home, I'll cook dinner."], e: 'Im „when“-Nebensatz steht das Present, „will“ nur im Hauptsatz.' },
      { r: 'Call me as soon as you arrive.', w: 'Call me as soon as you will arrive.', o: ['Call me as soon as you arrived.'], e: 'Nach „as soon as“ steht Present Simple, auch wenn es um die Zukunft geht.' },
      { r: "I'll wait here until you come back.", w: "I'll wait here until you will come back.", o: ["I'll wait here until you came back."], e: '„until“ verlangt im Nebensatz das Present.' },
      { r: "After we have eaten, we'll go for a walk.", w: "After we will have eaten, we'll go for a walk.", o: ["After we ate, we'll go for a walk."], e: 'Nach „after“ steht Present Perfect oder Present Simple, nicht „will have“.' },
      { r: "Before he leaves, he'll say goodbye to everyone.", w: "Before he will leave, he'll say goodbye to everyone.", o: ["Before he left, he'll say goodbye to everyone."], e: 'Nach „before“ kein „will“ im Nebensatz.' },
      { r: 'Once you finish the course, you can start working.', w: 'Once you will finish the course, you can start working.', e: 'Auch nach „once“ steht das Present.' },
      { r: "I'm going to sleep until the sun comes up.", w: "I'm going to sleep until the sun will come up.", e: 'Im Nebensatz mit „until“ steht „comes“, nicht „will come“.' },
      { r: "We'll leave as soon as the taxi arrives.", w: "We'll leave as soon as the taxi will arrive.", o: ["We'll leave as soon as the taxi arrived."], e: 'Das Zukünftige steckt im Hauptsatz, der Nebensatz steht im Present.' },
      { r: "As soon as I have finished work, I'll drive to the gym.", w: "As soon as I will have finished work, I'll drive to the gym.", o: ["As soon as I finished work, I'll drive to the gym."], e: 'Nach „as soon as“ nimmst du Present Perfect oder Present Simple.' },
      { r: "When Julia comes, we'll start the party.", w: "When Julia will come, we'll start the party.", e: '„When“ als Zeitkonjunktion verlangt im Nebensatz das Present.' },
      { r: 'The doctor will see you as soon as she has finished with her patient.', w: 'The doctor will see you as soon as she will finish with her patient.', e: 'Nach „as soon as“ steht kein „will“.' },
      { r: "I'll send you the photos after I get back from Italy.", w: "I'll send you the photos after I will get back from Italy.", o: ["I'll send you the photos after I got back from Italy."], e: 'Nach „after“ steht im Nebensatz das Present.' },
      { r: "Please don't leave before the meeting ends.", w: "Please don't leave before the meeting will end.", e: 'Nach „before“ steht das Present, nicht „will end“.' },
      { r: "Until the rain stops, we'll stay inside.", w: "Until the rain will stop, we'll stay inside.", e: 'Auch wenn der „until“-Satz vorn steht, bleibt er im Present.' },
    ],
    transform: [
      { s: "I'll finish my homework. Then I'll call you.", l: '→ ein Satz mit „after“', a: clauses('after', ['I finish my homework', 'I have finished my homework', 'finishing my homework', 'having finished my homework'], ["I'll call you", "I'm going to call you"]), e: 'Nach „after“ steht Present Simple oder Present Perfect; „will“ bleibt im Hauptsatz.' },
      { s: "*The train will arrive.* I'll text you immediately.", l: '→ ein Satz mit „as soon as“', a: clauses('as soon as', ['the train arrives', 'the train has arrived'], ["I'll text you", "I'm going to text you"]), e: 'Im „as soon as“-Satz steht das Present: „arrives“, nicht „will arrive“.' },
      { s: "The meeting will end at six. I'll stay at the office until then.", l: '→ ein Satz mit „until“ und „the meeting“', a: clauses('until', ['the meeting ends', 'the meeting has ended', 'the meeting ends at six'], ["I'll stay at the office", "I'm going to stay at the office"]), e: 'Nach „until“ steht das Present („ends“), nicht „will end“.' },
      { s: "We will get to Hamburg. We'll call our friends then.", l: '→ ein Satz mit „when“', a: clauses('when', ['we get to Hamburg', 'we have got to Hamburg', 'we have gotten to Hamburg', 'we arrive in Hamburg'], ["we'll call our friends", "we're going to call our friends"]), e: 'Im Nebensatz mit „when“ steht das Present („get“).' },
      { s: "First I'll check the prices. Then I'll book the hotel.", l: '→ ein Satz mit „before I …“, der mit „I“ beginnt', a: ["I'll check the prices before I book the hotel.", "I'm going to check the prices before I book the hotel."], e: 'Nach „before“ steht „book“, nicht „will book“.' },
      { s: "She will get her results. Then she'll decide what to study.", l: '→ ein Satz mit „once“', a: clauses('once', ['she gets her results', 'she has got her results', 'she has gotten her results'], ["she'll decide what to study", "she's going to decide what to study"]), e: 'Nach „once“ steht Present Simple oder Present Perfect.' },
      { s: 'The children will go to bed. Then we can watch a film.', l: '→ ein Satz mit „after“ und „we can“', a: clauses('after', ['the children go to bed', 'the children have gone to bed'], ['we can watch a film']), e: 'Im Nebensatz nach „after“ steht das Present, der Hauptsatz hat „can“.' },
      { s: "It will stop raining soon. We'll go out immediately after that.", l: '→ ein Satz mit „as soon as“', a: clauses('as soon as', ['it stops raining', 'it has stopped raining', 'the rain stops', 'the rain has stopped'], ["we'll go out", "we're going to go out"]), e: 'Kein „will“ nach „as soon as“: „it stops raining“.' },
      { s: "When we *will arrive* in Rome, we'll call you.", l: '→ Korrigiere den Satz.', a: ["When we arrive in Rome, we'll call you.", "When we have arrived in Rome, we'll call you.", "When we arrive in Rome, we're going to call you.", "We'll call you when we arrive in Rome."], e: 'Im „when“-Nebensatz steht das Present, „will“ nur im Hauptsatz.' },
      { s: "I'll wait until you *will be* ready.", l: '→ Korrigiere den Satz.', a: ["I'll wait until you are ready.", "I'm going to wait until you are ready."], e: 'Nach „until“ steht „are“, nicht „will be“.' },
    ],
  });
})(globalThis.TT = globalThis.TT || {});
