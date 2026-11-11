test('Zeitstrahl für alle 12 Zeitformen', () => {
  for (const id of TT.TENSE_IDS) {
    const svg = TT.timelineSvg(id);
    assert.ok(svg.startsWith('<svg'), id);
    assert.ok(svg.includes('aria-label="Zeitstrahl ' + TT.tense(id).name + '"'), id);
    assert.ok(svg.includes('jetzt'), id);
  }
});

test('Simple Present zeigt wiederholte Punkte, Past Perfect einen Bezugspunkt', () => {
  assert.strictEqual((TT.timelineSvg('present-simple').match(/<circle/g) || []).length, 9);
  assert.ok(TT.timelineSvg('past-perfect').includes('class="ref"'));
  assert.ok(TT.timelineSvg('present-perfect-progressive').includes('<rect'));
});
