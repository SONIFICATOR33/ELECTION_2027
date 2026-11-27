import { NWEEKS, mult, LOCKGP } from './data.js?v=109';
import { weekOf, photo } from './scoring.js';
// Maximum still attainable: existing past photos + all remaining possible photos.
export function potentialRemaining(prono, now) {
  const current = Math.max(0, weekOf(now));
  let total = 0, possible = 0;
  for (let w = 0; w < NWEEKS; w++) {
    total += mult(w);
    if (photo(prono, w) || (now < +LOCKGP && w >= current)) possible += mult(w);
  }
  return Math.round(100 * possible / total);
}
export function displayedRanks(values) {
  return values.map((value, i) => ({ rank: values.indexOf(value) + 1, tied: values.filter(v => v === value).length > 1 }));
}
