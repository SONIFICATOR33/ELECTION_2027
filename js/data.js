/* =====================================================================
   DONNÉES DU JEU — le seul fichier à mettre à jour chaque semaine
   (candidats, sondages, résultats officiels). Dernière mise à jour : 24/11/2026
   ===================================================================== */

/* Heure de Paris -> Date (CET jusqu'au 28 mars 2027 2h, CEST ensuite) */
export function paris(y, m, d, h = 0, mi = 0) {
  const utc = Date.UTC(y, m - 1, d, h, mi);
  const off = utc >= Date.UTC(2027, 2, 28, 1) + 3600e3 ? 2 : 1;
  return new Date(utc - off * 3600e3);
}

/* ---------- Calendrier du jeu ---------- */
export const T0 = paris(2026, 11, 23);            // lundi de la semaine 0 des photos
export const WEEK = 7 * 864e5;
export const LOCK1 = paris(2026, 12, 11, 23, 59); // étape 1 : qui sera là au 31 décembre
export const RES1 = paris(2026, 12, 31, 23, 59);
export const LOCK2 = paris(2027, 2, 5, 23, 59);   // étape 2 : provisoire, calé avant la 1re publication des parrainages
export const LOCK2_PROVISOIRE = true;
export const DEPOT500 = paris(2027, 3, 12, 18);
export const RES2 = paris(2027, 3, 26, 12);
export const LOCKGP = paris(2027, 4, 17, 23, 59); // Grand Prono (1er tour + finale)
export const TOUR1 = paris(2027, 4, 18, 20);
export const TOUR2 = paris(2027, 5, 2, 20);
export const NWEEKS = 21;                          // semaines 0 à 20 (23 nov. -> 18 avril)
export const mult = w => Math.round((2 - w / (NWEEKS - 1)) * 100) / 100;

export const MILESTONES = [
  { at: LOCK1, short: '11 déc.', label: 'Clôture du pari « Qui sera là ? »', kind: 'lock' },
  { at: RES1, short: '31 déc.', label: 'Résultat : qui est encore là', kind: 'res' },
  { at: LOCK2, short: '5 févr.', label: 'Clôture du pari « 500 signatures »' + (LOCK2_PROVISOIRE ? ' (date provisoire)' : ''), kind: 'lock' },
  { at: DEPOT500, short: '12 mars', label: 'Dépôt des 500 signatures, 18 h', kind: 'off' },
  { at: RES2, short: '26 mars', label: 'Liste officielle attendue au plus tard', kind: 'res' },
  { at: TOUR1, short: '18 avril', label: '1er tour', kind: 'tour' },
  { at: TOUR2, short: '2 mai', label: '2nd tour', kind: 'tour' }
];

/* Interdiction de publier des sondages la veille et le jour de chaque tour (loi du 19 juillet 1977) */
export const BLACKOUT = [[paris(2027, 4, 17), paris(2027, 4, 18, 20)], [paris(2027, 5, 1), paris(2027, 5, 2, 20)]];

/* ---------- Candidats ----------
   Déclarés au 23/11/2026 (Toute l'Europe, recoupé avec France-Vote le 24/11), sans les candidatures confidentielles (retirées le 24/11 à la demande du club), rangés de gauche à droite.
   main = testé dans les sondages ; und = pas (encore) déclaré ; off = hors axe gauche-droite ; poll = repère % */
