import { photo } from './scoring.js';
import { T0, NWEEKS, paris } from './data.js';

// Close each saved week at midnight in Paris, including the March DST change.
// Past weeks are already immutable in Firestore; no extra snapshot writes.
export function forecastPhotoDate(week) {
  const start = new Date(+T0 + 12 * 3600e3);
  return paris(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate() + 7 * (week + 1));
}

export function closedForecastWeeks(now = Date.now()) {
  return Array.from({ length: NWEEKS }, (_, week) => ({ week, date: forecastPhotoDate(week) }))
    .filter(({ date }) => +date <= +now).reverse();
}

// One latest saved top 5 per player. An omitted candidate contributes zero to
// that player's top 5; never average only over players who selected a candidate.
export function firstRoundForecast(pronos, candidates, week = 999) {
  let participants = 0;
  const totals = new Map();
  for (const prono of Object.values(pronos || {})) {
    const top = photo(prono, week)?.top;
    if (!Array.isArray(top) || top.length !== 5
      || new Set(top.map(choice => choice?.id)).size !== 5
      || top.some(choice => !choice || !Object.hasOwn(candidates, choice.id)
        || !Number.isFinite(choice.pct) || choice.pct < 0 || choice.pct > 60)) continue;
    const sum = top.reduce((total, choice) => total + choice.pct, 0);
    if (sum <= 0 || sum > 100) continue;
    participants++;
    for (const { id, pct } of top) totals.set(id, (totals.get(id) || 0) + pct);
  }
  const rows = [...totals].filter(([, total]) => total > 0)
    .map(([id, total]) => ({ id, total, pct: total / participants }))
    .sort((a, b) => Math.abs(b.total - a.total) > 1e-9 ? b.total - a.total
      : (candidates[a.id].p + ' ' + candidates[a.id].n).localeCompare(candidates[b.id].p + ' ' + candidates[b.id].n, 'fr'));
  for (let i = 0; i < rows.length; i++) {
    rows[i].rank = i && Math.abs(rows[i].total - rows[i - 1].total) < 1e-9 ? rows[i - 1].rank : i + 1;
  }
  return { participants, rows };
}
