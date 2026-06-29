# Déploiement, installation, exécution et build

Dernière mise à jour: 29 juin 2026.

Ce document explique comment installer et lancer le projet localement, comment utiliser Docker Compose, quelles variables configurer, comment exécuter les migrations et comment fonctionne le déploiement par images immuables. La chaîne CI/CD complète est détaillée dans [CI/CD](ci-cd.md).

## 1. Modes d'exécution supportés

| Mode                   | Description                                                     | Commande principale                        |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| local complet          | MySQL/Redis/Mailpit dans Docker, backend et frontend sur l'hôte | `make up`                                  |
| backend local          | infrastructure Docker, cinq processus backend sur l'hôte        | `make up-backend`                          |
| frontend local         | Vite sur l'hôte                                                 | `make up-frontend`                         |
| Docker Compose complet | infrastructure, backend et frontend en conteneurs               | `make up-docker`                           |
| tests/CI               | suites Jest/Playwright avec orchestration Makefile/Compose      | `make test-backend`, `make test-frontend`  |
| production Compose     | images GHCR par digest rendues depuis manifest                  | `_deploy-compose.yml` / `compose.prod.yml` |

`compose.yaml` sert au développement et aux tests. `compose.prod.yml` sert aux déploiements: il ne build pas les services applicatifs et attend les variables `*_IMAGE`.

## 2. Prérequis

| Outil          | Version recommandée     | Usage                                      |
| -------------- | ----------------------- | ------------------------------------------ |
| Git            | récente                 | récupérer le dépôt                         |
| Node.js        | `24.x`                  | backend, frontend, CI                      |
| npm            | livré avec Node         | installation des dépendances               |
| Docker         | récent                  | MySQL, Redis, Mailpit, images applicatives |
| Docker Compose | plugin `docker compose` | orchestration locale/CI/déploiement        |
| make           | GNU Make                | raccourcis de build, run et tests          |

Pour Playwright sur l'hôte, installer les navigateurs avec:

```bash
cd client
npx playwright install
```

Le chemin recommandé pour les tests frontend reste `make test-frontend`, qui utilise l'image Docker officielle Playwright.

## 3. Ports

|          Port | Composant              | Mode                   |
| ------------: | ---------------------- | ---------------------- |
|          `80` | frontend Nginx         | Docker Compose complet |
|        `3000` | `gateway`              | local et Docker        |
|        `3001` | `auth-service`         | local                  |
|        `3002` | `project-service`      | local                  |
|        `3003` | `task-service`         | local                  |
|        `3004` | `notification-service` | local                  |
| `3100`-`3104` | backend en mode test   | tests                  |
|        `3306` | MySQL                  | infra Docker           |
|        `6379` | Redis                  | infra Docker           |
|        `1025` | SMTP Mailpit           | infra Docker           |
|        `8025` | Mailpit Web UI         | infra Docker           |
|        `5173` | Vite dev server        | local                  |

En production Compose, les ports publiés sont configurables avec `MYSQL_PORT_PUBLISHED`, `REDIS_PORT_PUBLISHED`, `MAILPIT_UI_PORT_PUBLISHED`, `MAILPIT_SMTP_PORT_PUBLISHED`, `GATEWAY_PORT_PUBLISHED` et `CLIENT_PORT_PUBLISHED`.

## 4. Fichiers de configuration

| Fichier                        | Usage                              |
| ------------------------------ | ---------------------------------- |
| `server/.env`                  | configuration backend locale       |
| `server/.env.docker`           | configuration backend pour Compose |
| `server/.env.test`             | configuration backend tests        |
| `server/example.env`           | exemple de configuration locale    |
| `server/example.env.docker`    | exemple Compose                    |
| `server/example.env.test`      | exemple tests                      |
| `client/.env`                  | configuration frontend locale      |
| `client/example.env`           | exemple frontend                   |
| `compose.yaml`                 | Compose développement/tests        |
| `compose.prod.yml`             | Compose production par images GHCR |
| `deploy/manifests/*.yaml`      | versions et digests de déploiement |
| `deploy/compatibility.yaml`    | compatibilité API entre versions   |
| `deploy/manifests/schema.json` | schéma JSON des manifests          |

