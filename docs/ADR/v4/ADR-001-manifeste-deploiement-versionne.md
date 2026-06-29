# Manifeste de déploiement versionné, commité dans le dépôt

**Status:** Accepté

## Contexte

Le déploiement repose sur plusieurs microservices, chacun versionné et publié indépendamment en image Docker. Il faut un moyen unique de savoir, à un instant donné, quelle version (et quel digest exact) de chaque service constitue un déploiement valide en Intégration ou en Production, et de pouvoir promouvoir cet ensemble entre environnements de façon traçable.

## Options

### Option 1 - Source de vérité externe (GitOps)

Déléguer la définition de l'état désiré à un outil externe (par exemple Flux/Kustomize) qui surveille un registre ou un dépôt séparé et synchronise les environnements.

### Option 2 - Manifeste YAML versionné, commité dans le dépôt applicatif

Générer, à chaque release, un fichier `deploy/manifests/manifest-X.Y.Z.yaml` listant pour chaque service son `version`, son `sourceRevision` et son image figée par digest (`image@sha256:...`), validé contre un schéma JSON (`deploy/manifests/schema.json`) et commité directement dans le dépôt.

## Décision

L'option 2 est retenue : chaque release produit un manifeste versionné en SemVer (`manifestVersion`), commité dans le dépôt, qui fige les digests exacts des images de `auth-service`, `project-service`, `task-service`, `notification-service`, `gateway` et `client`.

## Conséquences

### Positives (Bénéfices)

- Traçabilité Git complète : chaque déploiement correspond à un commit identifiable, l'historique des manifestes constitue un historique de releases.
- Le digest figé (et non un tag mutable) garantit qu'un déploiement référencé reste reproductible même si un tag est retaggé.
- La promotion d'un environnement à l'autre devient une opération explicite (lire un manifeste, le valider, le déployer) plutôt qu'une synchronisation implicite.

### Négatives (Inconvénients)

- Ajoute un fichier généré au dépôt applicatif à chaque release, ce qui mélange code et artefacts de déploiement.
- Nécessite une étape supplémentaire (commit automatique du manifeste) dans le pipeline, donc un point de défaillance possible si ce commit échoue.

### Impact futur

Si le nombre de services ou d'environnements cibles augmente fortement, la simplicité du manifeste commité pourrait devenir limitante et justifier une migration vers un outil GitOps dédié sans remettre en cause le format du manifeste (qui reste lisible et réutilisable).
