# Les pronos des vieux boucs et autres craquettes 🇫🇷

Appli mobile de pronostics sur la présidentielle 2027, entre amis.
En ligne : https://sonificator33.github.io/ELECTION_2027/

## Le jeu
1. **Qui sera encore là le 31 janvier ?** Pari clos le 11 décembre 2026 à minuit.
2. **Qui aura ses 500 signatures ?** (liste officielle du 26 mars). Clôture provisoire le 5 février 2027.
3. **Le Grand Prono** : président, top 5 du 1er tour, finale. Photo chaque lundi, ×2 au début puis ×1.
4. **Ma team de rêve** : président de cœur, Premier ministre, ministres. Reste sur le téléphone, se partage en image. Pas de points.

## Fichiers
- `js/data.js` : candidats, sondages, résultats officiels (à mettre à jour chaque semaine).
- `js/scoring.js` : calcul des points (bonus de rareté, photos hebdomadaires, titres).
- `js/store.js` : stockage (Firebase, ou mode essai sur le téléphone).
- `js/config.js` : configuration Firebase.
- `js/sound.js` : identité sonore (Web Audio, aucun fichier son).
- `firestore.rules` : règles d'accès à coller dans la console Firebase.

## Typographie
Bodoni Moda (titres, chiffres) et Hanken Grotesk (texte), licence SIL OFL 1.1 (voir `fonts/`), hébergées dans le dépôt : aucun appel à Google Fonts.
