# Les pronos des membrés 🇫🇷

Appli mobile de pronostics sur la présidentielle 2027, entre amis.
En ligne : https://sonificator33.github.io/ELECTION_2027/

## Le jeu
1. **Qui sera encore là le 31 janvier ?** Pari clos le 11 décembre 2026 à minuit.
2. **La ligne de départ du 26 mars** (500 signatures, liste officielle). Clôture provisoire le 5 février 2027.
3. **Le Grand Prono** : président, top 5 du 1er tour, finale. Photo chaque lundi, ×2 au début puis ×1.
4. **Ma team de rêve** : pour le plaisir, à partager en image. Pas de points.

## Fichiers
- `js/data.js` : candidats, sondages, résultats officiels (à mettre à jour chaque semaine).
- `js/scoring.js` : calcul des points (bonus de rareté, photos hebdomadaires, titres).
- `js/store.js` : stockage (Firebase, ou mode essai sur le téléphone).
- `js/config.js` : configuration Firebase.
- `firestore.rules` : règles d'accès à coller dans la console Firebase.
