import test from 'node:test';
import assert from 'node:assert/strict';
import { createVotingOrder } from '../js/voting-order.js';
import { teamVoteScores } from '../js/team-votes.js';

const team = { coeur: 'Présidente test' };
const rows = ['me', 'alice', 'bob', 'claire', 'empty'].map(pid => ({ pid, total: 0 }));
const teams = { me: team, alice: team, bob: team, claire: team, empty: {} };
const context = { pid: 'me', teams, scores: {}, ready: true };
const ids = list => list.map(row => row.pid);
const draw = values => { let i = 0; return () => values[i++]; };

test('only other governments still awaiting this viewer’s vote, including zero as already voted', () => {
  const order = createVotingOrder(() => .5);
  const votes = [{ team: 'alice', voter: 'me', composition: team, rating: 0 },
    { team: 'bob', voter: 'someone-else', composition: team, rating: 3 }];
  const scores = teamVoteScores(teams, votes, 'me');
  assert.deepEqual(ids(order(rows, { ...context, scores })), ['bob', 'claire']);
  assert.deepEqual(order(rows, { ...context, ready: false }), []);
  assert.deepEqual(ids(rows), ['me', 'alice', 'bob', 'claire', 'empty']);
});

test('live scores, row ordering and pagination never reshuffle remaining governments', () => {
  const order = createVotingOrder(draw([.8, .1, .4, .2]));
  const initial = order(rows, context);
  assert.deepEqual(ids(initial), ['bob', 'claire', 'alice']);
  assert.deepEqual(ids(order([...rows].reverse(), { ...context, scores: { alice: { points: 999, rating: null } } })), ids(initial));
  assert.deepEqual(ids(order(rows, context).slice(0, 2)), ['bob', 'claire']);
  const afterVote = { ...context, scores: { bob: { rating: 1 } } };
  assert.deepEqual(ids(order(rows, afterVote)), ['claire', 'alice']);
  assert.deepEqual(ids(order(rows, context)), ids(initial));
  const expanded = order([...rows, { pid: 'new' }], { ...context, teams: { ...teams, new: team } });
  assert.deepEqual(ids(expanded), ['bob', 'new', 'claire', 'alice']);
  assert.deepEqual(ids(expanded.filter(row => row.pid !== 'new')), ids(initial));
});

test('separate sessions and account changes draw independently', () => {
  const first = createVotingOrder(draw([.8, .1, .4]));
  const second = createVotingOrder(draw([.1, .8, .4]));
  assert.notDeepEqual(ids(first(rows, context)), ids(second(rows, context)));
  const shared = createVotingOrder(draw([.8, .1, .4, .1, .8, .4]));
  const candidates = rows.filter(row => row.pid !== 'me');
  assert.notDeepEqual(ids(shared(candidates, context)), ids(shared(candidates, { ...context, pid: 'other' })));
});

test('empty or exhausted voting lists are empty without falling back to already voted rows', () => {
  const order = createVotingOrder(() => .5);
  assert.deepEqual(order(rows, { ...context, scores: { alice: { rating: 1 }, bob: { rating: 2 }, claire: { rating: 3 } } }), []);
  assert.deepEqual(order(rows, { ...context, teams: {} }), []);
});
