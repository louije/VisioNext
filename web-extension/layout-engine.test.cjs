// Unit tests for the pure layout decision. Run: node --test
const { test } = require('node:test');
const assert = require('node:assert');
const { decideLayout } = require('./layout-engine.js');

const AREA = { areaW: 1600, areaH: 900 }; // 16:9 focus area

test('wide content (bars top/bottom) -> strip below', () => {
  // content wider than the 16:9 area (e.g. an ultrawide 21:9 window)
  const d = decideLayout({ ...AREA, contentAR: 21 / 9, count: 3 });
  assert.equal(d.place, 'below');
});

test('tall/narrow content (bars left/right) -> strip on side', () => {
  // a portrait window shared into a landscape area
  const d = decideLayout({ ...AREA, contentAR: 3 / 4, count: 3 });
  assert.equal(d.place, 'side');
});

test('content matching the area still picks a side by the >= rule', () => {
  const d = decideLayout({ ...AREA, contentAR: 16 / 9, count: 2 });
  assert.equal(d.place, 'below'); // cAR >= areaAR
});

test('unknown content aspect ratio defaults to side, one line', () => {
  const d = decideLayout({ ...AREA, contentAR: null, count: 2 });
  assert.equal(d.place, 'side');
  assert.equal(d.lines, 1);
});

test('few participants -> a single line', () => {
  const d = decideLayout({ ...AREA, contentAR: 3 / 4, count: 2 });
  assert.equal(d.lines, 1);
});

test('many participants -> caps at two lines, never more', () => {
  const d = decideLayout({ ...AREA, contentAR: 3 / 4, count: 50 });
  assert.equal(d.lines, 2);
});

test('strip never exceeds maxFraction of the area', () => {
  const side = decideLayout({ ...AREA, contentAR: 3 / 4, count: 50, maxFraction: 0.35 });
  assert.ok(side.strip <= Math.round(0.35 * AREA.areaW), `side strip ${side.strip}`);
  const below = decideLayout({ ...AREA, contentAR: 21 / 9, count: 50, maxFraction: 0.35 });
  assert.ok(below.strip <= Math.round(0.35 * AREA.areaH), `below strip ${below.strip}`);
});

test('strip is at least one min-tile wide/tall for legibility', () => {
  // narrow content with tiny bar slack: strip must still fit a min tile
  const d = decideLayout({ ...AREA, contentAR: 1.7, count: 2, minTileW: 132 });
  assert.ok(d.strip >= 132, `strip ${d.strip} should be >= one min tile`);
});
