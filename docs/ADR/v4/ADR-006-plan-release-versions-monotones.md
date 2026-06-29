# Plan de release validé avant build : versions strictement croissantes

**Status:** Accepté

## Contexte

Sur merge dans `main`, le pipeline détecte les services impactés par les changements et doit décider lesquels republier. Un service peut être détecté comme « changé » sans que sa version dans `package.json` ait réellement augmenté (oubli de changeset, erreur manuelle), ce qui republierait une version déjà existante ou provoquerait un conflit de tag immuable plus tard dans le pipeline.

## Options

### Option 1 - Construire et pousser, valider la version au moment du tag final

Laisser le pipeline construire et pousser les images candidates, et ne détecter une version invalide qu'au moment de `_main-finalize-tags.yml`, lorsque le tag de version existe déjà avec un digest différent.

### Option 2 - Valider le plan de release avant tout build

Avant de lancer les builds, `_main-plan.yml` calcule la matrice des services impactés puis appelle `integration-release-plan.mjs`, qui compare pour chaque service la version de `package.json` à la version publiée dans le dernier manifeste d'Intégration et échoue immédiatement si la nouvelle version n'est pas strictement supérieure (`compareSemver`).

## Décision

L'option 2 est retenue : la validation de la croissance monotone des versions est effectuée avant tout build d'image, dans le job de planification.

## Conséquences

### Positives (Bénéfices)

- Une erreur de versionning (changeset oublié, version non incrémentée) est détectée immédiatement, avant de consommer du temps de build/scan sur des images qui seraient rejetées plus tard.
- Le résumé généré (`integration-release-plan.md`) donne une vue claire, par service, de la version précédente vs. la nouvelle version proposée.

### Négatives (Inconvénients)

- Ajoute une dépendance au dernier manifeste publié pour calculer le plan : si le manifeste n'est pas accessible ou est invalide, la planification échoue avant même de savoir si les services ont réellement besoin d'être republiés.
- Ne couvre que l'environnement d'Intégration ; la cohérence de version vis-à-vis de la Production est revalidée séparément lors du déploiement.

### Impact futur

Si un mécanisme de hotfix nécessitant de republier une version existante (sans incrément) devient nécessaire, cette contrainte de croissance stricte devra être assouplie pour ce cas précis.