export const C = [
  { id: 'arthaud', p: 'Nathalie', n: 'Arthaud', party: 'Lutte ouvrière', col: '#8E1B1B', main: 1, poll: 1 },
  { id: 'melenchon', p: 'Jean-Luc', n: 'Mélenchon', party: 'La France insoumise', col: 'var(--c-jlm)', main: 1, poll: 17.8 },
  { id: 'roussel', p: 'Fabien', n: 'Roussel', party: 'PCF', col: '#B0101C', main: 1, poll: 1 },
  { id: 'tondelier', p: 'Marine', n: 'Tondelier', party: 'Les Écologistes', col: '#2E9E4F', main: 1, poll: 2.5, note: 'Choix du parti le 13 déc.' },
  { id: 'batho', p: 'Delphine', n: 'Batho', party: 'Génération écologie', col: '#5E9A2E' },
  { id: 'hollande', p: 'François', n: 'Hollande', party: 'PS', col: '#C24F86', main: 1, poll: 7, und: 1, note: 'Décision en janvier' },
  { id: 'bouamrane', p: 'Karim', n: 'Bouamrane', party: 'PS, hors primaire', col: '#C7608F' },
  { id: 'cazeneuve', p: 'Bernard', n: 'Cazeneuve', party: 'La Convention', col: '#A85C80' },
  { id: 'glucksmann', p: 'Raphaël', n: 'Glucksmann', party: 'Place publique', col: 'var(--c-rg)', main: 1, poll: 9.8 },
  { id: 'attal', p: 'Gabriel', n: 'Attal', party: 'Renaissance', col: '#C99700', main: 1, poll: 5 },
  { id: 'becht', p: 'Olivier', n: 'Becht', party: 'Apparenté Ensemble pour la République', col: '#B8932A' },
  { id: 'philippe', p: 'Édouard', n: 'Philippe', party: 'Horizons', col: 'var(--c-ep)', main: 1, poll: 9 },
  { id: 'bertrand', p: 'Xavier', n: 'Bertrand', party: 'Nous France', col: '#2F6FB0' },
  { id: 'villepin', p: 'Dominique', n: 'de Villepin', party: 'La France humaniste', col: '#6C63B5', main: 1, poll: 1.5 },
  { id: 'retailleau', p: 'Bruno', n: 'Retailleau', party: 'Les Républicains', col: 'var(--c-br)', main: 1, poll: 6 },
  { id: 'lisnard', p: 'David', n: 'Lisnard', party: 'Nouvelle Énergie', col: 'var(--c-dl)', main: 1, poll: 10 },
  { id: 'nda', p: 'Nicolas', n: 'Dupont-Aignan', party: 'Debout la France', col: '#34427E', main: 1, poll: 1 },
  { id: 'asselineau', p: 'François', n: 'Asselineau', party: 'UPR', col: '#2C6E7F' },
  { id: 'philippot', p: 'Florian', n: 'Philippot', party: 'Les Patriotes', col: '#B99070' },
  { id: 'lepen', p: 'Marine', n: 'Le Pen', party: 'Rassemblement national', col: 'var(--c-lp)', main: 1, poll: 31.6 },
  { id: 'zemmour', p: 'Éric', n: 'Zemmour', party: 'Reconquête', col: '#AB7455', main: 1, poll: 3.5 },
  { id: 'lassalle', p: 'Jean', n: 'Lassalle', party: 'Résistons !', col: '#7A6A3A', off: 1, und: 1, note: 'Attendu' },
  { id: 'riner', p: 'Teddy', n: 'Riner', party: 'Sans étiquette', col: '#64748B', off: 1, main: 1, poll: 3.5 },
  { id: 'polony', p: 'Natacha', n: 'Polony', party: 'Nous sommes la France', col: '#7A7A85', off: 1 }
];
export const by = Object.fromEntries(C.map(c => [c.id, c]));

/* Candidats sur lesquels on parie dans les étapes 1 et 2.
   À FIGER à la clôture de chaque étape : un candidat ajouté ensuite ne compte pas. */
export const U1 = ['arthaud', 'melenchon', 'roussel', 'tondelier', 'batho', 'glucksmann', 'hollande', 'bouamrane', 'cazeneuve', 'attal', 'becht', 'philippe', 'bertrand', 'riner', 'villepin', 'retailleau', 'lisnard', 'nda', 'asselineau', 'philippot', 'lepen', 'zemmour', 'lassalle', 'polony'];
export const U2 = U1;

/* Retirés depuis le début du jeu (affichés barrés dans « Qui sera là ? ») */
export const RETIRES = [
  { nom: 'François Ruffin', quand: '21 nov. 2026' }
];

/* ---------- Personnalités pour Matignon et les ministères (menus déroulants) ----------
   Liste « réaliste » : candidats sérieux et personnalités gouvernementales, par famille. */
