import assert from 'node:assert/strict';
import test from 'node:test';
import { PEOPLE_GROUPS, POSTES } from '../js/data.js';
import { teamPosition } from '../js/team-gauge.js';

function cabinet(coeur, pm, ...ministers) {
  return { coeur, pm, min: Object.fromEntries(ministers.map((name, i) => [POSTES[i], name])) };
}

const right = ['Bruno Retailleau', 'Rachida Dati', 'Xavier Bertrand', 'Valérie Pécresse', 'Michel Barnier', 'Laurent Wauquiez', 'David Lisnard'];
const left = ['Marine Tondelier', 'François Hollande', 'Olivier Faure', 'Fabien Roussel', 'Boris Vallaud', 'Carole Delga', 'Mathilde Panot'];

test('deux chefs à droite, six ministres à gauche et quatre à droite font six voix partout', () => {
  const result = teamPosition(cabinet(right[0], right[1], ...left.slice(0, 6), ...right.slice(2, 6)));
  assert.equal(result.label, 'Égalité gauche–droite');
  assert.equal(result.counts, '6 à gauche · 0 au centre · 6 à droite');
  assert.deepEqual(result.segments.map(s => [s.label, s.count]), [['Gauche', 6], ['Droite', 6]]);
  assert.deepEqual(result.people[0].roles, ['Président']);
  assert.deepEqual(result.people[1].roles, ['Premier ministre']);
});

test('une majorité de sept sur douze conserve cinq cases minoritaires dans les deux sens', () => {
  for (const [majority, minority, label] of [[right, left, 'Majorité à droite'], [left, right, 'Majorité à gauche']]) {
    const result = teamPosition(cabinet(...minority.slice(0, 5), ...majority));
    assert.equal(result.label, label);
    assert.deepEqual(result.segments.map(s => s.count).sort(), [5, 7]);
  }
});

test('les cinq anciens profils société civile restent sélectionnables, avec leur repère explicite', () => {
  for (const [name, menu, band] of [
    ['Christine Lagarde', 'Droite', 'Droite'], ['Thierry Breton', 'Centre', 'Centre'],
    ['Laurent Berger', 'Syndicalisme', 'Sans repère'], ['Teddy Riner', 'Candidatures hors axe', 'Sans repère'],
    ['Natacha Polony', 'Candidatures hors axe', 'Sans repère'],
    ['Raphaël Glucksmann', 'Centre gauche · Place publique', 'Centre gauche']
  ]) {
    assert.deepEqual(PEOPLE_GROUPS.filter(([, names]) => names.includes(name)).map(([group]) => group), [menu]);
    assert.equal(teamPosition(cabinet(name)).people[0].label, band);
  }
});

test('distingue toutes les sensibilités, indépendamment du menu', () => {
  const names = ['Nathalie Arthaud', left[0], 'Élisabeth Borne', 'François Bayrou', 'Édouard Philippe', 'Gérald Darmanin', 'Marine Le Pen'];
  const result = teamPosition(cabinet(...names));
  assert.deepEqual(result.segments.map(s => s.label), ['Extrême gauche', 'Gauche', 'Centre gauche', 'Centre', 'Centre droit', 'Droite', 'Extrême droite']);
  assert.equal(result.label, 'Aucune majorité absolue');
  assert.equal(result.mixed, true);
  assert.equal(teamPosition(cabinet('François Bayrou', 'Jean-Noël Barrot', right[0])).label, 'Majorité au centre');
});

test('les profils sans repère restent dans le dénominateur et dans la légende', () => {
  const result = teamPosition(cabinet(left[0], left[1], right[0], 'Nom libre'));
  assert.equal(result.label, 'Aucune majorité absolue');
  assert.equal(result.segments.at(-1).count, 1);
  assert.equal(result.coverage, '3/4 profils classés · hors joker');
  assert.equal(teamPosition(cabinet(right[0], 'Profil libre', 'Teddy Riner')).label, 'Trop peu de profils classés');
  assert.equal(teamPosition(cabinet('Inconnu')).label, 'Aucun profil classé');
});

test('les doublons gardent leurs fonctions, les postes vides et le joker ne votent pas', () => {
  const result = teamPosition({ ...cabinet(' ÉDOUARD  PHILIPPE ', 'Edouard Philippe', 'Teddy Riner',
    'Jean‑Louis Borloo', 'Jean-Louis Borloo'), jn: 'Marine Le Pen' });
  assert.equal(result.filled, 3);
  assert.equal(result.coverage, '2/3 profils classés · hors joker');
  assert.deepEqual(result.people[0].roles, ['Président', 'Premier ministre']);
  assert.deepEqual(result.segments.map(s => [s.label, s.count]), [['Centre droit', 2], ['Sans repère', 1]]);
  assert.equal(teamPosition({ jn: right[0] }).filled, 0);
});

test('le gouvernement de référence conserve toutes ses composantes', () => {
  const result = teamPosition(cabinet('Nathalie Arthaud', 'Marine Le Pen', 'Bruno Retailleau',
    'François Baroin', 'Jean-Noël Barrot', 'Sébastien Lecornu', 'Gérald Darmanin', 'Édouard Geffray',
    'Philippe Juvin', 'Laurent Berger', 'Marine Tondelier', 'Annie Genevard'));
  assert.equal(result.label, 'Majorité à droite');
  assert.equal(result.counts, '2 à gauche · 1 au centre · 7 à droite');
  assert.equal(result.coverage, '10/12 profils classés · hors joker');
  assert.equal(result.mixed, true);
});
