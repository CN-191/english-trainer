(function (TT) {
  'use strict';

  // Zeitangaben für Vorlagen. Schlüssel werden in Vorlagen als {NAME} verwendet.
  const SLOTS = {
    EVERY: ['every day', 'every morning', 'every weekend', 'on Mondays', 'twice a week', 'once a week', 'every Saturday'],
    FREQ: ['always', 'usually', 'often', 'sometimes'],
    NOW: ['right now', 'at the moment', 'now'],
    LOOK: ['Look!', 'Look over there!', 'Quick, look!'],
    LISTEN: ['Listen!', 'Can you hear that?', 'Shh, listen!'],
    PERIOD: ['this week', 'this month', 'at the moment'],
    PAST: ['yesterday', 'last night', 'last week', 'two days ago', 'on Monday', 'a week ago', 'last weekend', 'yesterday morning'],
    PAST_DAY: ['yesterday', 'last night', 'on Monday', 'on Saturday'],
    LONG_AGO: ['A few years ago', 'In 2019', 'Ten years ago'],
    AT_PAST: ["at 8 o'clock yesterday evening", 'at this time yesterday', 'at midnight last night', 'at 6 am this morning'],
    SINCE_SHORT: ['this morning', "9 o'clock", 'lunchtime', 'breakfast'],
    SINCE_LONG: ['2019', 'last summer', 'January', '2015', 'Christmas'],
    FOR_SHORT: ['two hours', 'twenty minutes', 'an hour', 'half an hour', 'three hours'],
    FOR_LONG: ['years', 'a long time', 'five years', 'ages', 'ten years'],
    FUTURE: ['tomorrow', 'next week', 'on Saturday', 'soon', 'on Sunday', 'this weekend'],
    AT_FUTURE: ['this time tomorrow', "at 8 o'clock tomorrow evening", 'this time next week', 'at noon on Saturday'],
    BY_FUTURE: ['by tonight', 'by tomorrow', 'by 6 pm tomorrow', 'by next Friday', 'by tomorrow morning'],
    BY_POINT: ['By 6 pm tomorrow', 'By tomorrow evening', 'By lunchtime tomorrow', 'By 10 am tomorrow'],
    BY_LONG: ['By next summer', 'By 2030', 'By the end of next year', 'By next spring'],
    TIMES: ['twice', 'three times', 'several times', 'four times'],
  };

  const S = (text, person, number) => ({ text, person, number });
  const UNCLE = S('my uncle', 3, 'sg');
  const AUNT = S('my aunt', 3, 'sg');
  const GRANDPA = S('my grandfather', 3, 'sg');

  // Nebensatz-Bausteine. Feste Subjekte, die nicht in TT.SUBJECTS vorkommen,
  // damit Haupt- und Nebensatz nie dasselbe Subjekt doppelt nennen.
  const SECONDARY = {
    // kurze, abgeschlossene Ereignisse (für Simple Past / Present Perfect in Nebensätzen)
    events: [
      { subject: S('the phone', 3, 'sg'), verb: 'ring', object: '' },
      { subject: S('the doorbell', 3, 'sg'), verb: 'ring', object: '' },
      { subject: UNCLE, verb: 'arrive', object: '' },
      { subject: AUNT, verb: 'come', object: 'home' },
      { subject: S('it', 3, 'sg'), verb: 'start', object: 'to rain' },
      { subject: S('the lights', 3, 'pl'), verb: 'go', object: 'out' },
      { subject: S('the alarm', 3, 'sg'), verb: 'go', object: 'off' },
      { subject: GRANDPA, verb: 'call', object: '' },
      { subject: UNCLE, verb: 'walk in', object: '' },
      { subject: S('the taxi', 3, 'sg'), verb: 'arrive', object: '' },
      { subject: S('the guests', 3, 'pl'), verb: 'arrive', object: '' },
      { subject: AUNT, verb: 'get', object: 'home' },
      { subject: S('someone', 3, 'sg'), verb: 'knock', object: 'on the door' },
    ],
    // länger andauernde Handlungen (für while + Past Progressive)
    actions: [
      { subject: UNCLE, verb: 'cook', object: 'dinner' },
      { subject: AUNT, verb: 'watch', object: 'TV' },
      { subject: GRANDPA, verb: 'read', object: 'the newspaper' },
      { subject: UNCLE, verb: 'walk', object: 'home' },
      { subject: S('I', 1, 'sg'), verb: 'wait', object: 'for the bus' },
      { subject: AUNT, verb: 'drive', object: 'to work' },
      { subject: UNCLE, verb: 'have', object: 'a shower' },
      { subject: GRANDPA, verb: 'tidy', object: 'the kitchen' },
    ],
    // Bedingungen im Simple Present (für if-Sätze mit will-Future); passen zu jeder geplanten Handlung
    conditions: [
      { subject: S('nothing', 3, 'sg'), verb: 'go', object: 'wrong' },
      { subject: S('everything', 3, 'sg'), verb: 'go', object: 'to plan' },
      { subject: S('everything', 3, 'sg'), verb: 'go', object: 'well' },
      { subject: S('all', 3, 'sg'), verb: 'go', object: 'well' },
      { subject: S('things', 3, 'pl'), verb: 'go', object: 'well' },
      { subject: S('the plan', 3, 'sg'), verb: 'work', object: '' },
    ],
  };

  TT.SLOTS = SLOTS;
  TT.SECONDARY = SECONDARY;
})(globalThis.TT = globalThis.TT || {});