export const PEOPLE_GROUPS = [
  ['Gauche', ['Jean-Luc Mélenchon', 'Fabien Roussel', 'Marine Tondelier', 'François Hollande', 'Bernard Cazeneuve', 'Karim Bouamrane', 'Olivier Faure', 'Boris Vallaud', 'Carole Delga', 'Ségolène Royal', 'Manuel Bompard', 'Mathilde Panot', 'David Guiraud', 'Manon Aubry', 'Clémence Guetté', 'Clémentine Autain', 'François Ruffin', 'Yannick Jadot', 'Benoît Hamon', 'Arnaud Montebourg', 'Alain Bauer']],
  ['Centre gauche · Place publique', ['Raphaël Glucksmann']],
  ['Centre', ['Thierry Breton', 'Gabriel Attal', 'Édouard Philippe', 'Jean-Louis Borloo', 'François Bayrou', 'Dominique de Villepin', 'Gérald Darmanin', 'Élisabeth Borne', 'Bruno Le Maire', 'Sébastien Lecornu', 'Yaël Braun-Pivet', 'Jean-Noël Barrot', 'Christophe Béchu', 'Jean Castex', 'Édouard Geffray']],
  ['Droite', ['Christine Lagarde', 'Bruno Retailleau', 'David Lisnard', 'Xavier Bertrand', 'Laurent Wauquiez', 'Valérie Pécresse', 'Michel Barnier', 'Rachida Dati', 'François Baroin', 'Annie Genevard', 'Othman Nasrou', 'Philippe Juvin', 'Michèle Tabarot', 'Patrick Hetzel']],
  ['RN, UDR et Reconquête', ['Marine Le Pen', 'Jordan Bardella', 'Sébastien Chenu', 'Éric Ciotti', 'Éric Zemmour', 'Sarah Knafo', 'Jean-Philippe Tanguy', 'Laure Lavalette', 'Edwige Diaz', 'Thomas Ménagé']],
  ['Candidatures hors axe', ['Teddy Riner', 'Natacha Polony']],
  ['Syndicalisme', ['Laurent Berger']]
];
export const POSTES = ['Intérieur', 'Économie et Finances', 'Affaires étrangères', 'Armées', 'Justice', 'Éducation nationale', 'Santé', 'Travail et Emploi', 'Écologie et Énergie', 'Agriculture'];

/* ---------- Sondages (repris à la main chaque semaine) ---------- */
export const LAST_POLL_DATE = new Date('2026-11-19T12:00:00Z');
export const PODIUM_DATE = new Date('2026-11-23T12:00:00Z');
export const POLL_DATE = 'Moyenne Sondax · 14 sondages de 7 instituts';
export const POD = [['lepen', 31.6], ['melenchon', 17.8], ['glucksmann', 9.8]];
export const MOVES = [
  ['Ils montent', [['lisnard', 1, '+2 pts chez Harris (19 nov.), +4 chez Elabe (13 nov.)'], ['riner', 1, 'Candidat depuis le 9 nov., déjà jusqu’à 4,5 % chez Elabe']]],
  ['Ils descendent', [['lepen', 0, '−2,5 pts en 3 mois dans la moyenne Sondax'], ['philippe', 0, '−3,6 pts sur 120 jours selon France-Vote']]]
];
export const LAST_SRC = 'Harris Interactive, terrain du 18 au 19 nov. 2026, 1re hypothèse';
export const LAST = [['lepen', 31], ['melenchon', 18], ['glucksmann', 11], ['lisnard', 11], ['philippe', 9], ['attal', 4], ['riner', 4]];

