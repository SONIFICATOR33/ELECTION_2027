# Portraits des candidats

Les versions WebP sont redimensionnées pour le téléphone. Les métadonnées de
chaque portrait sont dans `../fiches.json` sous la clé `portrait`.
Le crédit, le lien vers le fichier d’origine et la licence sont affichés dans
la fiche et reproduits dans la version Markdown.

Pour remplacer un portrait, mettre à jour le fichier et ses cinq champs
`fichier`, `auteur`, `titre`, `source`, `licence` ainsi que le lien
`licenceUrl`. Vérifier que la licence autorise la réutilisation et conserver
ses conditions. Depuis la racine, lancer `node fiches/generer.mjs`.