Les `.env` versionnés contiennent des valeurs de développement. Pour un environnement partagé, remplacer les secrets et éviter de réutiliser `JWT_SECRET` ou les mots de passe fournis.

## 5. Variables backend

### Runtime et ports

| Variable            | Exemple local | Exemple Docker               | Usage                     |
| ------------------- | ------------- | ---------------------------- | ------------------------- |
| `NODE_ENV`          | `development` | `development` / `production` | mode runtime              |
| `GATEWAY_PORT`      | `3000`        | `3000`                       | port gateway              |
| `AUTH_PORT`         | `3001`        | `3001`                       | port auth-service         |
| `PROJECT_PORT`      | `3002`        | `3002`                       | port project-service      |
| `TASK_PORT`         | `3003`        | `3003`                       | port task-service         |
| `NOTIFICATION_PORT` | `3004`        | `3004`                       | port notification-service |

En test, les ports backend sont `3100` à `3104`.

### Persistance

| Variable              | Exemple            | Usage                                           |
| --------------------- | ------------------ | ----------------------------------------------- |
| `DB_DRIVER`           | `mysql`            | choix `memory`, `sqlite` ou `mysql`             |
| `SQLITE_DB_LOCATION`  | `./var/todo.db`    | fichier SQLite                                  |
| `MYSQL_HOST`          | `localhost` / `db` | hôte MySQL                                      |
| `MYSQL_PORT`          | `3306`             | port MySQL                                      |
| `MYSQL_USER`          | `test_user`        | utilisateur MySQL                               |
| `MYSQL_PASSWORD`      | `test_password`    | mot de passe applicatif recommandé              |
| `MYSQL_ROOT_PASSWORD` | `test_password`    | fallback historique et secret root du conteneur |
| `MYSQL_DATABASE`      | `test_todos`       | nom de base                                     |

Le code supporte aussi `MYSQL_HOST_FILE`, `MYSQL_USER_FILE`, `MYSQL_PASSWORD_FILE` et `MYSQL_DB_FILE` pour lire certains secrets depuis des fichiers.

### Authentification

| Variable                    | Exemple            | Usage                                              |
| --------------------------- | ------------------ | -------------------------------------------------- |
| `JWT_SECRET`                | `super_secret_key` | signature JWT                                      |
| `JWT_EXPIRES_IN`            | `7d`               | durée de vie du token                              |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `900000`           | fenêtre du rate limiter auth en production         |
| `AUTH_RATE_LIMIT_MAX`       | `10`               | maximum de requêtes auth par fenêtre en production |

### Routage interservices

| Variable                   | Local                   | Docker                             |
| -------------------------- | ----------------------- | ---------------------------------- |
| `AUTH_SERVICE_URL`         | `http://localhost:3001` | `http://auth-service:3001`         |
| `PROJECT_SERVICE_URL`      | `http://localhost:3002` | `http://project-service:3002`      |
| `TASK_SERVICE_URL`         | `http://localhost:3003` | `http://task-service:3003`         |
| `NOTIFICATION_SERVICE_URL` | `http://localhost:3004` | `http://notification-service:3004` |

`TASK_SERVICE_URL` est présent dans les env mais le `gateway` ne l'utilise pas actuellement.

### Redis, BullMQ et notifications

| Variable             | Exemple                 | Usage                         |
| -------------------- | ----------------------- | ----------------------------- |
| `REDIS_HOST`         | `localhost` / `redis`   | hôte Redis                    |
| `REDIS_PORT`         | `6379`                  | port Redis                    |
| `BUS_PREFIX`         | `todo` / `test`         | préfixe des queues BullMQ     |
| `SMTP_HOST`          | `localhost` / `mailpit` | hôte SMTP                     |
| `SMTP_PORT`          | `1025`                  | port SMTP                     |
| `SMTP_SECURE`        | `0`                     | TLS SMTP optionnel            |
| `SMTP_FROM`          | `no-reply@todo.local`   | expéditeur                    |
| `NOTIFY_FALLBACK_TO` | `stub-user@todo.local`  | destinataire fallback         |
| `NOTIFY_DRY_RUN`     | `0` / `1`               | désactive l'envoi réel si `1` |
| `SSE_ALLOW_ORIGIN`   | `*`                     | CORS SSE, optionnel           |

