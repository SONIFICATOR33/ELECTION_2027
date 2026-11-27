import { POSTES } from '../js/data.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createVotingOrder } from '../js/voting-order.js';
import { teamVoteScores } from '../js/team-votes.js';

const team = { coeur: 'Présidente test', pm: 'Premier ministre test', min: Object.fromEntries(POSTES.map(p=>[p,'Ministre test'])) };
const rows = ['me', 'alice', 'bob', 'claire', 'empty'].map(pid => ({ pid, total: 0 }));
const teams = { me: team, alice: team, bob: team, claire: team, empty: {} };
const context = { pid: 'me', teams, scores: {}, ready: true };
const ids = list => list.map(row => row.pid);
const draw = values => { let i = 0; return () => values[i++]; };

test('all players remain visible, with unvoted governments first and zero treated as already voted', () => {
  const order = createVotingOrder(() => .5);
  const votes = [{ team: 'alice', voter: 'me', composition: team, rating: 0 },
    { team: 'bob', voter: 'someone-else', composition: team, rating: 3 }];
  const scores = teamVoteScores(teams, votes, 'me');
  assert.deepEqual(ids(order(rows, { ...context, scores })), ['bob', 'claire', 'alice', 'empty', 'me']);
  assert.deepEqual(ids(order(rows, { ...context, ready: false })), ['alice', 'bob', 'claire', 'empty', 'me']);
  assert.deepEqual(ids(rows), ['me', 'alice', 'bob', 'claire', 'empty']);
});

test('live scores, row ordering and pagination preserve random order within each priority group', () => {
  const order = createVotingOrder(draw([.9, .8, .1, .4, .7, .2]));
  const initial = order(rows, context);
  assert.deepEqual(ids(initial), ['bob', 'claire', 'alice', 'empty', 'me']);
  assert.deepEqual(ids(order([...rows].reverse(), { ...context, scores: { alice: { points: 999, rating: null } } })), ids(initial));
  assert.deepEqual(ids(order(rows, context).slice(0, 2)), ['bob', 'claire']);
  const afterVote = { ...context, scores: { bob: { rating: 1 } } };
  assert.deepEqual(ids(order(rows, afterVote)), ['claire', 'alice', 'bob', 'empty', 'me']);
  assert.deepEqual(ids(order(rows, context)), ids(initial));
  const expanded = order([...rows, { pid: 'new' }], { ...context, teams: { ...teams, new: team } });
  assert.deepEqual(ids(expanded), ['bob', 'new', 'claire', 'alice', 'empty', 'me']);
  assert.deepEqual(ids(expanded.filter(row => row.pid !== 'new')), ids(initial));
});

test('separate sessions and account changes draw independently', () => {
  const first = createVotingOrder(draw([.9, .8, .1, .4, .7]));
  const second = createVotingOrder(draw([.9, .1, .8, .4, .7]));
  assert.notDeepEqual(ids(first(rows, context)), ids(second(rows, context)));
  const shared = createVotingOrder(draw([.8, .1, .4, .7, .1, .8, .4, .7]));
  const candidates = rows.filter(row => row.pid !== 'me');
  assert.notDeepEqual(ids(shared(candidates, context)), ids(shared(candidates, { ...context, pid: 'other' })));
});

test('exhausted votes and no governments still show every player exactly once', () => {
  const order = createVotingOrder(() => .5);
  const all = ['alice', 'bob', 'claire', 'empty', 'me'];
  assert.deepEqual(ids(order(rows, { ...context, scores: { alice: { rating: 1 }, bob: { rating: 2 }, claire: { rating: 3 } } })), all);
  assert.deepEqual(ids(order(rows, { ...context, teams: {} })), all);
  assert.deepEqual(order([], context), []);
  assert.deepEqual(ids(order([rows[0]], context)), ['me']);
});

test('loading or unavailable votes never blank the list, and loading completion retains all rows', () => {
  const order = createVotingOrder(draw([.9, .8, .1, .4, .7]));
  const pending = { ...context, ready: false };
  assert.deepEqual(ids(order(rows, pending)), ['bob', 'claire', 'empty', 'alice', 'me']);
  assert.deepEqual(ids(order(rows, context)), ['bob', 'claire', 'alice', 'empty', 'me']);
  assert.deepEqual(ids(order(rows, pending)), ['bob', 'claire', 'empty', 'alice', 'me']);
  assert.equal(new Set(ids(order(rows, context))).size, rows.length);
});

test('discovery excludes own, empty and already rated governments including zero', async () => {
  const { unvotedGovernments } = await import('../js/voting-order.js');
  const state = { ...context, scores: { alice: { rating: 0 }, bob: { rating: 3 } } };
  assert.deepEqual(ids(unvotedGovernments(rows, state)), ['claire']);
  assert.deepEqual(unvotedGovernments(rows, { ...state, ready: false }), []);
  assert.deepEqual(unvotedGovernments(rows, { ...state, scores: { ...state.scores, claire: { rating: 1 } } }), []);
});

test('discovery keeps a random stable order and advances once after each recorded vote', async () => {
  const { unvotedGovernments } = await import('../js/voting-order.js');
  const order = createVotingOrder(draw([.9, .8, .1, .4, .7]));
  const state = { ...context, scores: {} };
  const sequence = [];
  for (;;) {
    const next = unvotedGovernments(order(rows, state), state)[0];
    if (!next) break;
    sequence.push(next.pid);
    state.scores[next.pid] = { rating: 0 };
  }
  assert.deepEqual(sequence, ['bob', 'claire', 'alice']);
});

test('next card advances on skip, wraps, and never returns the current card alone', async () => {
  const { nextUnvotedGovernment } = await import('../js/voting-order.js');
  const queue = ['alice', 'bob', 'claire'].map(pid => ({ pid }));
  assert.equal(nextUnvotedGovernment(queue)?.pid, 'alice');
  assert.equal(nextUnvotedGovernment(queue, 'alice')?.pid, 'bob');
  assert.equal(nextUnvotedGovernment(queue, 'bob')?.pid, 'claire');
  assert.equal(nextUnvotedGovernment(queue, 'claire')?.pid, 'alice');
  assert.equal(nextUnvotedGovernment(queue.slice(1), 'alice')?.pid, 'bob');
  assert.equal(nextUnvotedGovernment([queue[0]], 'alice'), null);
  assert.equal(nextUnvotedGovernment([], 'alice'), null);
});