export const SER = ['lepen', 'melenchon', 'philippe', 'glucksmann', 'lisnard', 'retailleau'];
export const CV = { lepen: '--c-lp', melenchon: '--c-jlm', philippe: '--c-ep', glucksmann: '--c-rg', lisnard: '--c-dl', retailleau: '--c-br' };
/* [fin de terrain, institut, Le Pen, Mélenchon, Philippe, Glucksmann, Lisnard, Retailleau] 1re hypothèse */
export const P = [
  ['07-08', 'Harris', 35, 16, 14, 10, null, 7], ['07-08', 'Ifop', 36, 15, null, 12, null, 10], ['07-09', 'OpinionWay', 35, 13, 18, 9, null, 8], ['07-10', 'Elabe', 35, 16, 16.5, 10.5, null, 8], ['07-10', 'Verian', 37, 15, 17, 11, null, 7], ['07-24', 'Cluster17', 30, 18, 18, 10, null, 8],
  ['08-19', 'Harris', 35, 16, 14, 10, null, 6], ['08-25', 'Ifop', 33, 16, 14.5, 11, null, 6], ['08-28', 'Elabe', 34, 14, 17, 11.5, null, 6.5],
  ['09-01', 'Cluster17', 30, 18, 18, 11.5, null, 7.5], ['09-02', 'Ipsos', 34, 15, 14.5, 11.5, null, 6], ['09-03', 'OpinionWay', 35, 17, null, 13, null, 11], ['09-09', 'OpinionWay', 34, 15, 15, 9, null, 8], ['09-09', 'Ipsos', 33, 15.5, 14, 11.5, null, 7], ['09-10', 'OpinionWay', 32, 16, 16, null, 2, 7], ['09-10', 'Harris', 33, 16, 14, 9, null, 7], ['09-16', 'Cluster17', 31, 19, 19, 12, null, 7.5], ['09-21', 'YouGov', 34, 17, 12, 8, null, 8], ['09-24', 'Harris', 35, 17, 13, 10, null, 7], ['09-29', 'Ifop', 32, 15, 16, 11, null, 7],
  ['10-07', 'Odoxa', 37, 18, 17, 9.5, null, 6.5], ['10-08', 'Harris', 35, 18, 13, 10, null, 7], ['10-14', 'Ifop', 32, 16, 13, 11.5, 6, 5], ['10-14', 'OpinionWay', 35, 15, 12, 13, 4, 6], ['10-15', 'YouGov', 36, 15, 10, 12, null, 6], ['10-15', 'Cluster17', 31, 18, 17, 11, 7, 7], ['10-16', 'Elabe', 32.5, 15, 16.5, 15.5, null, 7],
  ['11-05', 'Harris', 36, 18, 11, 11, null, 7], ['11-13', 'Elabe', null, null, null, null, 9, null], ['11-17', 'YouGov', 32, 17, 7, 9, 9, 6], ['11-19', 'Harris', 31, 18, 9, 11, 11, null]
];
export const MO = ['07', '08', '09', '10', '11'], ML = ['juil.', 'août', 'sept.', 'oct.', 'nov.'];
export const NOV = [
  ['Harris Interactive', 'terrain du 18 au 19 nov.', 'Le Pen 31, Mélenchon 18, Glucksmann 11, Lisnard 11, Philippe 9, Attal 4, Riner 4'],
  ['YouGov', 'terrain du 12 au 17 nov.', 'Le Pen 32, Mélenchon 17, Glucksmann 9, Lisnard 9, Philippe 7, Retailleau 6, Tondelier 5'],
  ['Elabe', 'terrain du 12 au 13 nov.', 'Lisnard 9, Riner 4,5 (scores partiels relevés)'],
  ['Cluster17', 'terrain du 9 au 10 nov.', 'Riner 2 (score partiel relevé)'],
  ['Harris Interactive', 'publié le 5 nov.', 'Le Pen 36, Mélenchon 18, Glucksmann 11, Philippe 11, Retailleau 7, Attal 6, Zemmour 4']
];
export const DUELS = [['lepen', 65, 'melenchon', 'Harris, 19 nov.'], ['lepen', 54, 'philippe', 'YouGov, 17 nov.'], ['lepen', 55, 'attal', 'YouGov, 17 nov.'], ['lepen', 58, 'glucksmann', 'YouGov, 17 nov.'], ['philippe', 61, 'melenchon', 'YouGov, 17 nov.'], ['lepen', 59, 'hollande', 'Ifop, 19 oct.'], ['lepen', 58, 'retailleau', 'Ifop, 25 août']];

/* ---------- Résultats officiels (null tant qu'ils ne sont pas connus) ----------
   etape1 : ids des candidats encore déclarés le 31 décembre (source : Toute l'Europe)
   etape2 : ids de la liste officielle du Conseil constitutionnel
   tour1  : [{id, pct}] dans l'ordre, au moins les 5 premiers
   tour2  : {win: id, pct: score du vainqueur} */
export const RESULTS = { etape1: null, etape2: null, tour1: null, tour2: null };
