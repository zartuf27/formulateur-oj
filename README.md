# Formulateur de point d'OJ

Outil web pour formuler un point d'ordre du jour de colloque d'équipe.

On écrit ses notes comme elles viennent. L'outil en tire un point d'OJ structuré :

- **Sujet** : un intitulé court et une description compréhensible par un collègue absent ;
- **Proposition de décision**, mise à l'infinitif, avec une proposition B à mettre en concurrence si besoin.

L'organisation, le temps consacré au point, le responsable et le délai ne figurent pas dans l'OJ : ils se décident pendant le colloque, à l'appréciation de l'équipe éducative.

L'outil est pensé pour un usage sur ordinateur, en thème clair.

Le **correcteur Grammalecte** corrige automatiquement les deux cases, sans intelligence artificielle. Il se charge en arrière-plan à l'ouverture de la page (environ 9 Mo, une fois par visite). Pour ne jamais remplacer un mot par un autre au hasard, il corrige d'office uniquement :

- les fautes de grammaire et d'accord (« tout les jours » → « tous les jours »), dont le « ne » oublié (« il a pas faim » → « il n'a pas faim ») ;
- les accents manquants (« depasse » → « dépasse ») ;
- les lettres doublées par erreur (« étiquetter » → « étiqueter »).

Les autres mots inconnus sont seulement signalés sous les cases. Si trop de mots sont inconnus (texte dans une autre langue, par exemple), aucune correction automatique n'est faite. Une case retouchée à la main n'est plus corrigée automatiquement. Les prénoms et les mots suisses ou du métier (tournus, éduc, natel, septante…) ne sont jamais modifiés.

L'outil n'utilise **aucune intelligence artificielle**.

L'outil signale aussi ce qui affaiblit un point : plusieurs sujets mélangés, sujet prévu en « divers », jugements de valeur, généralisations, termes vagues.

**Force de proposition.** L'outil reconnaît les propositions formulées de nombreuses façons (« je propose », « on pourrait », « ce serait bien de », « est-ce qu'on peut », « pourquoi pas », « l'idée c'est de »…) et les met à l'infinitif. Une proposition qui n'engage à rien (« en parler », « être vigilants », « voir avec… ») est signalée « À préciser ». Quand la proposition manque ou reste vague, l'outil propose trois pistes concrètes adaptées au thème (santé, comportement, sommeil, famille, finances, matériel…), reprenant le prénom et le montant s'ils figurent dans les notes. Un clic place la piste dans la case et sélectionne le premier élément à compléter entre crochets.

## Confidentialité

Les notes contiennent des informations sur des résidents, dont des données sensibles au sens de la loi fédérale sur la protection des données (LPD). L'outil est conçu pour qu'elles ne quittent jamais le navigateur : aucune donnée n'est communiquée à un tiers, ni conservée.

| Garantie | Comment elle est assurée |
|---|---|
| Aucun envoi de données | Tout le traitement se fait en JavaScript dans le navigateur. La politique de sécurité de la page (`connect-src 'none'`) interdit au navigateur toute connexion sortante depuis la page. |
| Aucun stockage | Pas de cookie, pas de `localStorage`, pas de base de données. Fermer l'onglet efface tout. |
| Aucun service tiers | Polices, styles, scripts et correcteur sont hébergés dans ce dépôt. Pas de statistiques de visite, pas de police Google, pas de bibliothèque chargée depuis un autre site. |
| Aucune intelligence artificielle | Ni service d'IA en ligne, ni IA intégrée au navigateur. Le traitement repose uniquement sur des règles écrites dans `app.js`, lisibles et vérifiables. |
| Aucune fuite par lien | `referrer` désactivé, page exclue des moteurs de recherche. |

Ce que le serveur (GitHub Pages) voit : la demande de la page elle-même, comme pour n'importe quel site (adresse IP du visiteur, date). Il ne voit jamais le texte saisi.

Limites à connaître :

