import test from 'node:test';
import assert from 'node:assert/strict';
import { teamVotesStore, teamVoteScores } from '../js/team-votes.js';
import { normalizeTeam } from '../js/team-state.js';
import { fakeFirestore } from './helpers/fake-firestore.js';

const composition = normalizeTeam({ coeur: 'Présidente test', pm: 'Premier ministre test' });
function setup() {
  const db = fakeFirestore({ 'pronos/alice': { team: composition } }, { publicGames: true });
  const client = voter => teamVotesStore({ F: db.client(voter), db: null, me: () => ({ pid: voter }) });
  const votes = () => [...db.data.entries()].filter(([key]) => key.startsWith('teamVotes/')).map(([, vote]) => vote);
  return { ...db, client, votes };
}

test('un soutien reste unique entre deux appareils et peut être retiré', async () => {
  const { client, votes } = setup();
  await Promise.all([client('bob').setTeamVote('alice', composition, true), client('bob').setTeamVote('alice', composition, true)]);
  assert.equal(votes().length, 1);
  assert.deepEqual(teamVoteScores({ alice: composition }, votes(), 'bob').alice, { points: 1, supported: true });
  await client('bob').setTeamVote('alice', composition, false);
  assert.deepEqual(votes(), []);
});

test('les soutiens sont communs aux groupes et ne nécessitent pas de gouvernement du votant', async () => {
  const { client, votes } = setup();
  await client('bob').setTeamVote('alice', composition, true);
  await client('claire').setTeamVote('alice', composition, true);
  assert.equal(teamVoteScores({ alice: composition }, votes(), 'alice').alice.points, 2);
  assert.equal(teamVoteScores({}, votes(), 'bob').alice, undefined);
});

test('pas de vote pour soi, une composition disparue ou une fiche périmée', async () => {
  const { client, data, votes } = setup();
  await assert.rejects(client('alice').setTeamVote('alice', composition, true));
  data.set('pronos/alice', { team: normalizeTeam({ coeur: 'Une autre présidente' }) });
  await assert.rejects(client('bob').setTeamVote('alice', composition, true), /changé/);
  data.set('pronos/alice', { team: null });
  await assert.rejects(client('bob').setTeamVote('alice', composition, true));
  assert.equal(votes().length, 0);
});

test('un changement de composition rend les anciens soutiens caducs jusqu’au nouveau vote', async () => {
  const { client, data, votes } = setup();
  await client('bob').setTeamVote('alice', composition, true);
  const next = normalizeTeam({ ...composition, pm: 'Autre ministre' });
  data.set('pronos/alice', { team: next });
  assert.equal(teamVoteScores({ alice: next }, votes(), 'bob').alice, undefined);
  await client('bob').setTeamVote('alice', next, true);
  assert.equal(votes().length, 1);
  assert.equal(teamVoteScores({ alice: next }, votes(), 'bob').alice.points, 1);
  assert.equal(teamVoteScores({ alice: null }, votes(), 'bob').alice, undefined);
});

test('échec réseau : aucun point fictif, et les abonnements sont nettoyés', async () => {
  const { client, votes, setOffline, listenerCount } = setup();
  const seen = [];
  const stop = client('bob').watchVotes(value => seen.push(value));
  await client('bob').setTeamVote('alice', composition, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(seen.at(-1).length, 1);
  stop();
  assert.equal(listenerCount(), 0);
  setOffline(true);
  await assert.rejects(client('claire').setTeamVote('alice', composition, true));
  assert.equal(votes().length, 1);
});
