(function (TT) {
  'use strict';

  // Modalverben: „mustn't“ (Verbot) gegen „don't have to“ (nicht nötig).

  // Richtige Füllungen für ein Verbot und für „nicht nötig“ (Gegenwart bzw. 3. Person / Vergangenheit).
  // „shouldn't“ und „can't“ sind im Kontext natürliches Englisch und zählen deshalb auch.
  // FORBID_NOW: dringendes „darf nicht“ ohne Regel (kein „allowed to“). FORBID: Verbot durch jemanden.
  // FORBID_RULE: offizielle Regel, dort passen auch „may not“ und „aren't permitted to“.
  const FORBID_NOW = ["mustn't", 'must not', "can't", 'cannot', "shouldn't"];
  const FORBID = FORBID_NOW.concat(['must never', "aren't allowed to", 'are not allowed to']);
  const FORBID_RULE = FORBID.concat(['may not', "aren't permitted to", 'are not permitted to']);
  const NONEED = ["don't have to", "don't need to", "needn't", "haven't got to"];
  const NONEED3 = ["doesn't have to", "doesn't need to", "needn't", "hasn't got to"];
  const NONEED_PAST = ["didn't have to", "didn't need to"];

  TT.addBankLesson({
    id: 'mustnt-dont-have-to', cat: 'modal', level: 'A2', refs: ['A2-12', 'A2-13'],
    title: "mustn't und don't have to",
    rule: "„mustn't“ und „don't have to“ klingen ähnlich, bedeuten aber etwas ganz anderes. „You mustn't park here“ heißt „Du darfst hier nicht parken“ – es ist verboten. „You don't have to park here“ heißt „Du musst hier nicht parken“ – es ist nur nicht nötig, du darfst es aber. Statt „don't have to“ kannst du auch „don't need to“ oder „needn't“ sagen. In der Vergangenheit heißt „musste nicht“ „didn't have to“ (oder „didn't need to“); „mustn't“ gibt es nur in der Gegenwart. Das deutsche „muss nicht“ übersetzt du also nie mit „mustn't“.",
    tip: "Verbot → mustn't. Keine Pflicht, aber erlaubt → don't have to / don't need to.",
    mistakes: [
      ["You mustn't wear a tie. It's a casual party.", "You don't have to wear a tie. It's a casual party."],
      ["We mustn't hurry. The film starts at nine.", "We don't have to hurry. The film starts at nine."],
      ["You don't must be late for the interview.", "You mustn't be late for the interview."],
      ["She hasn't to work on Sundays.", "She doesn't have to work on Sundays."],
    ],
    examples: [
      "You mustn't touch the oven door. It's very hot.",
      "You don't have to come with us if you're tired.",
      "You mustn't cross the road when the light is red.",
      "We didn't have to pay for the museum yesterday.",
    ],
    cloze: [
      { s: "You ___ use your phone in the exam. It's against the rules.", h: 'must / have to', a: FORBID_RULE, w: ["don't have to", "needn't"], e: "Die Regeln verbieten es, also Verbot: „mustn't“, nicht „don't have to“." },
      { s: 'The course is online, so you ___ travel to Berlin.', h: 'must / have to', a: NONEED, w: ["mustn't", "haven't to"], e: "Der Kurs ist online, die Reise ist also nicht nötig (aber erlaubt): „don't have to“. „mustn't“ wäre ein Verbot." },
      { s: 'Children ___ play with matches. It is dangerous.', h: 'must / have to', a: FORBID, w: ["don't have to", "needn't"], e: "Gefährlich und verboten: „mustn't“." },
      { s: 'We have plenty of time, so we ___ hurry.', h: 'must / have to', a: NONEED, w: ["mustn't", "haven't to"], e: "Es ist nicht nötig, sich zu beeilen: „don't have to“ oder „needn't“." },
      { s: 'You ___ drive faster than 50 km/h in this street.', h: 'must / have to', a: FORBID_RULE, w: ["don't have to", "needn't"], e: "Das Tempolimit verbietet es: „mustn't“." },
      { s: 'She ___ cook tonight because we are going to a restaurant.', h: 'must / have to', a: NONEED3, w: ["mustn't", "don't have to"], e: "Kochen ist nicht nötig. Zu „she“ passt „doesn't have to“, nicht „don't have to“." },
      { s: 'Tomorrow is a holiday, so the children ___ go to school.', h: 'must / have to', a: NONEED.concat(["won't have to", "won't need to"]), w: ["mustn't", "didn't have to"], e: "Der Feiertag macht die Schule unnötig: „don't have to“. „mustn't“ wäre ein Verbot." },
      { s: 'Visitors ___ feed the animals. There are signs everywhere.', h: 'must / have to', a: FORBID_RULE, w: ["don't have to", "needn't"], e: "Schilder verbieten das Füttern: „mustn't“." },
      { s: 'I ___ work on Saturdays. My new contract is Monday to Friday.', h: 'must / have to', a: NONEED, w: ["mustn't", "haven't to"], e: "Laut Vertrag ist Samstagsarbeit nicht nötig (verboten ist sie nicht): „don't have to“." },
      { s: 'Yesterday we ___ get up early because it was Sunday.', h: 'must / have to', a: NONEED_PAST, w: ["mustn't", "don't have to"], e: "Vergangenheit und nicht nötig: „didn't have to“. „mustn't“ gibt es nicht in der Vergangenheit." },
      { s: 'The ticket was free, so I ___ pay anything.', h: 'must / have to', a: NONEED_PAST, w: ["don't have to", "mustn't"], e: "Das Ticket war gratis; es war nicht nötig zu zahlen: „didn't have to“." },
      { s: 'You ___ tell anyone about the surprise party. It is a secret!', h: 'must / have to', a: FORBID, w: ["don't have to", "needn't"], e: "Es soll geheim bleiben, also ein Verbot: „mustn't“." },
      { s: 'You ___ bring any food. We have already cooked enough.', h: 'must / have to', a: NONEED, w: ["mustn't", "haven't to"], e: "Es ist genug da, Essen mitzubringen ist nicht nötig: „don't have to“." },
      { s: 'Passengers ___ smoke on the train. The fine is 50 euros.', h: 'must / have to', a: FORBID_RULE, w: ["don't have to", "needn't"], e: "Mit Strafe bedroht, also verboten: „mustn't“." },
      { s: 'He ___ pay for parking. The hotel offers free spaces.', h: 'must / have to', a: NONEED3, w: ["mustn't", "don't have to"], e: "Gratis-Parkplätze machen das Zahlen unnötig. Zu „he“ passt „doesn't have to“." },
      { s: 'Be quiet! We ___ wake the baby.', h: 'must / have to', a: FORBID_NOW, w: ["don't have to", "needn't"], e: "Das Baby soll nicht aufwachen, ein dringendes „darf nicht“: „mustn't“." },
      { s: 'Mum says we ___ eat all our vegetables, so I can leave the carrots.', h: 'must / have to', a: NONEED, w: ["mustn't", "haven't to"], e: "Die Karotten dürfen liegen bleiben: Es ist nicht nötig, alles zu essen, also „don't have to“." },
      { s: "You ___ forget your passport. They won't let you on the plane without it.", h: 'must / have to', a: FORBID_NOW, w: ["don't have to", "needn't"], e: "Den Pass zu vergessen geht auf keinen Fall – ein dringendes „darf nicht“: „mustn't“." },
    ],
    errorspot: [
      { r: "You mustn't smoke here. It's forbidden.", w: "You don't have to smoke here. It's forbidden.", o: ["You mustn't to smoke here. It's forbidden."], e: "Bei einem Verbot steht „mustn't“. „don't have to“ bedeutet nur „nicht nötig“." },
      { r: "You don't have to wear a tie. It's a casual party.", w: "You mustn't wear a tie. It's a casual party.", o: ["You don't must wear a tie. It's a casual party."], e: "Hier ist es nicht nötig, nicht verboten. „mustn't“ wäre ein Verbot." },
      { r: "We don't have to hurry. The film starts at nine.", w: "We mustn't hurry. The film starts at nine.", o: ["We haven't to hurry. The film starts at nine."], e: "Es ist keine Eile nötig: „don't have to“." },
      { r: "Students mustn't use dictionaries in the test. The teacher will take them away.", w: "Students don't have to use dictionaries in the test. The teacher will take them away.", o: ["Students mustn't to use dictionaries in the test. The teacher will take them away."], e: "Die Lehrerin nimmt sie weg, also verboten: „mustn't“." },
      { r: "She doesn't have to work on Sundays.", w: "She hasn't to work on Sundays.", o: ["She doesn't has to work on Sundays."], e: "Die Verneinung von „have to“ wird mit „do/does“ gebildet: „doesn't have to“, danach die Grundform." },
      { r: "He didn't have to pay for the ticket.", w: "He hadn't to pay for the ticket.", o: ["He didn't had to pay for the ticket."], e: "Vergangenheit: „didn't have to“, danach bleibt „have“ in der Grundform." },
      { r: "You don't need to bring a gift.", w: "You don't need bring a gift.", o: ["You needn't to bring a gift."], e: "„don't need“ braucht „to“; „needn't“ steht ohne „to“." },
      { r: "You needn't wait for me.", w: "You needn't to wait for me.", o: ["You needn't waiting for me."], e: "Nach „needn't“ steht die Grundform ohne „to“ (wie bei anderen Modalverben)." },
      { r: "We mustn't be late for the interview.", w: "We don't must be late for the interview.", o: ["We mustn't to be late for the interview."], e: "„must“ wird nicht mit „do“ verneint, sondern direkt: „mustn't“. Danach steht kein „to“." },
      { r: 'Do you have to work this weekend?', w: 'Do you has to work this weekend?', o: ['Do you must work this weekend?'], e: "Die Frage zu „have to“ wird mit „do“ gestellt; nach „do you“ steht die Grundform „have“. „Do you must“ gibt es nicht." },
      { r: "Passengers mustn't leave their bags unattended.", w: "Passengers mustn't to leave their bags unattended.", e: "Nach „mustn't“ steht die Grundform ohne „to“." },
      { r: "I don't have to get up early tomorrow. It's my day off.", w: "I mustn't get up early tomorrow. It's my day off.", o: ["I didn't have to get up early tomorrow. It's my day off."], e: "Am freien Tag ist es nicht nötig: „don't have to“. „mustn't“ wäre ein Verbot, und „didn't have to“ passt nicht zu „tomorrow“." },
      { r: "Cyclists mustn't ride on the pavement. They can get a fine.", w: "Cyclists don't have to ride on the pavement. They can get a fine.", e: "Eine Strafe droht, also ist es verboten: „mustn't“." },
      { r: "Yesterday we didn't have to queue.", w: "Yesterday we didn't must queue.", o: ["Yesterday we hadn't to queue."], e: "„must“ hat keine Vergangenheit. Für „mussten nicht“ nimmst du „didn't have to“." },
    ],
    transform: [
      { s: 'It is forbidden to take photos in the museum.', l: "→ Beginne mit „You“ und nutze „mustn't“", a: ["You mustn't take photos in the museum.", "You can't take photos in the museum."], e: "Verbot: „You mustn't“ + Grundform." },
      { s: "It isn't necessary to book a table.", l: "→ Beginne mit „You“ und nutze „don't have to“", a: ["You don't have to book a table.", "You don't need to book a table.", "You needn't book a table."], e: "Nicht nötig: „don't have to“ (oder „don't need to“ / „needn't“)." },
      { s: 'It was not necessary for me to pay.', l: "→ Beginne mit „I“ und nutze „didn't …“", a: ["I didn't have to pay.", "I didn't need to pay."], e: "Vergangenheit: „didn't have to“. „mustn't“ gibt es nur in der Gegenwart." },
      { s: 'Smoking is not allowed in the restaurant.', l: "→ Beginne mit „You“ und nutze „mustn't“", a: ["You mustn't smoke in the restaurant.", "You can't smoke in the restaurant."], e: "Verbot: „You mustn't smoke“." },
      { s: 'Is it necessary for us to wear helmets?', l: '→ Beginne mit „Do we …“', a: ['Do we have to wear helmets?', 'Do we need to wear helmets?'], e: "Die Frage nach der Pflicht: „Do we have to …?“ (oder „Do we need to …?“)." },
      { s: "Don't run in the corridor!", l: "→ Beginne mit „You“ und nutze „mustn't“", a: ["You mustn't run in the corridor."], e: "Ein Verbot als Aussage: „You mustn't run“." },
      { s: 'It is not necessary for her to come to the meeting.', l: "→ Beginne mit „She“ und nutze „doesn't …“", a: ["She doesn't have to come to the meeting.", "She doesn't need to come to the meeting."], e: "Zu „she“ gehört „doesn't have to“ + Grundform." },
      { s: 'It is forbidden to enter the building without a pass.', l: "→ Beginne mit „You“ und nutze „mustn't“", a: ["You mustn't enter the building without a pass.", "You can't enter the building without a pass."], e: "Verbot: „You mustn't enter“." },
      { s: 'We *had to* leave early yesterday.', l: '→ Verneine: Es war nicht nötig.', a: ["We didn't have to leave early yesterday.", "We didn't need to leave early yesterday."], e: "Vergangenheit verneint: „didn't have to“ + Grundform." },
      { s: 'You *have to* bring a laptop to the course.', l: '→ Verneine: Es ist nicht nötig.', a: ["You don't have to bring a laptop to the course.", "You don't need to bring a laptop to the course.", "You needn't bring a laptop to the course.", "You haven't got to bring a laptop to the course."], e: "Nicht nötig: „don't have to“; „mustn't“ wäre ein Verbot." },
      { s: "The drinks are free, so you *mustn't* pay for them.", l: '→ Korrigiere den Satz.', a: ["The drinks are free, so you don't have to pay for them.", "The drinks are free, so you don't need to pay for them.", "The drinks are free, so you needn't pay for them.", "The drinks are free, so you haven't got to pay for them."], e: "Die Getränke sind gratis: Zahlen ist nicht nötig, aber nicht verboten. Also „don't have to“, nicht „mustn't“." },
    ],
  });
})(globalThis.TT = globalThis.TT || {});
