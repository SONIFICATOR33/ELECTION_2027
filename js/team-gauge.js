import { PEOPLE_GROUPS, POSTES } from './data.js?v=45';

const bands = [
  ['Extrême gauche', '#EF7272'], ['Gauche', '#FFAD83'], ['Centre gauche', '#F4BF91'],
  ['Centre', '#F8D475'],
  ['Centre droit', '#A6DCCB'], ['Droite', '#73C9DF'], ['Extrême droite', '#BDA5FF']
];
const middle = (bands.length - 1) / 2;
const labelAt = value => bands[value + middle][0];
const nameKey = name => name.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLocaleLowerCase('fr').replace(/[-‐‑–’']/g, ' ').trim().replace(/\s+/g, ' ');

// Les rubriques du menu servent à la sélection. La rubrique « Centre »
// rassemble plusieurs sensibilités, précisées ici pour la jauge du jeu.
const families = new Map([['Gauche', -2], ['Droite', 2], ['RN, UDR et Reconquête', 3]]);
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
  [0, ['François Bayrou', 'Gabriel Attal', 'Jean-Noël Barrot', 'Yaël Braun-Pivet', 'Olivier Becht']],
  [1, ['Édouard Philippe', 'Christophe Béchu', 'Jean-Louis Borloo', 'Dominique de Villepin']],
  [2, ['Gérald Darmanin', 'Bruno Le Maire', 'Sébastien Lecornu', 'Jean Castex', 'Nicolas Dupont-Aignan']],
  [3, ['Florian Philippot']]
];
for (const [value, names] of profiles) {
  for (const name of names) positions.set(nameKey(name), value);
}

export function teamPosition(team) {
  const names = [team.coeur, team.pm, ...POSTES.map(post => team.min?.[post])]
    .filter(name => typeof name === 'string' && name.trim());
  const people = new Set(names.map(nameKey));
  const values = [...people].map(name => positions.get(name)).filter(Number.isFinite);
  const left = values.filter(value => value < 0);
  const right = values.filter(value => value > 0);
  const centerCount = values.length - left.length - right.length;
  const half = values.length / 2;

  let needle = null;
  let label = 'Aucune majorité absolue';
  if (!values.length) {
    label = 'Aucun profil classé';
  } else if (values.length * 2 < people.size) {
    label = 'Trop peu de profils classés';
  } else if (centerCount > half) {
    needle = 0;
    label = labelAt(needle);
  } else if (left.length > half || right.length > half) {
    // La médiane du côté majoritaire situe sa tendance sans donner à
    // une seule personnalité extrême le pouvoir de déplacer toute l’équipe.
    const side = (left.length > half ? left : right).sort((a, b) => a - b);
    const low = side[Math.floor((side.length - 1) / 2)];
    const high = side[Math.floor(side.length / 2)];
    needle = (low + high) / 2;
    label = low === high ? labelAt(low) : labelAt(low) + ' / ' + labelAt(high);
  }

  return {
    needle, label, filled: people.size,
    counts: left.length + ' à gauche · ' + centerCount + ' au centre · ' + right.length + ' à droite',
    coverage: values.length + '/' + people.size + ' profils classés · hors joker',
    mixed: left.length > 0 && right.length > 0 && (left.includes(-3) || right.includes(3))
  };
}

export function drawTeamGauge(ctx, left, top, width, position) {
  const scale = width / 640;
  const cx = 320, cy = 177, radius = 120;
  const start = -Math.PI + 0.12, sweep = Math.PI - 0.24;
  const step = sweep / bands.length;
  ctx.save();
  ctx.translate(left, top);
  ctx.scale(scale, scale);
  bands.forEach(([label, color], index) => {
    const angle = start + (index + 0.5) * step;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 23;
    ctx.arc(cx, cy, radius, start + index * step + 0.025, start + (index + 1) * step - 0.025);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.textAlign = index < middle ? 'right' : index > middle ? 'left' : 'center';
    ctx.fillText(label, cx + 147 * Math.cos(angle), cy + 147 * Math.sin(angle));
  });
  if (position !== null) {
    const angle = start + (middle + position + 0.5) * step;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = '#FFF8E5';
    ctx.beginPath();
    ctx.moveTo(-13, -5);
    ctx.lineTo(radius - 7, 0);
    ctx.lineTo(-13, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.fillStyle = '#F8D475';
  ctx.arc(cx, cy, 10, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}
