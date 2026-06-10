# npm audit exécuté en nightly plutôt qu'à chaque Pull Request

**Status:** Accepté

## Contexte

`npm audit` vérifie les dépendances du projet par rapport à une base de vulnérabilités connues. Dependabot est déjà actif et ouvre automatiquement des Pull Requests de mise à jour dès qu'une dépendance vulnérable est détectée. Exécuter `npm audit` sur chaque Pull Request ajouterait un contrôle largement redondant avec Dependabot et allongerait le temps d'exécution de la CI sur Pull Request, alors que les dépendances ne changent que rarement (à l'ajout ou à la mise à jour d'un package).

## Options

### Option 1 - Exécuter npm audit sur chaque Pull Request

`npm audit` s'exécute pour `server/` et `client/` à chaque Pull Request vers `main`, en plus des autres contrôles de la Quality Gate.

### Option 2 - Exécuter npm audit en nightly, en complément de Dependabot

`npm audit` s'exécute une fois par jour sur `main`, indépendamment des Pull Requests.

## Décision

L'option 2 est retenue. `npm-audit-nightly.yml` s'exécute chaque jour sur `main` pour `server/` et `client/`. Les Pull Requests ne ré-exécutent pas cet audit.

## Conséquences

### Positives (Bénéfices)

- Temps d'exécution des Pull Requests réduit, sans step redondant avec Dependabot.
- Détection quotidienne de nouvelles vulnérabilités, indépendamment des Pull Requests en cours.
- Couverture complémentaire à Dependabot : alerte même si Dependabot n'a pas encore proposé de mise à jour pour la dépendance concernée.

### Négatives (Inconvénients)

- Une dépendance vulnérable ajoutée dans une Pull Request n'est détectée qu'au nightly suivant, pas immédiatement lors de la revue.

### Impact futur

Si le rythme d'ajout de nouvelles dépendances augmente fortement, un audit ciblé sur les fichiers `package.json`/`package-lock.json` modifiés pourrait être ajouté sur Pull Request en complément du nightly.
