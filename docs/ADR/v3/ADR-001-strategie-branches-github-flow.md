# Stratégie de branches : GitHub Flow (main + feat/fix)

**Status:** Accepté

## Contexte

L'équipe est petite (deux développeurs). Il faut une stratégie de gestion des branches qui permette un feedback rapide sur chaque modification, sans ajouter de complexité de gestion (branche `develop`, branches de release, hotfix dédiées, etc.) inutile pour la taille de l'équipe et la fréquence des livraisons.

## Options

### Option 1 - Git Flow (main + develop + feature/release/hotfix)

Une branche `develop` d'intégration, des branches `feature/*` fusionnées dans `develop`, des branches `release/*` préparant les publications, et des branches `hotfix/*` pour les correctifs urgents sur `main`.

### Option 2 - GitHub Flow (main + feat/fix)

Une seule branche longue (`main`), toujours déployable. Chaque changement part d'une branche `feat/*` ou `fix/*` créée depuis `main`, et y est fusionné via Pull Request après validation de la CI.

## Décision

L'option 2 (GitHub Flow) est retenue : `main` est la seule branche de référence, les branches `feat/*`/`fix/*` sont créées depuis `main` et fusionnées par Pull Request.

## Conséquences

### Positives (Bénéfices)

- Workflow simple à comprendre et à appliquer pour une petite équipe.
- Feedback rapide : chaque Pull Request vers `main` déclenche l'ensemble des contrôles qualité et sécurité.
- Pas de synchronisation supplémentaire à maintenir entre `develop` et `main`.

### Négatives (Inconvénients)

- Pas de branche d'intégration intermédiaire pour regrouper plusieurs fonctionnalités avant une publication.
- `main` doit rester stable et déployable en permanence, ce qui repose entièrement sur la qualité de la CI sur Pull Request.

### Impact futur

Si l'équipe grandit ou si le rythme de publication change, une étape supplémentaire (par exemple une branche de release) pourra être introduite sans remettre en cause la CI déjà en place sur Pull Request et `main`.
