import test from 'node:test';
import assert from 'node:assert/strict';
import { groupsStore, COMMON_GROUP, visibleGameData } from '../js/groups.js';
import { normalizeTeam, hasTeam } from '../js/team-state.js';
import { fakeFirestore } from './helpers/fake-firestore.js';

const PRIVATE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const team = normalizeTeam({ coeur: 'Président test', pm: 'Premier ministre test', min: { Justice: 'Ministre test' } });
function setup(saved = {}, publicGames = false) {
  const seed = {};
  for (const code of [PRIVATE, COMMON_GROUP]) {
    seed[`groups/${code}`] = { name: code === PRIVATE ? 'Amis' : 'Tous les joueurs', creator: 'vince' };
    for (const pid of ['vince', 'antoine']) seed[`groups/${code}/members/${pid}`] = { pseudo: pid, shared: true, submitted: [] };
  }
  for (const pid of ['vince', 'antoine']) {
    seed[`players/${pid}/settings/groups`] = { groups: { [PRIVATE]: true, [COMMON_GROUP]: true } };
    seed[`pronos/${pid}`] = { weeks: {}, ...saved };
  }
  const fake = fakeFirestore(seed, { publicGames });
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


test('les anciens pronos privés sont lisibles sans retour de leur auteur', async () => {
  const { groups, data } = setup({}, true);
  data.set('pronos/ancien', { weeks: {}, l1: ['lepen'], history: { l1: { '2026-10': ['glucksmann'] } }, team });
  const loaded = await groups.load(COMMON_GROUP);
  loaded.players.ancien = { pseudo: 'Ancien' };
  const visible = visibleGameData(loaded);
  assert.deepEqual(visible.pronos.ancien.l1, ['lepen']);
  assert.deepEqual(visible.pronos.ancien.history.l1['2026-10'], ['glucksmann']);
  assert.deepEqual(visible.teams.ancien, team);
});

test('un ancien réglage fermé n’empêche plus la publication du prochain prono', async () => {
  const { groups, data } = setup();
  data.get('players/antoine/settings/groups').groups[PRIVATE] = false;
  await groups.writeProno(own, { l1: ['lepen'] }, null, null, '2026-11');
  assert.deepEqual(data.get('groups/' + PRIVATE + '/l1/antoine').value, ['lepen']);
  assert.equal(data.get('groups/' + PRIVATE + '/members/antoine').shared, true);
  assert.equal(Object.hasOwn(data.get(own), 'team'), false);
});

test('le classement d’un groupe utilise uniquement les pronos de ses membres', async () => {
  const { groups, data } = setup({ l1: ['lepen'] }, true);
  data.set('pronos/exterieur', { l1: ['glucksmann'] });
  const visible = visibleGameData(await groups.load(PRIVATE));
  assert.deepEqual(Object.keys(visible.pronos).sort(), ['antoine', 'vince']);
});

test('la connexion republie toutes les étapes et leurs photos mensuelles', async () => {
  const saved = { l1: ['lepen'], l2: ['glucksmann'], history: { l1: { '2026-10': ['lepen'] } } };
  const { groups, data } = setup(saved);
  data.get('players/antoine/settings/groups').groups[PRIVATE] = false;
  await groups.ensureCommonGroup();
  for (const code of [PRIVATE, COMMON_GROUP]) {
    assert.deepEqual(data.get('groups/' + code + '/l1/antoine').history, saved.history.l1);
    assert.deepEqual(data.get('groups/' + code + '/l2/antoine').value, saved.l2);
  }
});

test('les copies disponibles fonctionnent avant la publication des règles', async () => {
  const { groups, data } = setup();
  data.set('groups/' + COMMON_GROUP + '/l1/antoine', { value: ['lepen'] });
  const loaded = await groups.load(COMMON_GROUP);
  assert.equal(loaded.canonical, null);
  assert.deepEqual(visibleGameData(loaded).pronos.antoine.l1, ['lepen']);
});

test('le compte prévaut sur une copie ancienne, y compris après effacement', async () => {
  const { groups, data } = setup({ team: null, l1: ['glucksmann'] }, true);
  data.set(copy(COMMON_GROUP), { value: team });
  data.set('groups/' + COMMON_GROUP + '/l1/antoine', { value: ['lepen'] });
  const visible = visibleGameData(await groups.load(COMMON_GROUP));
  assert.equal(visible.teams.antoine, undefined);
  assert.deepEqual(visible.pronos.antoine.l1, ['glucksmann']);
});

test('les lecteurs voient les mises à jour sans pouvoir modifier le compte d’un autre', async () => {
  const { groups, client, data } = setup({}, true);
  const seen = [];
  const stop = client('vince').watchPronos(pronos => seen.push(pronos));
  await groups.writeProno(own, { l1: ['lepen'] }, null, null, '2026-11');
  await new Promise(resolve => queueMicrotask(resolve));
  assert.deepEqual(seen.at(-1).antoine.l1, ['lepen']);
  await assert.rejects(client('vince').writeProno(own, { l1: ['glucksmann'] }, null, null, '2026-11'), /permission-denied/);
  assert.deepEqual(data.get(own).l1, ['lepen']);
  stop();
});