## 6. Variables frontend

| Variable           | Exemple | Usage                                     |
| ------------------ | ------- | ----------------------------------------- |
| `VITE_API_URL`     | `/api`  | base URL Axios                            |
| `VITE_API_VERSION` | `v2`    | version auth/users utilisée par le client |

Le client construit:

- `apiClient`: `${VITE_API_URL}/v1`, pour projets, tâches et notifications;
- `authApiClient`: `${VITE_API_URL}/${VITE_API_VERSION}`, pour auth et users.

En développement, Vite proxifie `/api/v1`, `/api/v2`, `/api/auth`, `/api/users`, `/api/projects` et `/api/notifications` vers `http://localhost:3000`.

En Docker:

- `VITE_API_URL` est injecté au build du client, avec `/api` par défaut;
- `VITE_API_VERSION` est injecté au runtime par `client/docker-entrypoint.sh` dans `/env-config.js`;
- `compose.yaml` fixe `VITE_API_VERSION=v2`;
- `compose.prod.yml` utilise `${VITE_API_VERSION:-v1}`, à définir dans `compose.env` ou via overrides de déploiement.

## 7. Installation

Depuis la racine:

```bash
make install
```

Cette cible exécute:

- `npm --prefix server ci`;
- `npm --prefix client ci`.

Pour installer aussi les navigateurs Playwright sur l'hôte:

```bash
make install-with-playwright
```

Sans Makefile:

```bash
cd server
npm ci

cd ../client
npm ci
```

## 8. Exécution locale recommandée

```bash
make up
```

Alias de `make up-local`, cette cible:

1. démarre `db`, `redis` et `mailpit`;
2. lance le backend avec `npm run dev:all`;
3. lance le frontend avec `npm run dev`.

URLs utiles:

- frontend: `http://localhost:5173`;
- gateway: `http://localhost:3000/api`;
- API v1: `http://localhost:3000/api/v1`;
- API v2 auth/users: `http://localhost:3000/api/v2`;
- Mailpit: `http://localhost:8025`.

## 9. Démarrages partiels

Démarrer seulement l'infrastructure:

```bash
make infra-up
```

Démarrer seulement le backend:

```bash
make up-backend
```

Démarrer seulement le frontend:

```bash
make up-frontend
```

Commandes manuelles équivalentes:

```bash
docker compose up -d db redis mailpit
```

```bash
cd server
npm run dev:all
```

```bash
cd client
npm run dev
```

## 10. Exécution Docker Compose complète

Avec Makefile:

```bash
make up-docker
```

Cette cible exécute:

```bash
docker compose --project-directory . -f compose.yaml up --build -d
```

Sans Makefile:

```bash
docker compose up --build -d
```

Après démarrage:

- application web: `http://localhost`;
- API gateway: `http://localhost:3000`;
- Mailpit: `http://localhost:8025`.

### Services Compose développement

| Service                | Image/build                                   | Rôle                             |
| ---------------------- | --------------------------------------------- | -------------------------------- |
| `db`                   | `mysql:8`                                     | base MySQL avec volume `db_data` |
| `redis`                | `redis:7-alpine`                              | broker BullMQ                    |
| `mailpit`              | `axllent/mailpit:latest`                      | SMTP et Web UI                   |
| `auth-service`         | `server/apps/auth-service/Dockerfile`         | auth et users                    |
| `project-service`      | `server/apps/project-service/Dockerfile`      | projets                          |
| `task-service`         | `server/apps/task-service/Dockerfile`         | tâches                           |
| `notification-service` | `server/apps/notification-service/Dockerfile` | SSE/e-mails                      |
| `gateway`              | `server/apps/gateway/Dockerfile`              | proxy HTTP                       |
| `client`               | `client/Dockerfile`                           | SPA servie par Nginx             |
| `playwright`           | image Playwright, profil `test`               | tests e2e frontend               |

`gateway` expose `3000:3000` et `client` expose `80:80`. Les services internes backend ne publient pas leurs ports dans `compose.yaml`.

## 11. Migrations

MySQL utilise Umzug et la table `schema_migrations`.

Au démarrage:

