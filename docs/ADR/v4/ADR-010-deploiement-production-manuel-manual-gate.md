# Déploiement en Production déclenché manuellement (Manual Gate)

**Status:** Accepté

## Contexte

Le cours impose deux environnements cibles avec des règles de promotion différentes : déploiement automatique en Intégration, puis validation manuelle de la version avant tout déploiement en Production. Le pipeline doit donc distinguer clairement un déclenchement automatique (sans risque, réversible) d'un déclenchement contrôlé (vers l'environnement de production).

## Options

### Option 1 - Promotion automatique vers la Production après succès en Intégration

Déclencher automatiquement le déploiement Production (`release.yml`) dès que le déploiement Intégration (`deploy-integration.yml`) se termine avec succès, par exemple via un trigger `workflow_run`.

### Option 2 - Déploiement Intégration automatique, Production déclenchée manuellement

`pre_push_main.yml` déclenche automatiquement `deploy-integration.yml` (`gh workflow run deploy-integration.yml`) après publication réussie du manifeste sur merge dans `main`. En revanche, `release.yml` (déploiement Production) n'est déclenché que par `workflow_dispatch`, c'est-à-dire par une action manuelle explicite indiquant la version du manifeste à déployer.

## Décision

L'option 2 est retenue : seul le déploiement en Intégration est automatique ; le déploiement en Production exige un déclenchement manuel explicite (`workflow_dispatch` sur `release.yml`), qui constitue le Manual Gate attendu.

## Conséquences

### Positives (Bénéfices)

- Respecte directement l'exigence du cours : aucune version ne peut atteindre la Production sans validation explicite de son comportement en Intégration.
- Le déclenchement manuel de `release.yml` permet de choisir précisément la version du manifeste à promouvoir (`manifest_version`), sans devoir promouvoir nécessairement la dernière version d'Intégration.

### Négatives (Inconvénients)

- Repose sur une action humaine pour ne pas bloquer indéfiniment une version validée en Intégration ; il n'y a pas de rappel automatique si une version reste en attente de promotion.
- Le couplage entre Manual Gate et `workflow_dispatch` n'empêche pas, techniquement, un déclenchement manuel prématuré (avant qu'une vérification fonctionnelle réelle n'ait été faite en Intégration) : la garantie est procédurale, pas automatisée.

### Impact futur

Le `workflow_dispatch` pourra être complété par une approbation GitHub Environment obligatoire sur `production` (reviewers requis) pour renforcer la garantie procédurale par un contrôle d'accès, sans changer le modèle de déclenchement.
