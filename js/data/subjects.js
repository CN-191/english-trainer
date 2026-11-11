(function (TT) {
  'use strict';

  const S = (text, person, number) => ({ text, person, number });

  const SUBJECTS = [
    S('I', 1, 'sg'), S('you', 2, 'sg'), S('he', 3, 'sg'), S('she', 3, 'sg'), S('we', 1, 'pl'), S('they', 3, 'pl'),
    S('Tom', 3, 'sg'), S('Anna', 3, 'sg'), S('Lisa', 3, 'sg'), S('Ben', 3, 'sg'), S('Sophie', 3, 'sg'),
    S('Jack', 3, 'sg'), S('Emma', 3, 'sg'), S('David', 3, 'sg'), S('Mia', 3, 'sg'), S('Leon', 3, 'sg'),
    S('Mr Brown', 3, 'sg'), S('Mrs Patel', 3, 'sg'), S('Dr Green', 3, 'sg'), S('Lucy', 3, 'sg'), S('Sam', 3, 'sg'),
    S('Tom and Anna', 3, 'pl'), S('Lisa and Ben', 3, 'pl'),
    S('my sister', 3, 'sg'), S('my brother', 3, 'sg'), S('our teacher', 3, 'sg'), S('the manager', 3, 'sg'),
    S('my best friend', 3, 'sg'), S('my neighbour', 3, 'sg'), S('my cousin', 3, 'sg'), S('the new student', 3, 'sg'),
    S('my grandmother', 3, 'sg'), S('our boss', 3, 'sg'), S('the doctor', 3, 'sg'),
    S('my parents', 3, 'pl'), S('the kids', 3, 'pl'), S('our neighbours', 3, 'pl'), S('the students', 3, 'pl'),
    S('my colleagues', 3, 'pl'), S('my friends', 3, 'pl'), S('the twins', 3, 'pl'),
  ];

  const BY_TEXT = {};
  for (const s of SUBJECTS) BY_TEXT[s.text.toLowerCase()] = s;

  TT.SUBJECTS = SUBJECTS;
  TT.findSubject = (text) => BY_TEXT[String(text).toLowerCase()];
})(globalThis.TT = globalThis.TT || {});