- `BaseMysqlConnection.init()` applique les migrations pending du service;
- `compose.prod.yml` lance aussi des one-shot containers `auth-service-migrate`, `project-service-migrate` et `task-service-migrate` avant les services.

Commandes explicites:

```bash
npm --prefix server run migrate:up -w @app/auth-service
npm --prefix server run migrate:down -w @app/auth-service
npm --prefix server run migrate:up -w @app/project-service
npm --prefix server run migrate:down -w @app/project-service
npm --prefix server run migrate:up -w @app/task-service
npm --prefix server run migrate:down -w @app/task-service
```

SQLite n'utilise pas ces migrations; il crée les tables depuis les fichiers `schema.ts`.

## 12. Build

Build local:

```bash
make build
```

Cette cible exécute:

- `npm --prefix server run build`;
- `npm --prefix client run build`.

Build Docker:

```bash
make build-docker
```

ou:

```bash
docker compose build
```

### Images backend

Les Dockerfiles backend utilisent des builds multi-stage:

1. stage `deps`: copie les `package.json` workspace nécessaires et installe avec `npm ci`;
2. stage `builder`: compile TypeScript;
3. stage `runner`: installe les dépendances production avec `npm ci --omit=dev`;
4. supprime `npm`/`npx` de l'image runner;
5. exécution en utilisateur `node`;
6. commande `node .../dist/index.js`.

Les services backend compilent aussi `@app/common`.

### Image frontend

Le Dockerfile client:

1. utilise `node:24-alpine` pour builder;
2. installe les dépendances;
3. compile avec `npm run build`;
4. copie `dist` dans `nginx:alpine`;
5. copie `client/nginx.conf`;
6. ajoute l'entrypoint qui génère `/env-config.js`;
7. expose le port `80`.

Nginx:

- sert la SPA avec fallback `try_files ... /index.html`;
- expose `/env-config.js` sans cache;
- proxifie `/api/` vers `http://gateway:3000`;
- réécrit aussi `/auth`, `/users`, `/projects`, `/notifications` vers `/api/*` pour compatibilité.

## 13. `compose.prod.yml`

`compose.prod.yml` attend des images immuables:

| Variable requise             | Service                                        |
| ---------------------------- | ---------------------------------------------- |
| `AUTH_SERVICE_IMAGE`         | `auth-service` et `auth-service-migrate`       |
| `PROJECT_SERVICE_IMAGE`      | `project-service` et `project-service-migrate` |
| `TASK_SERVICE_IMAGE`         | `task-service` et `task-service-migrate`       |
| `NOTIFICATION_SERVICE_IMAGE` | `notification-service`                         |
| `GATEWAY_IMAGE`              | `gateway`                                      |
| `CLIENT_IMAGE`               | `client`                                       |

Ces valeurs sont des références GHCR avec digest:

```text
ghcr.io/tres7/projet-archi-to-do-list/auth-service@sha256:<digest>
```

Validation locale depuis un manifest:

```bash
node .github/scripts/manifest.mjs validate-compose \
  --manifest deploy/manifests/manifest-0.0.5.yaml \
  --output /tmp/images.env
```

Rendre un compose complet depuis un manifest:

```bash
node .github/scripts/manifest.mjs render-compose \
  --manifest deploy/manifests/manifest-0.0.5.yaml \
  --output /tmp/compose.yml
```

## 14. Manifests de déploiement

Les manifests versionnés suivent le format:

```text
deploy/manifests/manifest-x.y.z.yaml
```

Chaque entrée de service contient:

- `version`;
- `sourceRevision`;
- `image`.

Commandes utiles:

```bash
node .github/scripts/manifest.mjs latest
node .github/scripts/manifest.mjs validate deploy/manifests/manifest-0.0.5.yaml
node .github/scripts/manifest.mjs list-images --manifest deploy/manifests/manifest-0.0.5.yaml
```

`deploy/manifests/integration.yaml` reste un manifest bootstrap utilisé par certaines validations. Les livraisons automatiques créent de nouveaux `manifest-x.y.z.yaml`.

## 15. Déploiement sur VM

Les workflows `deploy-integration.yml` et `release.yml` utilisent `.github/workflows/_deploy-compose.yml`.

