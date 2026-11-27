import { hasTeam } from './team-state.js';

// One independent draw per viewer and page load. Keep every player visible,
// putting governments still awaiting this viewer's vote first. Preserve random
// ranks across live updates, votes and pagination within each group.
export function createVotingOrder(random = Math.random) {
  let viewer;
  const ranks = new Map();
  return (rows, { pid, teams, scores, ready }) => {
    if (viewer !== pid) {
      viewer = pid;
      ranks.clear();
    }
    for (const row of rows) {
      if (!ranks.has(row.pid)) ranks.set(row.pid, random());
    }
    const priority = row => ready && row.pid !== pid
      && hasTeam(teams[row.pid]) && scores[row.pid]?.rating == null;
    return [...rows].sort((a, b) => Number(priority(b)) - Number(priority(a))
      || ranks.get(a.pid) - ranks.get(b.pid) || a.pid.localeCompare(b.pid));
  };
}

// Eligible discovery cards: a zero rating is already a vote.
export function unvotedGovernments(rows, { pid, teams, scores, ready }) {
  return ready ? rows.filter(row => row.pid !== pid && hasTeam(teams[row.pid])
    && scores[row.pid]?.rating == null) : [];
}
