# Tagging Docker en deux temps : candidate puis version/sha/main

**Status:** Accepté

## Contexte

Avant qu'une image Docker ne soit considérée comme publiable, elle doit passer un lint Dockerfile, un smoke test et un scan Trivy. Si ces vérifications échouent, il ne faut pas que l'image ait déjà reçu ses tags définitifs (version SemVer, sha, `main`), au risque de publier une image non vérifiée ou de devoir nettoyer des tags après coup.

## Options

### Option 1 - Taguer directement avec les tags définitifs avant vérification

Construire l'image avec ses tags finaux (`version`, `sha-<rev>`, `main`) puis la vérifier, en acceptant de devoir intervenir manuellement si la vérification échoue après coup.

### Option 2 - Tag candidate éphémère, puis promotion vers les tags définitifs

Construire et pousser l'image sous un tag `candidate-<run_id>-<sha>` unique (action `build-service-image`, mode `candidate`), la vérifier (lint, smoke test, scan Trivy) dans `_main-verify-image.yml`, puis seulement après succès et publication du manifeste, republier la même image (via `docker buildx imagetools create`, sans rebuild) sous ses tags définitifs `version`, `sha-<rev>` et `main` dans `_main-finalize-tags.yml`.

## Décision

L'option 2 est retenue : chaque image transite par un tag candidate avant de recevoir ses tags définitifs, qui ne sont posés qu'après succès complet de la chaîne de vérification et de publication du manifeste.

## Conséquences

### Positives (Bénéfices)

- Aucune image non vérifiée ne porte jamais un tag définitif (`version`, `main`) : le tag `main` ou un tag de version pointe toujours vers une image qui a passé tous les contrôles.
- `imagetools create` republie l'image existante par référence (digest) sans rebuild, évitant toute divergence entre l'image testée et l'image publiée.

### Négatives (Inconvénients)

- Ajoute de la complexité au pipeline (jobs `_main-verify-image`, `_main-push-image`, `_main-finalize-tags` distincts, artefacts intermédiaires à transporter entre jobs).
- Le tag `version_tag` est protégé contre toute réécriture (le job échoue si le tag existe déjà avec un digest différent), ce qui impose une discipline stricte sur l'incrémentation des versions.

### Impact futur

Ce mécanisme suppose que chaque service n'est publié qu'une fois par version ; toute évolution future qui permettrait de re-publier une version existante (hotfix sur un tag déjà publié) devra revoir cette contrainte d'immutabilité.
