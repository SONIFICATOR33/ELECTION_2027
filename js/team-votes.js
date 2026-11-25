import { hasTeam, normalizeTeam, sameTeam } from './team-state.js';

// Un bulletin par couple gouvernement / votant, commun à tous les groupes.
export function teamVotesStore({ F, db, me }) {
  return {
    watchVotes(update, fail) {
      return F.onSnapshot(F.collection(db, 'teamVotes'), { includeMetadataChanges: true }, snapshot => {
        if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
          update(snapshot.docs.map(doc => doc.data()));
        }
      }, fail);
    },
    async setTeamVote(team, composition, supported) {
      const voter = me()?.pid;
      if (!voter) throw new Error('Connecte-toi pour voter.');
      if (team === voter) throw new Error('Tu peux voter pour les gouvernements des autres joueurs.');
      const ref = F.doc(db, 'teamVotes', team + '~' + voter);
      if (!supported) { await F.deleteDoc(ref); return; }
      await F.runTransaction(db, async tx => {
        const saved = await tx.get(F.doc(db, 'pronos', team));
        let current = saved.data()?.team;
        if (!Object.hasOwn(saved.data() || {}, 'team')) {
          const legacy = await tx.get(F.doc(db, 'groups', 'e1ec7100202700000000000000000001', 'teams', team));
          current = legacy.data()?.value;
        }
        if (!hasTeam(current) || !sameTeam(current, composition)) {
          throw new Error('Ce gouvernement a changé. Rouvre sa fiche avant de voter.');
        }
        tx.set(ref, { team, voter, composition: normalizeTeam(current), createdAt: F.serverTimestamp() });
      });
    }
  };
}

// Une modification de composition rend les anciens bulletins caducs.
export function teamVoteScores(teams, votes, viewer) {
  const scores = Object.create(null), seen = new Set();
  for (const vote of votes) {
    const key = vote.team + '~' + vote.voter;
    if (vote.team === vote.voter || seen.has(key) || !hasTeam(teams[vote.team])
      || !sameTeam(teams[vote.team], vote.composition)) continue;
    seen.add(key);
    const score = scores[vote.team] ||= { points: 0, supported: false };
    score.points++;
    if (vote.voter === viewer) score.supported = true;
  }
  return scores;
}
