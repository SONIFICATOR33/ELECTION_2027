# Les fiches des candidats

24 candidats, de gauche à droite puis hors axe, comme dans l’appli. Dernière mise à jour le 27 novembre 2026.

| Candidat | Parti | Âge au 1er tour | Statut |
|---|---|---|---|
| [Nathalie Arthaud](arthaud.md) | Lutte ouvrière | 57 ans | Candidate de Lutte ouvrière |
| [Jean-Luc Mélenchon](melenchon.md) | La France insoumise | 75 ans | Candidat déclaré le 3 mai 2026. Génération·s lui apporte son soutien le 23 novembre 2026. |
| [Fabien Roussel](roussel.md) | PCF | 58 ans | Désigné par les adhérents du PCF le 6 septembre 2026. Il maintient sa candidature au 25 novembre, malgré le soutien de plusieurs députés communistes à Jean-Luc Mélenchon. |
| [Marine Tondelier](tondelier.md) | Les Écologistes | 40 ans | Le 18 novembre 2026, Marine Tondelier se dit prête à travailler à une coalition autour de Jean-Luc Mélenchon. Les adhérents des Écologistes voteront sur leur stratégie du 10 au 13 décembre. |
| [Delphine Batho](batho.md) | Génération écologie | 54 ans | Candidature annoncée le 25 novembre 2025, investie par Génération écologie le 6 juin 2026 |
| [François Hollande](hollande.md) | PS | 72 ans | Pas déclaré : sa décision, d’abord promise pour décembre, est repoussée à janvier |
| [Karim Bouamrane](bouamrane.md) | PS, hors primaire | 54 ans | Candidature annoncée le 9 juin 2026, hors primaire du PS |
| [Bernard Cazeneuve](cazeneuve.md) | La Convention | 63 ans | « Lettre aux Français » le 16 juillet 2026, refuse la primaire du PS |
| [Raphaël Glucksmann](glucksmann.md) | Place publique | 47 ans | Candidature annoncée le 23 août 2026, vainqueur de la primaire PS-Place publique en octobre. Son équipe vise 2 500 parrainages, selon Le Monde du 27 novembre 2026. |
| [Gabriel Attal](attal.md) | Renaissance | 38 ans | Candidature annoncée le 22 mai 2026 |
| [Olivier Becht](becht.md) | Apparenté Ensemble pour la République | 50 ans | Candidature annoncée le 24 septembre 2026 |
| [Édouard Philippe](philippe.md) | Horizons | 56 ans | Candidature annoncée le 3 septembre 2024 |
| [Xavier Bertrand](bertrand.md) | Nous France | 62 ans | « Je le serai » le 27 août 2026, déclaration officielle prévue en fin d’année |
| [Dominique de Villepin](villepin.md) | La France humaniste | 73 ans | Candidature officialisée le 20 novembre 2026 |
| [Bruno Retailleau](retailleau.md) | Les Républicains | 66 ans | Candidature annoncée le 12 février 2026 |
| [David Lisnard](lisnard.md) | Nouvelle Énergie | 58 ans | Candidature annoncée en janvier 2025 |
| [Nicolas Dupont-Aignan](nda.md) | Debout la France | 66 ans | Candidature annoncée en mars 2025 |
| [François Asselineau](asselineau.md) | UPR | 69 ans | Campagne lancée |
| [Florian Philippot](philippot.md) | Les Patriotes | 45 ans | Candidature annoncée |
| [Marine Le Pen](lepen.md) | Rassemblement national | 58 ans | Candidate déclarée le 7 juillet 2026, jour de l’arrêt d’appel qui la laisse éligible ; pourvoi en cassation en attente |
| [Éric Zemmour](zemmour.md) | Reconquête | 68 ans | Candidature officialisée le 10 novembre 2026 |
| [Jean Lassalle](lassalle.md) | Résistons ! | 71 ans | Recherche des soutiens pour une troisième candidature. LCP le cite parmi les annonces, sans date de déclaration personnelle précisée. |
| [Teddy Riner](riner.md) | Sans étiquette | 38 ans | Candidature annoncée le 9 novembre 2026 |
| [Natacha Polony](polony.md) | Nous sommes la France | 52 ans | Candidature annoncée le 14 octobre 2026 |

## Comment c’est fait

- `fiches.json` : la source. L’appli la lit directement pour afficher la fiche quand on touche un candidat.
- `img/` : les portraits et leurs crédits (voir [img/README.md](img/README.md)). Sans image, l’appli affiche le médaillon aux initiales.
- `<id>.md` : les pages lisibles ici sur GitHub. Elles sont générées : ne pas les modifier à la main.
- Après une modification de `fiches.json` ou de `js/data.js`, relancer depuis la racine du dépôt : `node fiches/generer.mjs`.

## Règles de rédaction

- Les mêmes six rubriques pour tous : identité, dans la course, aujourd’hui, parcours, formation et métier, sources.
- Des faits datés, sans adjectif ni appréciation.
- Âge calculé au 18 avril 2027 pour tout le monde.
- Parcours : quatre étapes au plus, de la plus récente à la plus ancienne, avec la nature de chaque fonction (élu, nommé, parti, carrière, sport, candidature).
- Formation : le diplôme ou l’établissement le plus élevé dont l’obtention est documentée, sinon « Non communiquée ».
