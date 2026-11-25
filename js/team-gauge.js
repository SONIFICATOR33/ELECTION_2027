import { PEOPLE_GROUPS, POSTES } from './data.js?v=25';

const bands = [
  ['Extrême gauche', '#EF7272'],
  ['Gauche', '#FFAD83'],
  ['Centre', '#F8D475'],
  ['Droite', '#73C9DF'],
  ['Extrême droite', '#BDA5FF']
];
const familyPositions = new Map([
  ['Gauche', -1], ['Centre', 0], ['Droite', 1], ['RN, UDR et Reconquête', 2]
]);
const positions = new Map(PEOPLE_GROUPS.flatMap(([family, names]) =>
  familyPositions.has(family) ? names.map(name => [name, familyPositions.get(family)]) : []
));
positions.set('Nathalie Arthaud', -2);
positions.set('Nicolas Dupont-Aignan', 1);
positions.delete('Édouard Geffray');

const nameKey = name => name.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .trim().toLocaleLowerCase('fr').replace(/\s+/g, ' ');
const byName = new Map([...positions].map(([name, value]) => [nameKey(name), value]));

export function teamPosition(team) {
  const names = [team.coeur, team.pm, ...POSTES.map(post => team.min?.[post])]
    .filter(name => typeof name === 'string' && name.trim());
  const people = new Set(names.map(nameKey));
  const values = [...people].map(name => byName.get(name)).filter(Number.isFinite);
  const count = values.length;
  const average = count ? values.reduce((sum, value) => sum + value, 0) / count : null;
  return {
    average,
    label: count ? bands[Math.min(4, Math.floor(average + 2.5))][0] : '',
    coverage: count + ' sur ' + people.size + ' · hors joker',
    mixed: values.some(value => value < 0) && values.some(value => value > 0)
      && Math.max(...values) - Math.min(...values) >= 3
  };
}

export function drawTeamGauge(ctx, left, top, width, position) {
  const scale = width / 640;
  const cx = 320, cy = 157, radius = 123;
  const start = -Math.PI + 0.12, sweep = Math.PI - 0.24;
  const step = sweep / bands.length;
  ctx.save();
  ctx.translate(left, top);
  ctx.scale(scale, scale);
  bands.forEach(([label, color], index) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 23;
    ctx.arc(cx, cy, radius, start + index * step + 0.025, start + (index + 1) * step - 0.025);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = '700 21px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, [65, 196, 320, 444, 575][index], 195);
  });
  if (position !== null) {
    const angle = start + (0.5 + position / 5) * sweep;
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
