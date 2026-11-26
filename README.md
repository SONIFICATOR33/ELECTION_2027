# Les pronos des vieux boucs et autres craquettes 🇫🇷

Jeu de pronostics sans argent sur la présidentielle 2027.
[Ouvrir le jeu](https://sonificator33.github.io/ELECTION_2027/)

## Jouer entre amis

Le pseudo et le PIN à quatre chiffres permettent de retrouver le compte sur un
autre appareil. Vincent crée les groupes dans **Joueurs et Groupes**, puis
envoie le lien d’invitation. Les invités peuvent s’inscrire en ouvrant le lien.
Chaque joueur peut consulter les pronos et les gouvernements, même partiels, dans
**Joueurs et Groupes → Tous les joueurs**. Le bonus de rareté et le classement sont
calculés par groupe. Chacun participe aux rubriques de son choix, le gouvernement est facultatif.

Une **photo mensuelle** dans la fiche de chaque joueur reprend le dernier
prono enregistré pour chaque étape à la fin du mois, ou le prono précédent
s’il est inchangé. Les photos mensuelles restent consultables après l’élection.
Pour les pronos antérieurs à cette version, seul l’historique conservé peut
être affiché.

Le gouvernement est sauvegardé avec le compte et retrouvé sur les autres
appareils. Les modifications hors connexion restent sur l’appareil jusqu’à
la prochaine synchronisation. Une ancienne composition est partagée avec tous
quand son auteur rouvre le jeu en ligne. Pour les compositions restées
uniquement sur un téléphone, leur auteur doit rouvrir le jeu une fois sur ce
téléphone. Les gouvernements disponibles apparaissent automatiquement dans
la liste des membres, sans recharger la page.

Sur iPhone, ouvre le site dans Safari et utilise **Partager → Sur l’écran
d’accueil → Ouvrir comme app web**. Sur Android, utilise **Installer l’app**
dans Joueurs et Groupes ou le menu du navigateur.

## Le jeu

1. **Qui sera encore là le 31 décembre ?** Clôture le 11 décembre 2026 à 23 h 59.
2. **Qui aura les 500 signatures ?** Fait foi la liste officielle du Conseil
   constitutionnel, attendue au plus tard le 26 mars. Clôture provisoire le
   5 février 2027 à 23 h 59.
3. **La présidentielle.** Classe les cinq premiers du premier tour, puis choisis le
   vainqueur de ta finale. Un prono enregistré continue de compter après le
   lundi suivant. Les semaines avant ton premier prono valent zéro et le
   coefficient descend de ×2 à ×1.
4. **Mon gouvernement.** Président, Premier ministre et ministres : chaque joueur donne 1, 2 ou 3 👍 ; le classement additionne tous les pouces reçus, séparément des points de pronostics.

### Votes des gouvernements

Dans **Joueurs et Groupes**, la liste s’affiche directement, avec deux classements :
Gouvernements et Pronos. Sur une fiche gouvernement, on choisit **1, 2 ou 3 👍**.
Le total des pouces reçus fait le classement, et le nombre de votants est indiqué
sur la fiche. Modifier son choix le remplace, sans cumuler. **Retirer mes pouces**
supprime son soutien ; sans vote : 0 👍. Aucun veto, aucun vote pour soi, un seul soutien par joueur et par
gouvernement, commun à tous les groupes et appareils. On peut soutenir plusieurs
gouvernements, même sans en composer un soi-même.

Les votes portent sur une composition précise. Une composition différente ne
bénéficie pas des anciens soutiens ; retrouver exactement la composition soutenue
retrouve ses votes. Effacer son gouvernement le retire du classement des votes.
Les égalités positives partagent le même rang ; aucun vainqueur n’est désigné à zéro.

**Activation :** publier la version de `firestore.rules` contenant `/teamVotes` dans
la console Firebase. Avant cette publication, la liste reste disponible et annonce
que les votes arrivent bientôt. Les bulletins sont stockés sous un identifiant
unique `gouvernement~votant` ; les règles vérifient l’auteur et la composition.
Chaque bulletin contient une valeur entière `rating` entre 1 et 3, vérifiée par les règles.
Le client n’écrit aucun compteur de points. Les premiers likes sans `rating` conservent leur pouce. Ces votes mesurent les préférences des
comptes inscrits ; le jeu n’impose pas de vérification d’identité humaine unique.

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

Pour activer la lecture des anciennes sauvegardes par tous les joueurs,
publier `firestore.rules` dans la console Firebase du projet, sous
Firestore Database puis Règles. Les pronos enregistrés sont consultables
directement et les anciens réglages de partage ne déterminent plus leur visibilité.
Chaque joueur conserve l’écriture de ses propres données et les échéances du jeu
continuent de s’appliquer. Les codes de connexion et les paramètres des comptes
gardent leurs protections.

Tant que ces règles ne sont pas publiées, le front affiche les copies déjà
disponibles dans les groupes. Il publie automatiquement les sauvegardes à la
connexion de leur auteur. Les anciennes sauvegardes sans copie publique
deviennent consultables dès la publication des règles.

- `js/data.js` contient les échéances, les candidats, les sondages et les résultats.
  En cas de changement de date, mettre aussi à jour les échéances de
  `firestore.rules`. Pour une modification de l’univers des pronostics, mettre
  à jour la liste autorisée par les règles et conserver les identifiants utilisés
  par les pronos existants.
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
