# Les pronos des vieux boucs et autres craquettes 🇫🇷

Jeu de pronostics sans argent sur la présidentielle 2027.
[Ouvrir le jeu](https://sonificator33.github.io/ELECTION_2027/)

## Jouer entre amis

Inscris-toi avec un pseudo et un code à quatre chiffres. Choisis **Se reconnecter**
sur un autre appareil pour retrouver le même compte. Sur un appareil déjà connecté,
le jeu s’ouvre sur **Accueil**. **Mon espace** donne accès au profil, aux pronos et au
gouvernement. Le vrai nom dans le profil est facultatif. Il est stocké séparément et
seuls le joueur concerné et Vince peuvent le consulter.

**Classements → Voir tous les joueurs** réunit les pronostics et gouvernements
enregistrés, même partiels. Chacun participe aux rubriques de son choix.
Les points et le bonus de rareté sont calculés sur l’ensemble des joueurs.

Une **photo mensuelle** dans la fiche de chaque joueur reprend le dernier
prono enregistré pour chaque étape à la fin du mois, ou le prono précédent
s’il est inchangé. Les photos mensuelles restent consultables après l’élection.
Pour les pronos antérieurs à cette version, seul l’historique conservé peut
être affiché.

Le **Podium des joueurs**, dans **Sondages** sous **Ça bouge**, affiche les trois candidats en tête de
la moyenne des top 5 enregistrés. Le sélecteur permet de consulter **Aujourd’hui**
ou une **photo hebdomadaire** : chaque lundi à minuit, heure de Paris, la semaine
précédente est clôturée. Première photo : **30 novembre 2026** ; dernière photo :
19 avril 2027. Chaque joueur compte une fois, avec son dernier prono connu à cette
date ; les nouveaux joueurs ne sont pas ajoutés aux anciennes photos. Les pronos
inchangés sont reconduits. Les semaines passées sont déjà protégées en écriture
par les règles Firestore : l’historique se calcule à partir des données conservées,
sans nouvelle collection, lecture réseau supplémentaire ni tâche serveur.

Le gouvernement est sauvegardé avec le compte et retrouvé sur les autres
appareils. Les modifications hors connexion restent sur l’appareil jusqu’à
la prochaine synchronisation. Une ancienne composition est partagée avec tous
quand son auteur rouvre le jeu en ligne. Pour les compositions restées
uniquement sur un téléphone, leur auteur doit rouvrir le jeu une fois sur ce
téléphone. Les gouvernements disponibles apparaissent automatiquement dans
la liste des membres, sans recharger la page.

Sur iPhone, ouvre le site dans Safari et utilise **Partager → Sur l’écran
d’accueil → Ouvrir comme app web**. Sur Android, utilise **Installer l’app**
dans Mon profil ou le menu du navigateur.

## Le jeu

1. **Qui sera encore là le 31 décembre ?** Clôture le 11 décembre 2026 à 23 h 59.
2. **Qui aura les 500 signatures ?** Fait foi la liste officielle du Conseil
   constitutionnel, attendue au plus tard le 26 mars. Clôture provisoire le
   5 février 2027 à 23 h 59.
3. **La présidentielle.** Classe les cinq premiers du premier tour, puis choisis le
   vainqueur de ta finale. Un prono enregistré continue de compter après le
   lundi suivant. Les semaines avant ton premier prono valent zéro et le
   coefficient descend de ×2 à ×1.
4. **Mon gouvernement.** Compose ton équipe et vote de 0 à 3 👍 pour les autres gouvernements. Le classement additionne tous les pouces reçus, séparément des points de pronostics.

### Votes des gouvernements

La page **Classements** affiche tous les joueurs, avec ta ligne toujours en tête.
Le tri par défaut **Tirage aléatoire** place ensuite les gouvernements auxquels tu
n’as pas encore attribué de vote, dans un ordre aléatoire propre à ta session.
Les autres joueurs restent visibles à la suite, y compris ceux sans gouvernement. Un vote à
zéro compte comme un vote déjà effectué. La liste reste visible pendant le
chargement des votes ou en cas d’échec. Les autres tris (pseudo, points, pouces ou
position politique) gardent ta ligne en tête. Ouvre le
gouvernement d’un autre joueur pour voter de **0 à 3 👍**. « 0 · Non » enregistre un vote sans ajouter de pouce. Le bouton devient **Voté**. Tu peux rouvrir la fiche pour modifier ou annuler ton vote.

Les votes sont conservés quand les ministres, le Premier ministre ou le joker changent.
Ils sont comptabilisés pour le président soutenu : changer de président remet le
total affiché à zéro pour ce nouveau président (ou retrouve ses soutiens antérieurs).
Les bulletins déjà enregistrés sont conservés, y compris ceux masqués auparavant
après une modification des ministres. Aucun vainqueur n’est désigné à zéro.

## Repères politiques

L’aiguille du cadran indique la différence entre les effectifs de droite et de gauche, divisée par le nombre de profils classés. À égalité, elle pointe au milieu. Elle est masquée si aucun profil ou moins de la moitié des personnes nommées ont un repère.
Le président, le Premier ministre et les dix ministres ont le même poids.
Une personne nommée deux fois compte une fois, le joker est exclu et les postes
vides ne comptent pas. La légende indique en gris les profils sans repère.
La légende donne l’effectif de chaque sensibilité. Le détail dans le jeu associe
chaque nom à ses fonctions et au repère retenu.

Le décompte regroupe les trois sensibilités de gauche et les trois de droite.
Une majorité demande plus de la moitié de toutes les personnes nommées, profils
sans repère compris. Six ministres de gauche, quatre de droite et les deux têtes de
l’exécutif à droite donnent donc six voix de chaque côté.

- **Raphaël Glucksmann** figure au centre gauche. Son parti est Place publique et il siège au groupe des Socialistes et Démocrates. [Parlement européen](https://www.europarl.europa.eu/meps/fr/197694/RAPHAEL_GLUCKSMANN/home) · [Le Monde sur Place publique](https://www.lemonde.fr/politique/article/2025/07/04/raphael-glucksmann-accuse-de-rejouer-le-macron-de-2017_6617878_823448.html)
- **Robert Ménard** figure dans « Droite » : sa liste municipale de Béziers est enregistrée sous la nuance « divers droite » (LDVD) en 2026. Ce choix de menu et de jauge ne signifie pas une appartenance à un parti. [Ministère de l’Intérieur](https://www.resultats-elections.interieur.gouv.fr/municipales2026/ensemble_geographique/76/34/34032/)
- **Christine Lagarde** figure à droite au titre de son parcours politique français, notamment au sein de l’opposition municipale UMP à Paris. [Archives de Bercy](https://www.economie.gouv.fr/saef/christine-lagarde) · [Le Parisien](https://www.leparisien.fr/paris-75/paris-75009/ce-ne-sont-pas-les-pauvres-petits-socialistes-qui-portent-les-parisiens-29-05-2009-529827.php)
- **Thierry Breton** figure au centre en raison de son parcours européen d’indépendant proche de Renew. Il a auparavant été ministre des gouvernements Raffarin et de Villepin. [Toute l’Europe](https://www.touteleurope.eu/institutions/qui-sont-les-27-commissaires-europeens-2019-2024/) · [Archives de Bercy](https://www.economie.gouv.fr/saef/thierry-breton)
- **Laurent Berger** figure dans « Syndicalisme » pour son parcours à la CFDT. **Teddy Riner** et **Natacha Polony** figurent dans « Candidatures hors axe ». Le jeu laisse ces trois profils sans repère sur la jauge. [CFDT](https://www.cfdt.fr/histoire-de-la-cfdt) · [Candidature de Teddy Riner](https://www.lemonde.fr/politique/article/2026/11/10/teddy-riner-une-candidature-inattendue-qui-vient-bousculer-un-peu-plus-la-campagne-presidentielle_6808802_823448.html) · [Candidature de Natacha Polony](https://www.lemonde.fr/politique/article/2026/10/14/presidentielle-2027-natacha-polony-se-declare-candidate_6793497_823448.html)

Ces repères sont des choix éditoriaux du jeu. Ils distinguent notamment le
centre droit d’Horizons et de l’UDI, les ministres issus de la droite et l’aile
gauche de la majorité présidentielle. Voir le [comité de campagne d’Édouard
Philippe](https://www.edouardphilippe.fr/actualites/le-comite-de-campagne-est-lance),
l’[histoire de l’UDI](https://parti-udi.fr/histoire), [l’appel des ministres
issus de la droite](https://www.leparisien.fr/elections/legislatives/legislatives-lappel-des-ministres-de-droite-a-leurs-anciens-collegues-de-lr-12-06-2024-JD73JLHTONEFDOGBLJBTCSQ2EE.php)
et le [parcours d’Élisabeth Borne](https://www.lemonde.fr/politique/article/2023/10/06/elisabeth-borne-tisse-ses-reseaux-aupres-de-l-aile-droite-de-la-majorite_6192866_823448.html).

## Déploiement

Le front est servi par GitHub Pages. La base du projet Firebase
« pronoselection2027 » utilise les règles de `firestore.rules`.

Publier `firestore.rules` dans la console Firebase du projet, sous
Firestore Database puis Règles. La collection `privateProfiles` permet la
lecture du vrai nom par son auteur et par le compte Vince. L’écriture et
la suppression sont réservées à l’auteur. Le nom ne figure jamais dans
la liste publique des joueurs.

Les règles `/teamVotes` vérifient l’auteur, la composition et le barème de 0 à 3
pouces. Les bulletins ont un identifiant unique `gouvernement~votant`. Les anciens
likes sans barème conservent un pouce. Les anciens documents de groupe restent
disponibles pour les sauvegardes antérieures.

- `js/data.js` contient les échéances, les candidats, les sondages et les résultats.
  En cas de changement de date, mettre aussi à jour les échéances de
  `firestore.rules`. Pour une modification de l’univers des pronostics, mettre
  à jour la liste autorisée par les règles et conserver les identifiants utilisés
  par les pronos existants.
- Le [calendrier du Gouvernement](https://www.info.gouv.fr/grand-dossier/chacun-pour-tous/election-presidentielle-2027-comment-participer-au-vote), publié le 24 novembre 2026, indique la clôture des parrainages le 12 mars 2027 à 18 h et la publication de la liste officielle au plus tard le 26 mars. Les résultats des deux tours saisis pour le classement sont ceux proclamés par le Conseil constitutionnel.
- `js/scoring.js` calcule les points, les classements et les titres.
- `js/store.js` et `js/groups.js` gèrent le stockage et la synchronisation.
- `manifest.webmanifest` et `icons/` définissent l’installation mobile.
- `fiches/fiches.json` contient les biographies, sources et crédits photo. Voir
  [les fiches](fiches/README.md).
- Le visuel d’accueil `img/habit.jpg` est une image générée pour le jeu. La police
  [Manrope](https://github.com/googlefonts/manrope) est hébergée dans le dépôt sous licence SIL OFL 1.1.

Le thème sombre utilise un fond `#0a0a0a`, un texte principal blanc à 87 %,
et Manrope variable en graisse 400, interligne 1,55 et espacement nul.
La typographie utilise trois tailles, 14 px pour le texte courant, 16 px pour
les sous-titres et commandes, 20 px pour les titres.
La police est distribuée localement dans `fonts/manrope-variable.woff2`,
avec sa licence dans `fonts/OFL-Manrope.txt`.
