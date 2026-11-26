import { PEOPLE_GROUPS, POSTES } from './data.js?v=99';

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
  [-2, ['Delphine Batho', 'Gabriel Zucman', 'Thomas Piketty']],
  [-1, ['Élisabeth Borne']],
  [0, ['Thierry Breton', 'François Bayrou', 'Gabriel Attal', 'Jean-Noël Barrot', 'Yaël Braun-Pivet', 'Olivier Becht']],
  // Horizons : https://horizonsleparti.fr/organisation/
  [1, ['Édouard Philippe', 'Christophe Béchu', 'Christelle Morançais', 'Jean-Louis Borloo', 'Dominique de Villepin']],
  [2, ['Gérald Darmanin', 'Bruno Le Maire', 'Sébastien Lecornu', 'Jean Castex', 'Nicolas Dupont-Aignan', 'Nicolas Bouzou', 'Jean-Marc Daniel']],
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
    balance: classified && classified >= half ? (right - left) / classified : null,
    label, filled: people.size, people: [...people.values()],
    segments: bands.map(([label, color], index) => ({ label, color, count: counts[index] }))
      .filter(segment => segment.count > 0),
    counts: left + ' à gauche · ' + center + ' au centre · ' + right + ' à droite',
    coverage: classified + '/' + people.size + ' profils classés · hors joker',
    mixed: left > 0 && right > 0 && (counts[0] > 0 || counts[6] > 0)
  };
}

export const gaugeHeight = () => 250;

export function drawTeamGauge(ctx, left, top, width, position) {
  if (!position.filled) return;
  ctx.save();
  ctx.translate(left, top);
  ctx.scale(width / 640, width / 640);

  // Les graduations mesurent le rapport numérique gauche–droite.
  const cx = 320, cy = 194, radius = 175;
  const angleAt = balance => -Math.PI / 2 + balance * Math.PI / 2;
  const dial = ctx.createRadialGradient(cx, cy, 8, cx, cy, radius);
  dial.addColorStop(0, '#202126');
  dial.addColorStop(1, '#101114');
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = dial;
  ctx.fill();
  const rim = ctx.createLinearGradient(cx - radius, 0, cx + radius, 0);
  rim.addColorStop(0, bands[1][1]);
  rim.addColorStop(0.5, '#E9E1D4');
  rim.addColorStop(1, bands[5][1]);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI, 0);
  ctx.lineWidth = 8;
  ctx.strokeStyle = rim;
  ctx.stroke();

  for (let tick = 0; tick <= 20; tick++) {
    const major = tick % 5 === 0;
    const angle = angleAt((tick - 10) / 10);
    const outer = radius - 10, inner = outer - (major ? 20 : 9);
    ctx.beginPath();
    ctx.moveTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle));
    ctx.lineTo(cx + outer * Math.cos(angle), cy + outer * Math.sin(angle));
    ctx.lineWidth = major ? 4 : 2;
    ctx.strokeStyle = major ? '#FFF8E5' : '#999B9F';
    ctx.stroke();
  }

  if (position.balance !== null) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleAt(position.balance));
    ctx.fillStyle = '#FF846B';
    ctx.beginPath();
    ctx.moveTo(-13, -7);
    ctx.lineTo(radius - 24, 0);
    ctx.lineTo(-13, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 11, 0, 2 * Math.PI);
  ctx.fillStyle = '#E9E1D4';
  ctx.fill();
  ctx.font = '600 24px Manrope, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Gauche', cx - radius, 225);
  ctx.fillText('Équilibre', cx, 225);
  ctx.fillText('Droite', cx + radius, 225);

  ctx.restore();
}
