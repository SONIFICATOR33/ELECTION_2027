import { T0, TOUR2, WEEK } from './data.js';

const monthFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' });
const labelFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: 'long' });
export const monthKey = time => monthFormat.format(time);

export function monthlyPhotos(prono, time = Date.now()) {
  const archive = { l1: {}, l2: {}, weeks: {} };
  // For older data, only infer a month when the whole saved week had ended.
  for (const [week, value] of Object.entries(prono.weeks || {}).sort(([a], [b]) => +a - +b)) {
    const endOfWeek = +T0 + (+week + 1) * WEEK - 3600001;
    archive.weeks[monthKey(endOfWeek)] = value;
  }
  for (const stage of ['l1', 'l2']) {
    if (prono[stage] && Number.isFinite(prono[stage + 'at'])) archive[stage][monthKey(prono[stage + 'at'])] = prono[stage];
  }
  for (const stage of Object.keys(archive)) Object.assign(archive[stage], prono.history?.[stage]);
  const photos = [];
  const lastMonth = monthKey(Math.min(time, +TOUR2));
  const currentMonth = monthKey(time);
  const previous = {};
  for (let date = new Date(Date.UTC(2026, 10, 15)); monthKey(+date) <= lastMonth; date.setUTCMonth(date.getUTCMonth() + 1)) {
    const month = monthKey(+date);
    for (const stage of Object.keys(archive)) {
      if (Object.hasOwn(archive[stage], month)) previous[stage] = archive[stage][month];
    }
    if ((month < currentMonth || time >= +TOUR2) && Object.keys(previous).length) {
      photos.push({ label: labelFormat.format(date), ...previous });
    }
  }
  return photos.reverse();
}
