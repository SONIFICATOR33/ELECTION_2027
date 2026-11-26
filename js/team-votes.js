import { hasTeam, normalizeTeam, sameTeam } from './team-state.js';

// Un bulletin par couple gouvernement / votant, commun à tous les groupes.
export function teamVotesStore({ F, db, me }) {
  function ballotFor(team) {
    const voter = me()?.pid;
    if (!voter) throw new Error('Connecte-toi pour voter.');
    if (team === voter) throw new Error('Tu peux voter pour les gouvernements des autres joueurs.');
    return { voter, ref: F.doc(db, 'teamVotes', team + '~' + voter) };
  }

  return {
    watchVotes(update, fail) {
      return F.onSnapshot(F.collection(db, 'teamVotes'), { includeMetadataChanges: true }, snapshot => {
        if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
          update(snapshot.docs.map(doc => doc.data()));
        }
      }, fail);
    },
    async setTeamVote(team, composition, rating) {
      const { voter, ref } = ballotFor(team);
      if (!Number.isInteger(rating) || rating < 0 || rating > 3) throw new Error('Choisis 0, 1, 2 ou 3 pouces.');
      return F.runTransaction(db, async tx => {
        const saved = await tx.get(F.doc(db, 'pronos', team));
        let current = saved.data()?.team;
        if (!Object.hasOwn(saved.data() || {}, 'team')) {
          const legacy = await tx.get(F.doc(db, 'groups', 'e1ec7100202700000000000000000001', 'teams', team));
          current = legacy.data()?.value;
        }
        if (!hasTeam(current) || !sameTeam(current, composition)) {
          throw new Error('Ce gouvernement a changé. Rouvre sa fiche avant de voter.');
        }
        const ballot = { team, voter, rating, composition: normalizeTeam(current) };
        tx.set(ref, { ...ballot, createdAt: F.serverTimestamp() });
        return ballot;
      });
    },
    async removeTeamVote(team) {
      const { ref } = ballotFor(team);
      await F.deleteDoc(ref);
    }
  };
}

// Une modification de composition rend les anciens bulletins caducs.
export function teamVoteScores(teams, votes, viewer) {
  const scores = Object.create(null), seen = new Set();
  for (const vote of votes) {
    // Les premiers likes, s'il y en a, conservent leur point.
    const rating = Object.hasOwn(vote, 'rating') ? vote.rating : 1;
    const key = vote.team + '~' + vote.voter;
    if (!Number.isInteger(rating) || rating < 0 || rating > 3
      || vote.team === vote.voter || seen.has(key) || !hasTeam(teams[vote.team])
      || !sameTeam(teams[vote.team], vote.composition)) continue;
    seen.add(key);
    const score = scores[vote.team] ||= { points: 0, voters: 0, rating: null };
    score.points += rating;
    score.voters++;
    if (vote.voter === viewer) score.rating = rating;
  }
  return scores;
}
