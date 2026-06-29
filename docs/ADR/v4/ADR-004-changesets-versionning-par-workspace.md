# Changesets pour le versionning décentralisé par workspace

**Status:** Accepté

## Contexte

Le monorepo contient plusieurs packages npm workspaces côté serveur (`auth-service`, `project-service`, `task-service`, `notification-service`, `gateway`, `common`) et côté client, chacun versionné indépendamment en SemVer (pilier 1 : version dans `package.json`). Il faut décider qui déclenche le bump de version de chaque package et comment ce bump est calculé à partir des changements réels.

## Options

### Option 1 - semantic-release sur convention de commits

Dériver automatiquement le type de bump (patch/minor/major) à partir du message de chaque commit (Conventional Commits), de façon centralisée pour tout le monorepo.

### Option 2 - Changesets (@changesets/cli) déclaratifs par PR

Demander à chaque Pull Request d'ajouter un fichier `.changeset/<id>.md` déclarant explicitement le type de bump par package impacté, valider sa présence sur PR (`validate-changesets.mjs`), puis exécuter `changeset version` au merge sur `main` (`_main-version-packages.yml`) pour appliquer les bumps et générer les changelogs.

## Décision

L'option 2 est retenue : chaque PR doit déclarer explicitement, via un changeset, l'impact de version par package ; le bump et le changelog sont générés automatiquement au merge sur `main`.

## Conséquences

### Positives (Bénéfices)

- Le bump de version est une décision explicite de l'auteur de la PR plutôt qu'une inférence automatique fragile basée sur le format du message de commit.
- Chaque package évolue à son propre rythme (`updateInternalDependencies: patch` propage les changements internes sans forcer un bump major partout).

### Négatives (Inconvénients)

- Repose sur la discipline des contributeurs : un changeset oublié bloque la PR (vérifié par `validate-changesets.mjs`), ce qui ajoute une étape manuelle à chaque PR.
- Deux configurations Changesets à maintenir (`server/.changeset/config.json` et `client/.changeset/config.json`) plutôt qu'une configuration unique.

### Impact futur

Si l'équipe grandit, la validation de la présence d'un changeset pourra être complétée par une validation de sa cohérence (bump cohérent avec l'ampleur réelle du changement), actuellement non automatisée.
