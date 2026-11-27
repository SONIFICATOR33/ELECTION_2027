import test from 'node:test';
import assert from 'node:assert/strict';
import { homeCalendar } from '../js/home-calendar.js';
import { T0, LOCK1, RES1, LOCK2, RES2, LOCKGP, TOUR1, TOUR2 } from '../js/data.js';

test('home starts at stage one and links the next deadline to its saved completion', () => {
  const result = homeCalendar(+T0, {});
  assert.equal(result.current, 1);
  assert.equal(+result.next.date, +LOCK1);
  assert.equal(result.next.stage, 1);
  assert.equal(result.stages[0].complete, false);
  assert.equal(homeCalendar(+T0, { l1: true }).stages[0].complete, true);
  assert.equal(homeCalendar(+T0, { l1: true }).current, 1);
  assert.deepEqual(result.stages.map(s => s.anchor), ['st1','st2','st3','st4']);
});

test('timeline tracks calendar phases separately from completion and closure', () => {
  assert.equal(homeCalendar(+LOCK1, {}).current, 1);
  assert.equal(+homeCalendar(+LOCK1, {}).next.date, +RES1);
  assert.equal(homeCalendar(+RES1, {}).current, 2);
  assert.equal(+homeCalendar(+RES1, {}).next.date, +LOCK2);
  assert.equal(homeCalendar(+RES2, {}).current, 3);
  assert.equal(+homeCalendar(+RES2, {}).next.date, +LOCKGP);
  assert.equal(homeCalendar(+TOUR1, {}).current, 4);
  assert.equal(+homeCalendar(+TOUR1, {}).next.date, +TOUR2);
  assert.equal(homeCalendar(+TOUR2, {}).next, null);
  assert.equal(homeCalendar(+TOUR2, {}).current, undefined);
});

test('finale closes with top five and provisional signatures deadline stays explicit', () => {
  const result = homeCalendar(+T0, { gp: true });
  assert.equal(result.stages[1].provisional, true);
  assert.equal(+result.stages[2].lock, +result.stages[3].lock);
  assert.equal(result.stages[2].complete, true);
  assert.equal(result.stages[3].complete, true);
});
