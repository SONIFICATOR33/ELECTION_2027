import test from 'node:test';
import assert from 'node:assert/strict';
import { homeCalendar } from '../js/home-calendar.js';
import { T0, LOCK1, LOCK2, LOCKGP } from '../js/data.js';
test('the next action follows saved progress, not the next calendar date', () => {
 assert.equal(homeCalendar(+T0, {}).current,1);
 assert.equal(homeCalendar(+T0,{l1:true}).current,2);
 assert.equal(homeCalendar(+T0,{l1:true,l2:true}).current,3);
 assert.equal(homeCalendar(+T0,{l1:true,l2:true,gp:true}).next,null);
 assert.deepEqual(homeCalendar(+T0,{}).stages.map(s=>s.anchor),['st1','st2','st3']);
});
test('closed missed steps are never offered as playable', () => {
 assert.equal(homeCalendar(+LOCK1,{}).current,2);
 assert.equal(homeCalendar(+LOCK2,{}).current,3);
 assert.equal(homeCalendar(+LOCKGP,{}).next,null);
});
