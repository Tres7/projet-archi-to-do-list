# Documentation technique

Dernière mise à jour: 10 juin 2026.

Ce répertoire contient la documentation technique détaillée de l'application de gestion de projets et de tâches. Elle décrit l'état actuel du code source, des contrats HTTP, des événements BullMQ, de la persistance, de la sécurité, de l'exploitation Docker/local et des tests.

Le projet est une application full-stack pédagogique organisée en SPA React/Vite et en services Node.js/Express séparés:

- `gateway`: point d'entrée HTTP public et proxy vers les services internes;
- `auth-service`: inscription, login, profil utilisateur et JWT;
- `project-service`: cycle de vie des projets, projection `openTaskCount` et commandes de tâches;
- `task-service`: source de vérité des tâches et traitement asynchrone des commandes;
- `notification-service`: SSE, notifications utilisateur et e-mails;
- `client`: interface React, appels Axios, navigation protégée et consommation SSE;
- `server/common`: contrats partagés, bus de messages BullMQ, erreurs et middleware d'authentification.

## Documents disponibles

| Document                            | Contenu                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Architecture](architecture.md)     | vue d'ensemble, principes, flux principaux, frontières de services et contraintes d'architecture |
| [Microservices](microservices.md)   | responsabilités, cas d'usage, invariants et limites de chaque composant                          |
| [API](api.md)                       | routes HTTP publiques, statuts, contrats JSON, événements d'intégration et SSE                   |
| [Base de données](database.md)      | stratégie multi-driver, schémas MySQL/SQLite, repositories et limites de stockage                |
| [Sécurité](security.md)             | authentification JWT, frontières de confiance, risques connus et recommandations                 |
| [Déploiement](deployment.md)        | installation, variables d'environnement, Docker Compose, Dockerfiles, build et exploitation      |
| [Tests](testing.md)                 | suites Jest/Playwright, Makefile, coverage, CI et artefacts                                      |
| [Problèmes connus](known-issues.md) | dettes techniques, risques et plans de correction prioritaires                                   |

## Ordre de lecture recommandé

Pour intégrer un nouveau développeur:

1. [Architecture](architecture.md)
2. [Microservices](microservices.md)
3. [API](api.md)
4. [Déploiement](deployment.md)
5. [Tests](testing.md)

Pour faire évoluer le backend:

1. [Microservices](microservices.md)
2. [API](api.md)
3. [Base de données](database.md)
4. [Sécurité](security.md)
5. [Problèmes connus](known-issues.md)

Pour exploiter ou lancer le projet:

1. [Déploiement](deployment.md)
2. [Tests](testing.md)
3. [Sécurité](security.md)

## Sources de vérité dans le code

Les documents ci-dessus ont été alignés avec les fichiers suivants:

- `compose.yaml` et `Makefile` pour les modes d'exécution;
- `server/package.json`, `client/package.json` et les `package.json` des workspaces pour les scripts;
- `server/example.env`, `server/example.env.docker`, `server/example.env.test`, `client/example.env` pour la configuration;
- `server/apps/*/src/app.ts`, les contrôleurs et les routes pour les contrats HTTP;
- `server/common/contracts/events/*` et `server/common/messaging/*` pour les événements;
- `server/apps/*/src/infrastructure/persistence/**/schema.ts` pour les schémas de stockage;
- `client/src/shared/api`, `client/src/shared/notifications` et `client/src/shared/utils/tokenStorage.ts` pour le comportement frontend.

## Notes importantes

- Les fichiers `.env`, `.env.docker`, `.env.test` existent dans le dépôt avec des valeurs de développement; les fichiers `example.env*` documentent les mêmes clés.
- Le fichier Compose présent dans le dépôt est `compose.yaml`. Aucun `compose.prod.yml` n'est versionné dans l'état actuel.
- Les diagrammes utilisent Mermaid. Utiliser un lecteur Markdown compatible Mermaid pour les visualiser correctement.
- La documentation décrit l'état actuel du projet, y compris ses limites. Les points à corriger sont regroupés dans [Problèmes connus](known-issues.md).
