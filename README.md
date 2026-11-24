# Les pronos des vieux boucs et autres craquettes 🇫🇷

Jeu de pronostics sans argent sur la présidentielle 2027.
[Ouvrir le jeu](https://sonificator33.github.io/ELECTION_2027/)

## Jouer entre amis

Le pseudo et le PIN à quatre chiffres permettent de retrouver le compte sur un
autre appareil. Dans **Mes groupes**, crée un groupe et partage son lien
d’invitation. Tu peux partager le même prono dans les groupes de ton choix.
Les membres voient qui a joué, puis les choix de chaque étape à sa clôture.
Le bonus de rareté et le classement sont calculés dans chaque groupe.

**Ma team de rêve** reste sur l’appareil. L’onglet **Dream Teams** copie la
composition actuelle dans le groupe sélectionné quand tu choisis de la publier.
Pour publier une modification, utilise le même bouton. Le partage de l’image
par messagerie est aussi disponible.

Sur iPhone, ouvre le site dans Safari et utilise **Partager → Sur l’écran
d’accueil → Ouvrir comme app web**. Sur Android, utilise **Installer l’app**
dans Mes groupes ou le menu du navigateur.

## Le jeu

1. **Qui sera encore là le 31 janvier ?** Clôture le 11 décembre 2026 à 23 h 59.
2. **Qui sera sur la ligne de départ ?** Fait foi la liste officielle du Conseil
   constitutionnel, attendue au plus tard le 26 mars. Clôture provisoire le
   5 février 2027 à 23 h 59.
3. **Le Grand Prono.** Classe les cinq premiers du premier tour, puis choisis le
   vainqueur de ta finale. Un prono enregistré continue de compter après le
   lundi suivant. Les semaines avant ton premier prono valent zéro et le
   coefficient descend de ×2 à ×1.
4. **Ma team de rêve.** Président de cœur, Premier ministre et ministres, sans points.

## Déploiement

Le front est servi par GitHub Pages. Le projet Firebase utilise
l’authentification anonyme de Firebase et le lien pseudo/PIN enregistré dans
Firestore. Pour activer cette version sociale, publier le front et le fichier
`firestore.rules` ensemble. Les nouveaux chargements du front lisent seulement
le prono du compte connecté et les données des groupes qu’il a rejoints.
L’ancienne version du front s’attend à pouvoir lire les collections globales.
Après la mise à jour, rouvrir le site si un ancien onglet était resté ouvert.

Les pronos déjà enregistrés restent dans leurs documents personnels. Ils
seront partagés quand leur propriétaire active le partage dans un groupe. Les
choix restent privés jusqu’à leur clôture au moyen de règles Firestore, y
compris lorsqu’un membre avance l’horloge de son appareil.

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
- Le visuel d’accueil `img/habit.jpg` est une image générée pour le jeu. Bodoni
  Moda et Hanken Grotesk sont hébergées dans le dépôt sous licence SIL OFL 1.1.
