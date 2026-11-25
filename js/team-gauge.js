import { PEOPLE_GROUPS, POSTES } from './data.js?v=49';

const bands = [
  ['Extrême gauche', '#EF7272'], ['Gauche', '#FFAD83'], ['Centre gauche', '#F4BF91'],
  ['Centre', '#F8D475'],
  ['Centre droit', '#A6DCCB'], ['Droite', '#73C9DF'], ['Extrême droite', '#BD8761'],
  ['Sans repère', '#909090']
];
const unknownBand = bands.length - 1;
const nameKey = name => name.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLocaleLowerCase('fr').replace(/[-‐‑–’']/g, ' ').trim().replace(/\s+/g, ' ');

// Les rubriques du menu servent à la sélection. La rubrique « Centre »
// rassemble plusieurs sensibilités, précisées ici pour la jauge du jeu.
const families = new Map([['Gauche', -2], ['Centre gauche · Place publique', -1], ['Droite', 2], ['RN, UDR et Reconquête', 3]]);
const positions = new Map();
for (const [family, names] of PEOPLE_GROUPS) {
  if (families.has(family)) {
    for (const name of names) positions.set(nameKey(name), families.get(family));
  }
}
const profiles = [
  [-3, ['Nathalie Arthaud']],
  [-2, ['Delphine Batho']],
  [-1, ['Élisabeth Borne']],
  [0, ['Thierry Breton', 'François Bayrou', 'Gabriel Attal', 'Jean-Noël Barrot', 'Yaël Braun-Pivet', 'Olivier Becht']],
  [1, ['Édouard Philippe', 'Christophe Béchu', 'Jean-Louis Borloo', 'Dominique de Villepin']],
  [2, ['Gérald Darmanin', 'Bruno Le Maire', 'Sébastien Lecornu', 'Jean Castex', 'Nicolas Dupont-Aignan']],
  [3, ['Florian Philippot']]
];
for (const [value, names] of profiles) {
  for (const name of names) positions.set(nameKey(name), value);
}

export function teamPosition(team) {
  const roles = [['Président', team.coeur], ['Premier ministre', team.pm],
    ...POSTES.map(post => [post, team.min?.[post]])];
  const people = new Map();
  const counts = Array(bands.length).fill(0);
  for (const [role, name] of roles) {
    if (typeof name !== 'string' || !name.trim()) continue;
    const key = nameKey(name);
    if (people.has(key)) {
      people.get(key).roles.push(role);
      continue;
    }
    const band = positions.has(key) ? positions.get(key) + 3 : unknownBand;
    counts[band]++;
    people.set(key, { name: name.trim(), roles: [role], label: bands[band][0] });
  }

  const left = counts[0] + counts[1] + counts[2];
  const center = counts[3];
  const right = counts[4] + counts[5] + counts[6];
  const classified = left + center + right;
  const half = people.size / 2;
  let label = 'Aucune majorité absolue';
  if (!classified) label = 'Aucun profil classé';
  else if (classified < half) label = 'Trop peu de profils classés';
  else if (left > half) label = 'Majorité à gauche';
  else if (center > half) label = 'Majorité au centre';
  else if (right > half) label = 'Majorité à droite';
  else if (left === right && left === half) label = 'Égalité gauche–droite';

  return {
    label, filled: people.size, people: [...people.values()],
    segments: bands.map(([label, color], index) => ({ label, color, count: counts[index] }))
      .filter(segment => segment.count > 0),
    counts: left + ' à gauche · ' + center + ' au centre · ' + right + ' à droite',
    coverage: classified + '/' + people.size + ' profils classés · hors joker',
    mixed: left > 0 && right > 0 && (counts[0] > 0 || counts[6] > 0)
  };
}

// Une case par personne, avec la même légende à l’écran et sur l’affiche.
export const gaugeHeight = position => 72 + 38 * Math.ceil(position.segments.length / 2);

export function drawTeamGauge(ctx, left, top, width, position) {
  if (!position.filled) return;
  ctx.save();
  ctx.translate(left, top);
  ctx.scale(width / 640, width / 640);
  const gap = 5, inset = 12;
  const cellWidth = (640 - 2 * inset - (position.filled - 1) * gap) / position.filled;
  let offset = inset;
  ctx.font = '600 27px Manrope, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  position.segments.forEach(({ label, color, count }, i) => {
    ctx.fillStyle = color;
    for (let cell = 0; cell < count; cell++) {
      ctx.fillRect(offset, 14, cellWidth, 34);
      offset += cellWidth + gap;
    }
    const x = inset + (i % 2) * 314, y = 81 + Math.floor(i / 2) * 38;
    ctx.fillRect(x, y - 8, 16, 16);
    ctx.fillStyle = '#FFF8E5';
    ctx.fillText(label + ' · ' + count, x + 27, y);
  });
  ctx.restore();
}
