# Les pronos des vieux boucs et autres craquettes 🇫🇷

Jeu de pronostics sans argent sur la présidentielle 2027.
[Ouvrir le jeu](https://sonificator33.github.io/ELECTION_2027/)

## Jouer entre amis

Le pseudo et le PIN à quatre chiffres permettent de retrouver le compte sur un
autre appareil. Vincent crée les groupes dans **Joueurs et Groupes**, puis
envoie le lien d’invitation. Les invités peuvent s’inscrire en ouvrant le lien.
Chaque joueur peut consulter les gouvernements, même partiels, dans
**Joueurs et Groupes → Tous les joueurs**. Le bonus de rareté et le classement sont
calculés par groupe.

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
4. **Mon gouvernement.** Président, Premier ministre et ministres, sans points.

La jauge compte chaque personnalité une fois, hors joker. Elle affiche le nombre
de profils classés à gauche, au centre et à droite. Si une de ces familles
dépasse la moitié des profils classés, l’aiguille indique la sensibilité médiane
de cette famille. Entre deux sensibilités, les deux libellés apparaissent. La
jauge reste sans aiguille en l’absence de majorité ou lorsque moins de la moitié
des personnalités nommées ont un repère.

Ces repères sont des choix éditoriaux du jeu. Ils distinguent notamment le
centre droit d’Horizons et de l’UDI, les ministres issus de la droite et l’aile
gauche de la majorité présidentielle. Voir le [comité de campagne d’Édouard
Philippe](https://www.edouardphilippe.fr/actualites/le-comite-de-campagne-est-lance),
l’[histoire de l’UDI](https://parti-udi.fr/histoire), [l’appel des ministres
issus de la droite](https://www.leparisien.fr/elections/legislatives/legislatives-lappel-des-ministres-de-droite-a-leurs-anciens-collegues-de-lr-12-06-2024-JD73JLHTONEFDOGBLJBTCSQ2EE.php)
et le [parcours d’Élisabeth Borne](https://www.lemonde.fr/politique/article/2023/10/06/elisabeth-borne-tisse-ses-reseaux-aupres-de-l-aile-droite-de-la-majorite_6192866_823448.html).

## Déploiement

Le front est servi par GitHub Pages. Le projet Firebase utilise
l’authentification anonyme de Firebase et le lien pseudo/PIN enregistré dans
Firestore. Pour activer cette version sociale, publier le front et le fichier
`firestore.rules` ensemble. Les nouveaux chargements du front lisent seulement
le prono du compte connecté et les données des groupes qu’il a rejoints.
L’ancienne version du front s’attend à pouvoir lire les collections globales.
Après la mise à jour, rouvrir le site si un ancien onglet était resté ouvert.

Les pronos déjà enregistrés conservent les choix et les réglages de partage.
Firestore autorise la lecture des copies partagées aux seuls membres du
groupe. Les nouvelles règles doivent être publiées avant le déploiement du
front pour activer l’écriture des photos mensuelles.

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
et Manrope variable en graisse 400, 14,4 px, interligne 1,55 et espacement nul.
Les titres et contrôles conservent leur hiérarchie typographique.
La police est distribuée localement dans `fonts/manrope-variable.woff2`,
avec sa licence dans `fonts/OFL-Manrope.txt`.
