/* =====================================================================
   Régénère les pages lisibles sur GitHub (une par candidat + sommaire)
   à partir de fiches.json et de js/data.js.
   Usage, depuis la racine du dépôt :  node fiches/generer.mjs
   ===================================================================== */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = readFileSync(join(root, 'js/data.js'), 'utf8');
const D = await import('data:text/javascript,' + encodeURIComponent(src));
const F = JSON.parse(readFileSync(join(here, 'fiches.json'), 'utf8'));

export const ageAu = (iso, at) => {
  const [y, m, d] = iso.split('-').map(Number), t = new Date(at);
  const ty = +t.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric' });
  const tm = +t.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', month: 'numeric' });
  const td = +t.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric' });
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
};
const pct = v => v == null ? '' : v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
const tag = (t, f) => ({ 'élu': f ? 'élue' : 'élu', 'nommé': f ? 'nommée' : 'nommé' }[t] || t);
const dateLongue = iso => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const imgOf = id => ['jpg', 'png', 'webp'].map(e => `img/${id}.${e}`).find(p => existsSync(join(here, p)));

const moves = {};
D.MOVES.forEach(([, l]) => l.forEach(([id, up, txt]) => { moves[id] = [up, txt]; }));

const rows = [];
for (const c of D.C) {
  const f = F.candidats[c.id];
  if (!f) { console.warn('Pas de fiche pour', c.id); continue; }
  const age = ageAu(f.naissance, D.TOUR1);
  const img = imgOf(c.id);
  const L = [];
  L.push(`# ${c.p} ${c.n}`, '');
  L.push(`**${c.party}** · ${age} ans au 1er tour (18 avril 2027)`, '');
  L.push(img ? `<img src="${img}" alt="" width="240">` : `> Espace image : déposer \`img/${c.id}.jpg\` (voir [img/README.md](img/README.md)).`, '');
  L.push('## Dans la course', '');
  L.push(`- **Statut** : ${f.statut}`);
  if (c.main && c.poll != null) L.push(`- **Repère sondages** : ${c.poll.toLocaleString('fr-FR')} %${moves[c.id] ? ` (${moves[c.id][0] ? 'en hausse' : 'en baisse'} : ${moves[c.id][1]})` : ''}`);
  else L.push('- **Repère sondages** : peu ou pas testé');
  L.push(`- **Présidentielles passées** : ${f.pres.length ? f.pres.map(([y, v, n]) => `${y} : ${[pct(v), n].filter(Boolean).join(', ')}`).join(' · ') : 'aucune'}`);
  if (f.autre) L.push(`- ${f.autre}`);
  L.push('', '## Aujourd’hui', '', f.aujourdhui, '');
  L.push('## Parcours', '');
  f.parcours.forEach(([d, t, k]) => L.push(`- **${d}** · ${t} *(${tag(k, f.f)})*`));
  L.push('', '## Formation et métier', '');
  L.push(`- **Formation** : ${f.formation}`, `- **Métier** : ${f.metier}`, '');
  L.push('## Sources', '');
  f.sources.forEach(([n, u]) => L.push(`- [${n}](${u})`));
  L.push('', `*À jour le ${dateLongue(F.maj)}. Le repère sondages suit \`js/data.js\`.*`, '');
  writeFileSync(join(here, c.id + '.md'), L.join('\n'));
  rows.push(`| [${c.p} ${c.n}](${c.id}.md) | ${c.party} | ${age} ans | ${f.statut} |`);
}

const R = [
  '# Les fiches des candidats', '',
  `${rows.length} candidats, de gauche à droite puis hors axe, comme dans l’appli. À jour le ${dateLongue(F.maj)}.`, '',
  '| Candidat | Parti | Âge au 1er tour | Statut |', '|---|---|---|---|', ...rows, '',
  '## Comment c’est fait', '',
  '- `fiches.json` : la source. L’appli la lit directement pour afficher la fiche quand on touche un candidat.',
  '- `img/` : l’espace image de chaque fiche (voir [img/README.md](img/README.md)). Sans image, l’appli affiche le médaillon aux initiales.',
  '- `<id>.md` : les pages lisibles ici sur GitHub. Elles sont générées : ne pas les modifier à la main.',
  '- Après une modification de `fiches.json` ou de `js/data.js`, relancer depuis la racine du dépôt : `node fiches/generer.mjs`.', '',
  '## Règles de rédaction', '',
  '- Les mêmes six rubriques pour tous : identité, dans la course, aujourd’hui, parcours, formation et métier, sources.',
  '- Des faits datés, sans adjectif ni appréciation.',
  '- Âge calculé au 18 avril 2027 pour tout le monde.',
  '- Parcours : quatre étapes au plus, de la plus récente à la plus ancienne, avec la nature de chaque fonction (élu, nommé, parti, carrière, sport, candidature).',
  '- Formation : le diplôme ou l’établissement le plus élevé dont l’obtention est documentée, sinon « Non communiquée ».', ''
];
writeFileSync(join(here, 'README.md'), R.join('\n'));
console.log(rows.length + ' fiches écrites');
