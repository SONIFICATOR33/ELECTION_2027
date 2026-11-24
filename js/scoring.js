/* =====================================================================
   MOTEUR DE POINTS — fonctions pures, testables sans navigateur
   ===================================================================== */
import { T0, WEEK, NWEEKS, mult, LOCK1, LOCK2, LOCKGP } from './data.js';

export const weekOf = t => Math.floor((+t - +T0) / WEEK);
export const clampWeek = w => Math.max(0, Math.min(NWEEKS - 1, w));

/* Photo de la semaine w : dernier état enregistré au plus tard cette semaine-là */
export function photo(pr, w) {
  const W = pr && pr.weeks;
  if (!W) return null;
  let best = -1;
  for (const k in W) { const n = +k; if (n <= w && n > best && W[k] && W[k].pres) best = n; }
  return best < 0 ? null : W[best];
}
/* État courant du Grand Prono (dernière photo) */
export const current = pr => photo(pr, 999);

const r1 = x => Math.round(x * 10) / 10;

/* ---- Étapes 1 et 2 : « qui sera là » / « ligne de départ » ----
   Chaque candidat bien jugé : 1 pt × (1 + 4 × part des joueurs qui se sont trompés sur lui) => de 1 à 5 pts.
   Étape 2 : +3 si le nombre de candidats est exact, +1 à un près. */
export function scoreListe(pronos, key, univers, truth, bonusNombre) {
  const T = new Set(truth);
  const ps = Object.entries(pronos).filter(([, p]) => p && Array.isArray(p[key]) && p[key].length);
  const n = ps.length;
  const wrong = {};
  for (const id of univers) {
    let k = 0;
    for (const [, p] of ps) if (p[key].includes(id) !== T.has(id)) k++;
    wrong[id] = n ? k / n : 0;
  }
  const out = {};
  for (const [pid, p] of ps) {
    let s = 0, ok = 0;
    for (const id of univers) if (p[key].includes(id) === T.has(id)) { s += 1 + 4 * wrong[id]; ok++; }
    if (bonusNombre) {
      const d = Math.abs(p[key].filter(id => univers.includes(id)).length - T.size);
      s += d === 0 ? 3 : d === 1 ? 1 : 0;
    }
    out[pid] = { pts: r1(s), ok, of: univers.length };
  }
  return out;
}

/* ---- Grand Prono, une photo ----
   1er tour : +3 bon rang, +1 dans le top 5 mais mal classé ; +2 par % à 1 point près ; +5 par finaliste.
   Finale : président 10 × (1 + 2 × part des joueurs qui ne l'avaient pas) => 10 à 30 ; +3 si score à 2 points près. */
export function scoreTour1(ph, tour1) {
  if (!ph || !tour1) return 0;
  const top5 = tour1.slice(0, 5).map(x => x.id), fin = tour1.slice(0, 2).map(x => x.id);
  const pct = Object.fromEntries(tour1.map(x => [x.id, x.pct]));
  let s = 0;
  (ph.top || []).slice(0, 5).forEach((t, i) => {
    if (top5[i] === t.id) s += 3; else if (top5.includes(t.id)) s += 1;
    if (pct[t.id] != null && Math.abs(pct[t.id] - t.pct) <= 1) s += 2;
  });
  (ph.top || []).slice(0, 2).forEach(t => { if (fin.includes(t.id)) s += 5; });
  return s;
}
export function scoreFinale(ph, tour2, wrongShare) {
  if (!ph || !tour2 || ph.pres !== tour2.win) return 0;
  let s = 10 * (1 + 2 * wrongShare);
  if (tour2.pct != null && ph.win != null && Math.abs(ph.win - tour2.pct) <= 2) s += 3;
  return s;
}

/* ---- Grand Prono, toutes les semaines ----
   Chaque photo hebdo est notée puis multipliée (×2 la 1re semaine -> ×1 la dernière).
   Score = somme / nombre de semaines du jeu : une semaine sans prono compte 0. */
export function scoreGrandProno(pronos, R) {
  const ids = Object.keys(pronos), out = {};
  ids.forEach(pid => out[pid] = { t1: 0, fin: 0 });
  for (let w = 0; w < NWEEKS; w++) {
    const ph = {}; ids.forEach(pid => { const p = photo(pronos[pid], w); if (p) ph[pid] = p; });
    const n = Object.keys(ph).length; if (!n) continue;
    const share = R.tour2 ? Object.values(ph).filter(p => p.pres !== R.tour2.win).length / n : 0;
    for (const pid in ph) {
      if (R.tour1) out[pid].t1 += mult(w) * scoreTour1(ph[pid], R.tour1);
      if (R.tour2) out[pid].fin += mult(w) * scoreFinale(ph[pid], R.tour2, share);
    }
  }
  for (const pid of ids) { out[pid].t1 = r1(out[pid].t1 / NWEEKS); out[pid].fin = r1(out[pid].fin / NWEEKS); }
  return out;
}

/* ---- Classement complet ---- */
export function classement(players, pronos, R, U1, U2) {
  const e1 = R.etape1 ? scoreListe(pronos, 'l1', U1, R.etape1, false) : {};
  const e2 = R.etape2 ? scoreListe(pronos, 'l2', U2, R.etape2, true) : {};
  const gp = (R.tour1 || R.tour2) ? scoreGrandProno(pronos, R) : {};
  const rows = Object.keys(players).map(pid => {
    const a = e1[pid] ? e1[pid].pts : 0, b = e2[pid] ? e2[pid].pts : 0, c = gp[pid] ? gp[pid].t1 : 0, d = gp[pid] ? gp[pid].fin : 0;
    return { pid, pseudo: players[pid].pseudo, e1: a, e2: b, t1: c, fin: d, total: r1(a + b + c + d) };
  }).sort((x, y) => y.total - x.total || x.pseudo.localeCompare(y.pseudo, 'fr'));
  rows.forEach((r, i) => r.rank = i && r.total === rows[i - 1].total ? rows[i - 1].rank : i + 1);
  return rows;
}
export const hasResults = R => !!(R.etape1 || R.etape2 || R.tour1 || R.tour2);

/* ---- Titres ---- */
export const TITRES = ['Militant', 'Attaché parlementaire', 'Conseiller de l’ombre', 'Sondeur', 'Analyste politique', 'Oracle de l’Élysée'];
/* Avant les résultats : titre selon les paris faits. Après : selon la place au classement. */
export function titre({ rank, n, parisFaits, parisOuverts, results }) {
  if (!results) return parisOuverts && parisFaits >= parisOuverts ? 1 : 0;
  if (rank === 1) return 5;
  const q = (rank - 1) / Math.max(1, n - 1);
  return q <= .1 ? 4 : q <= .25 ? 3 : q <= .5 ? 2 : q <= .75 ? 1 : 0;
}

/* ---- Paris ouverts à une date donnée ---- */
export function parisOuverts(now) {
  const o = [];
  if (now < LOCK1) o.push('l1');
  if (now < LOCK2) o.push('l2');
  if (now < LOCKGP) o.push('gp');
  return o;
}
