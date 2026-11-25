import test from 'node:test';
import assert from 'node:assert/strict';
import { groupsStore, COMMON_GROUP } from '../js/groups.js';
import { normalizeTeam, hasTeam } from '../js/team-state.js';
import { fakeFirestore } from './helpers/fake-firestore.js';

const PRIVATE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const team = normalizeTeam({ coeur: 'Président test', pm: 'Premier ministre test', min: { Justice: 'Ministre test' } });
function setup(saved = {}) {
  const seed = {};
  for (const code of [PRIVATE, COMMON_GROUP]) {
    seed[`groups/${code}`] = { name: code === PRIVATE ? 'Amis' : 'Tous les joueurs', creator: 'vince' };
    for (const pid of ['vince', 'antoine']) seed[`groups/${code}/members/${pid}`] = { pseudo: pid, shared: true, submitted: [] };
  }
  for (const pid of ['vince', 'antoine']) {
    seed[`players/${pid}/settings/groups`] = { groups: { [PRIVATE]: true, [COMMON_GROUP]: true } };
    seed[`pronos/${pid}`] = { weeks: {}, ...saved };
  }
  const fake = fakeFirestore(seed);
  const client = pid => groupsStore({ F: fake.client(pid), db: {}, me: () => ({ pid, pseudo: pid }) });
  return { ...fake, client, groups: client('antoine') };
}
const own = 'pronos/antoine';
const copy = code => `groups/${code}/teams/antoine`;

test('legacy phone government becomes visible to a player outside all private groups', async () => {
  const { groups, data, client } = setup();
  await groups.syncSharedTeam(team, true);
  assert.deepEqual(data.get(own).team, team);
  assert.deepEqual((await client('vince').load(PRIVATE)).teams.antoine, team);
  data.set(`groups/${COMMON_GROUP}/members/outsider`, { pseudo: 'outsider', shared: true, submitted: [] });
  assert.deepEqual((await client('outsider').load(COMMON_GROUP)).teams.antoine, team);
  await assert.rejects(client('outsider').load(PRIVATE), /permission-denied/);
});

test('new device restores the account government; stale local draft cannot overwrite it', async () => {
  const { groups, data } = setup({ team });
  const restored = await groups.syncSharedTeam(normalizeTeam({ pm: 'Ancien' }), true);
  assert.deepEqual(restored, team);
  assert.deepEqual(data.get(copy(PRIVATE)).value, team);
  assert.deepEqual(data.get(copy(COMMON_GROUP)).value, team);
});

test('an old shared copy restores a government absent from both phone and account', async () => {
  const { groups, data } = setup();
  data.set(copy(PRIVATE), { value: team });
  assert.deepEqual(await groups.syncSharedTeam(null, true), team);
  assert.deepEqual(data.get(own).team, team);
  assert.deepEqual(data.get(copy(COMMON_GROUP)).value, team);
});

test('unchanged shared copies survive repeated synchronization', async () => {
  const { groups, data } = setup({ team });
  data.set(copy(PRIVATE), { value: team });
  data.set(copy(COMMON_GROUP), { value: team });
  await groups.syncSharedTeam(null, true);
  await groups.syncSharedTeam(null, true);
  assert.deepEqual(data.get(copy(PRIVATE)).value, team);
  assert.deepEqual(data.get(copy(COMMON_GROUP)).value, team);
});

test('latest account government repairs stale private and public copies', async () => {
  const { groups, data } = setup({ team });
  for (const code of [PRIVATE, COMMON_GROUP]) data.set(copy(code), { value: normalizeTeam({ pm: 'Ancien' }) });
  await groups.syncSharedTeam(null, true);
  for (const code of [PRIVATE, COMMON_GROUP]) assert.deepEqual(data.get(copy(code)).value, team);
});

test('offline edit can be retried and replaces the old account and group values', async () => {
  const { groups, data, setOffline } = setup({ team });
  const edited = normalizeTeam({ ...team, pm: 'Nouveau' });
  setOffline(true);
  await assert.rejects(groups.syncSharedTeam(edited, false), /offline/);
  assert.deepEqual(data.get(own).team, team);
  setOffline(false);
  await groups.syncSharedTeam(edited, false);
  assert.deepEqual(data.get(own).team, edited);
  assert.deepEqual(data.get(copy(PRIVATE)).value, edited);
});

test('explicit clearing survives stale devices without resurrecting a deleted government', async () => {
  const { groups, data } = setup({ team });
  for (const code of [PRIVATE, COMMON_GROUP]) data.set(copy(code), { value: team });
  await groups.syncSharedTeam(null, false);
  assert.equal(data.get(own).team, null);
  assert.equal(await groups.syncSharedTeam(team, true), null);
  for (const code of [PRIVATE, COMMON_GROUP]) assert.equal(data.has(copy(code)), false);
});

test('empty fresh device does not prevent later migration from the old phone', async () => {
  const { groups, data } = setup();
  await groups.syncSharedTeam(null, true);
  assert.equal(Object.hasOwn(data.get(own), 'team'), false);
  assert.equal(data.has(copy(COMMON_GROUP)), false);
  await groups.syncSharedTeam(team, true);
  assert.deepEqual(data.get(own).team, team);
});

test('new private group receives the existing government automatically', async () => {
  const { groups, data } = setup({ team });
  data.set(`groups/${OTHER}`, { name: 'Autres amis', creator: 'vince' });
  data.set(`groups/${OTHER}/members/antoine`, { pseudo: 'antoine', shared: true, submitted: [] });
  data.get('players/antoine/settings/groups').groups[OTHER] = false;
  await groups.syncSharedTeam(null, true);
  assert.deepEqual(data.get(copy(OTHER)).value, team);
});

test('a first partial edit is shared even when the author belongs to no private group', async () => {
  const { groups, data } = setup();
  delete data.get('players/antoine/settings/groups').groups[PRIVATE];
  data.delete(`groups/${PRIVATE}/members/antoine`);
  const partial = normalizeTeam({ pm: 'Nouveau' });
  await groups.syncSharedTeam(partial, false);
  assert.deepEqual(data.get(copy(COMMON_GROUP)).value, partial);
  assert.equal(data.has(copy(PRIVATE)), false);
});

test('a second member sees government updates through the listener and can unsubscribe', async () => {
  const { groups, client, listenerCount } = setup();
  const seen = [];
  const stop = client('vince').watchTeams(COMMON_GROUP, teams => seen.push(teams));
  await groups.syncSharedTeam(team, false);
  await new Promise(resolve => queueMicrotask(resolve));
  assert.deepEqual(seen.at(-1).antoine, team);
  stop();
  assert.equal(listenerCount(), 0);
});

test('partial joker input and partial legacy government keep their text', async () => {
  const { groups, data } = setup();
  assert.equal(hasTeam({ jl: 'Culture' }), true);
  await groups.syncSharedTeam({ jl: 'Culture' }, false);
  assert.deepEqual(data.get(own).team, normalizeTeam({ jl: 'Culture' }));
});