- Une extension de navigateur installée sur le poste peut lire le contenu des pages. Utiliser un navigateur sans extensions inconnues.
- Les boutons « Copier » placent le texte dans le presse-papiers de l'ordinateur.
- Sur un compte GitHub gratuit, le dépôt et la page sont publics. L'outil ne contient aucune donnée de résident, seulement les règles de formulation.

## Utilisation

1. Ouvrir la page.
2. Écrire ses notes dans « Vos notes ».
3. Compléter ce que la vérification signale comme manquant, dans les notes ou directement dans les deux cases. Sans proposition dans les notes, l'outil propose des modèles à compléter.
4. Copier la case « Sujet » et la case « Proposition de décision » dans l'OJ. Les retouches faites dans ces cases sont conservées même si les notes changent ; le bouton « Régénérer » revient au texte tiré des notes.

L'outil fonctionne aussi sans connexion : télécharger le dépôt et ouvrir `index.html`.

## Mise en ligne avec GitHub Pages

1. Dans le dépôt : **Settings → Pages**.
2. Source : **Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. La page est publiée à l'adresse `https://<compte>.github.io/<nom-du-dépôt>/`.

## Fichiers

- `index.html` : structure de la page et politique de sécurité
- `style.css` : mise en forme aux couleurs de la Fondation Les Castors (thème clair)
- `logo-castors.svg` : logo de la Fondation Les Castors, hébergé avec la page (repris de lescastors.ch)
- `app.js` : moteur d'analyse et de formulation par règles, chargement du correcteur
- `vendor/grammalecte-sdk/` : correcteur Grammalecte (version JavaScript)
- `vendor/grammalecte-data/` : dictionnaire et données de conjugaison, sous forme de scripts locaux
- `vendor/grammalecte-local.js` : adaptation qui permet au correcteur de lire ses données sans requête réseau
- `fonts/` : polices Atkinson Hyperlegible et Literata (licence SIL Open Font)
- `tests/` : notes de test et script de non-régression
- `package.json` : dépendance de test (Playwright) et commande `npm test` ; inutile pour utiliser l'outil

## Fonctionnement du moteur

L'analyse de base repose sur des règles et des lexiques, sans intelligence artificielle : développement des abréviations, repérage du thème et de la personne, retrait des formules vagues (« faudrait qu'on parle de… »), passage de la proposition à l'infinitif, pronoms remplacés par le prénom (« lui proposer » → « proposer à Julie »), pistes de décision par thème. Une phrase très inhabituelle peut donner un intitulé approximatif : le texte final reste modifiable avant la copie.

## Tests

`tests/cas.json` contient 61 notes fictives : bien écrites, orales, décousues, avec fautes, abréviations, majuscules, listes à puces, deux options, mais aussi des cas limites (texte vide, code HTML, caractères spéciaux, émojis, texte en anglais, texte très long). Pour chaque note, le fichier indique ce que l'intitulé et la proposition doivent contenir.

`tests/crash-test.js` passe chaque note dans la page et vérifie les résultats attendus, l'absence d'erreur, d'injection de code et de lenteur, ainsi que la conservation des retouches manuelles, le choix d'une piste et le signalement d'une proposition vague.

```
npm install
npx playwright install chromium
npm test
```

`npm run test:detail` affiche en plus le texte produit pour chaque note.

À relancer après chaque modification des règles : une correction ne doit pas en casser une autre.

## Outils écartés

- **Toute intelligence artificielle** (service en ligne, IA intégrée au navigateur, envoi après pseudonymisation) : écartée pour respecter strictement la LPD. Des notes pseudonymisées restent des données personnelles, et les faits décrits restent sensibles.
- **fr-compromise** (analyse du français en JavaScript) : testé, il met mal à l'infinitif les verbes au subjonctif (« qu'on mette en place » donne « placer »). Les règles actuelles font mieux.

## Licences

- Outil : GNU GPL v3 (imposée par Grammalecte, voir `LICENSE`).
- Grammalecte : © Olivier R., GNU GPL v3 — https://grammalecte.net
- Polices : SIL Open Font License 1.1 (`fonts/`).
- Logo : propriété de la Fondation Les Castors, exclu de la licence GPL. Il ne peut être réutilisé qu'avec l'accord de la Fondation.
