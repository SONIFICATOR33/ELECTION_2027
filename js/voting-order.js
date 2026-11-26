import { hasTeam } from './team-state.js';

// One independent draw per viewer and page load. Keep each government's rank
// across live updates, votes and pagination so the remaining list never reshuffles.
export function createVotingOrder(random = Math.random) {
  let viewer;
  const ranks = new Map();
  return (rows, { pid, teams, scores, ready }) => {
    if (viewer !== pid) {
      viewer = pid;
      ranks.clear();
    }
    if (!ready) return [];
    const eligible = rows.filter(row => row.pid !== pid
      && hasTeam(teams[row.pid]) && scores[row.pid]?.rating == null);
    for (const row of eligible) {
      if (!ranks.has(row.pid)) ranks.set(row.pid, random());
    }
    return eligible.sort((a, b) => ranks.get(a.pid) - ranks.get(b.pid) || a.pid.localeCompare(b.pid));
  };
}