Le workflow:

1. résout le manifest demandé ou le dernier manifest versionné;
2. valide manifest et compatibilité;
3. rend un `compose.yml` depuis `compose.prod.yml`;
4. copie un bundle sur la VM;
5. lance `.github/scripts/deploy/remote-compose-up.sh`.

Le script distant attend:

```text
<DEPLOY_PATH>/shared/server.env.docker
<DEPLOY_PATH>/shared/compose.env
```

Puis il:

- copie ces fichiers vers `<DEPLOY_PATH>/app`;
- applique les overrides éventuels;
- se connecte à GHCR;
- exécute `docker compose pull`;
- exécute `docker compose up -d --wait --remove-orphans` si possible;
- affiche `docker compose ps`.

Chemins par défaut:

| Environnement | Chemin                                     |
| ------------- | ------------------------------------------ |
| integration   | `/opt/projet-archi-to-do-list-integration` |
| production    | `/opt/projet-archi-to-do-list-production`  |

## 16. Mise à jour de versions

Utiliser Changesets:

```bash
make verup server
make verup client
```

Choisir le bon package:

- backend service modifié: sélectionner son package `@app/<service>`;
- changement dans `server/common`: sélectionner `@app/common` et les services consommateurs si leur comportement/runtime change;
- frontend runtime modifié: sélectionner `client`.

Après merge dans `main`, `pre_push_main.yml` applique les Changesets, publie les images concernées, crée un manifest versionné et déclenche integration. Voir [CI/CD](ci-cd.md) pour le détail.

## 17. Tests depuis le Makefile

Les détails sont dans [Tests](testing.md). Commandes principales:

```bash
make test-backend
make test-frontend
```

Autres cibles:

| Cible                               | Effet                                                        |
| ----------------------------------- | ------------------------------------------------------------ |
| `make test-backend-unit`            | lance seulement les tests unitaires backend                  |
| `make test-backend-integration`     | lance les tests integration backend sans démarrer l'infra    |
| `make test-backend-e2e`             | démarre `db`, `redis`, `mailpit`, puis lance les e2e backend |
| `make coverage-backend-unit`        | coverage unit                                                |
| `make coverage-backend-integration` | coverage integration sans démarrage infra                    |
| `make coverage-backend-e2e`         | infra + coverage e2e                                         |
| `make coverage-backend-all`         | enchaîne les trois coverages                                 |
| `make test-frontend`                | Playwright dans Docker                                       |
| `make test-frontend-host`           | Playwright sur l'hôte                                        |

## 18. Arrêt et nettoyage

Arrêt standard:

```bash
make down
```

Équivalent:

```bash
docker compose down
```

Nettoyage complet:

```bash
make clean
```

Équivalent:

```bash
docker compose down -v --rmi all --remove-orphans
```

Attention: `make clean` supprime les volumes, donc les données MySQL locales.

## 19. Dépannage

### Port déjà utilisé

Vérifier les ports `80`, `3000`-`3004`, `3306`, `6379`, `1025`, `8025`, `5173`.

### Backend ne démarre pas

Contrôler:

- `DB_DRIVER`;
- variables MySQL;
- `REDIS_HOST` / `REDIS_PORT`;
- `JWT_SECRET`;
- disponibilité de MySQL/Redis/Mailpit;
- migrations MySQL;
- logs du service concerné.

### Frontend ne voit pas l'API

Contrôler:

- `VITE_API_URL`;
- `VITE_API_VERSION`;
- proxy Vite;
- Nginx `/api/`;
- état de `gateway`;
- `AUTH_SERVICE_URL`, `PROJECT_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`.

### Notifications absentes

Contrôler:

- présence de `userId` dans le JWT;
- connexion `EventSource` vers `/api/v1/notifications/events?userId=...`;
- `REDIS_HOST`;
- workers BullMQ des services;
- logs `notification-service`;
- `NOTIFY_DRY_RUN` et Mailpit pour les e-mails.

### Tests e2e instables

Contrôler:

- ports libres;
- conteneurs Compose anciens;
- `server/.env.test`;
- isolation `BUS_PREFIX=test`;
- nettoyage des volumes si l'état MySQL est incohérent.
