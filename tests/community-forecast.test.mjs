import test from 'node:test';
import assert from 'node:assert/strict';
import { firstRoundForecast } from '../js/community-forecast.js';

const candidates = Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f'].map(id => [id, { p: 'Candidat', n: id }]));
const ballot = (scores, pres = 'a') => ({ pres, top: Object.entries(scores).map(([id, pct]) => ({ id, pct })), win: 52 });
const first = ballot({ a: 30, b: 20, c: 15, d: 10, e: 5 });
const second = ballot({ a: 20, b: 30, c: 10, d: 15, f: 10 });
const saved = value => ({ weeks: { 0: value } });

test('one latest recorded top 5 per player, equal weight, no weekly accumulation', () => {
  const result = firstRoundForecast({ one: { weeks: { 0: second, 2: first } }, two: saved(second), empty: {} }, candidates);
  assert.equal(result.participants, 2);
  const scores = Object.fromEntries(result.rows.map(row => [row.id, row.pct]));
  assert.deepEqual(scores, { a: 25, b: 25, c: 12.5, d: 12.5, f: 5, e: 2.5 });
  assert.equal(result.rows.reduce((sum, row) => sum + row.pct, 0), 82.5);
  assert.deepEqual(result.rows.slice(0, 3).map(row => [row.id, row.rank]), [['a', 1], ['b', 1], ['c', 3]]);
});

test('candidate absent from a top 5 contributes zero, not an inflated conditional mean', () => {
  const result = firstRoundForecast({ one: saved(first), two: saved(second) }, candidates);
  assert.equal(result.rows.find(row => row.id === 'e').pct, 2.5);
  assert.equal(result.rows.find(row => row.id === 'f').pct, 5);
});

test('malformed, partial, unknown, duplicate and impossible predictions do not count', () => {
  const invalid = [
    { pres: 'a' }, { pres: 'a', top: first.top.slice(0, 4) },
    ballot({ a: 61, b: 10, c: 5, d: 5, e: 5 }),
    ballot({ a: 50, b: 30, c: 20, d: 10, e: 5 }),
    ballot({ a: 0, b: 0, c: 0, d: 0, e: 0 }),
    ballot({ a: -1, b: 20, c: 15, d: 10, e: 5 }),
    ballot({ a: 30, b: 20, c: 15, d: 10, unknown: 5 }),
    { ...first, top: [first.top[0], ...first.top.slice(0, 4)] },
    { ...first, top: [null, ...first.top.slice(0, 4)] },
    ballot({ a: '30', b: 20, c: 15, d: 10, e: 5 }),
  ];
  const pronos = Object.fromEntries(invalid.map((b, i) => [i, saved(b)]));
  assert.deepEqual(firstRoundForecast(pronos, candidates), { participants: 0, rows: [] });
});

test('initially empty state and updates use only actual saved values', () => {
  assert.deepEqual(firstRoundForecast({}, candidates), { participants: 0, rows: [] });
  const pronos = { one: saved(first) };
  assert.equal(firstRoundForecast(pronos, candidates).rows[0].pct, 30);
  pronos.one.weeks[1] = second;
  assert.equal(firstRoundForecast(pronos, candidates).rows[0].id, 'b');
  assert.equal(firstRoundForecast(pronos, candidates).participants, 1);
});
