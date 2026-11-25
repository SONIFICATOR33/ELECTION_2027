import assert from 'node:assert/strict';
import test from 'node:test';
import { POSTES } from '../js/data.js';
import { teamPosition } from '../js/team-gauge.js';

function cabinet(coeur, pm, ...ministers) {
  return { coeur, pm, min: Object.fromEntries(ministers.map((name, i) => [POSTES[i], name])) };
}

const right = ['Bruno Retailleau', 'Rachida Dati', 'Xavier Bertrand', 'Valérie Pécresse', 'Michel Barnier', 'Laurent Wauquiez', 'David Lisnard'];
const left = ['Marine Tondelier', 'François Hollande', 'Olivier Faure', 'Fabien Roussel', 'Boris Vallaud', 'Carole Delga', 'Mathilde Panot'];

test('l’affiche de référence passe du centre à droite tout en signalant les extrêmes', () => {
  const result = teamPosition(cabinet('Nathalie Arthaud', 'Marine Le Pen', 'Bruno Retailleau',
    'François Baroin', 'Jean-Noël Barrot', 'Sébastien Lecornu', 'Gérald Darmanin', 'Édouard Geffray',
    'Philippe Juvin', 'Laurent Berger', 'Marine Tondelier', 'Annie Genevard'));
  assert.equal(result.label, 'Droite');
  assert.equal(result.counts, '2 à gauche · 1 au centre · 7 à droite');
  assert.equal(result.coverage, '10/12 profils classés · hors joker');
  assert.equal(result.mixed, true);
});

test('une majorité de sept sur douze fixe le côté de la jauge dans les deux sens', () => {
  for (const [majority, minority, label, needle] of [[right, left, 'Droite', 2], [left, right, 'Gauche', -2]]) {
    const result = teamPosition(cabinet(...minority.slice(0, 5), ...majority));
    assert.equal(result.label, label);
    assert.equal(result.needle, needle);
  }
});

test('distingue les sensibilités qui partagent le même menu', () => {
  for (const [name, label] of [['François Bayrou', 'Centre'], ['Élisabeth Borne', 'Centre gauche'],
    ['Édouard Philippe', 'Centre droit'], ['Gérald Darmanin', 'Droite']]) {
    assert.equal(teamPosition(cabinet(name)).label, label);
  }
  const mixedRight = teamPosition(cabinet('Édouard Philippe', 'Christophe Béchu', 'Sébastien Lecornu', 'Bruno Le Maire', 'Gérald Darmanin', 'François Hollande', 'François Bayrou'));
  assert.equal(mixedRight.label, 'Droite');
  assert.equal(mixedRight.counts, '1 à gauche · 1 au centre · 5 à droite');
});

test('un partage égal ou une simple pluralité ne produit pas une étiquette centriste', () => {
  for (const team of [cabinet(...left.slice(0, 6), ...right.slice(0, 6)),
    cabinet(left[0], 'François Bayrou', right[0]), cabinet(left[0], left[1], 'François Bayrou', right[0])]) {
    const result = teamPosition(team);
    assert.equal(result.label, 'Aucune majorité absolue');
    assert.equal(result.needle, null);
  }
  assert.equal(teamPosition(cabinet('François Bayrou', 'Jean-Noël Barrot', right[0])).needle, 0);
});

test('indique les deux sensibilités médianes et préserve les deux extrémités', () => {
  const between = teamPosition(cabinet('Édouard Philippe', right[0]));
  assert.equal(between.label, 'Centre droit / Droite');
  assert.equal(between.needle, 1.5);
  assert.equal(teamPosition(cabinet('Nathalie Arthaud')).needle, -3);
  assert.equal(teamPosition(cabinet('Marine Le Pen')).needle, 3);
});

test('les profils non classés, les doublons, les postes vides et le joker ne votent pas', () => {
  const result = teamPosition({ ...cabinet(' ÉDOUARD  PHILIPPE ', 'Edouard Philippe', 'Teddy Riner',
    'Jean‑Louis Borloo', 'Jean-Louis Borloo'), jn: 'Marine Le Pen' });
  assert.equal(result.needle, 1);
  assert.equal(result.coverage, '2/3 profils classés · hors joker');
  assert.equal(teamPosition(cabinet(right[0], 'Profil libre', 'Teddy Riner')).needle, null);
  assert.equal(teamPosition(cabinet('Inconnu')).label, 'Aucun profil classé');
  assert.equal(teamPosition({ jn: right[0] }).filled, 0);
});
