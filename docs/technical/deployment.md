# Déploiement, installation, exécution et build

## 1. Modes d'exécution supportés

Le projet peut être lancé de trois façons:

| Mode                   | Description                                                     | Commande principale                       |
| ---------------------- | --------------------------------------------------------------- | ----------------------------------------- |
| local complet          | MySQL/Redis/Mailpit dans Docker, backend et frontend sur l'hôte | `make up`                                 |
| Docker Compose complet | infrastructure, backend et frontend en conteneurs               | `make up-docker`                          |
| CI/tests               | suites Jest/Playwright avec orchestration Makefile/Compose      | `make test-backend`, `make test-frontend` |

Le fichier Compose de développement est `compose.yaml`. Le fichier `compose.prod.yml` est réservé aux validations et déploiements par références d'images immuables issues des manifests.

## 2. Prérequis

| Outil          | Version recommandée     | Usage                                      |
| -------------- | ----------------------- | ------------------------------------------ |
| Git            | récente                 | récupérer le dépôt                         |
| Node.js        | `24.x`                  | backend, frontend, CI                      |
| npm            | livré avec Node         | installation des dépendances               |
| Docker         | récent                  | MySQL, Redis, Mailpit, images applicatives |
| Docker Compose | plugin `docker compose` | orchestration locale/CI                    |
| make           | GNU Make                | raccourcis de build, run et tests          |

Pour Playwright sur l'hôte, les navigateurs doivent être installés avec `npx playwright install`. Le chemin recommandé pour les tests frontend utilise toutefois l'image Docker Playwright.

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

Avant de lancer la stack, vérifier que ces ports ne sont pas déjà occupés.

## 4. Fichiers de configuration

Le dépôt contient les fichiers suivants:

| Fichier                     | Usage                              |
| --------------------------- | ---------------------------------- |
| `server/.env`               | configuration backend locale       |
| `server/.env.docker`        | configuration backend pour Compose |
| `server/.env.test`          | configuration backend tests        |
| `server/example.env`        | exemple de configuration locale    |
| `server/example.env.docker` | exemple Compose                    |
| `server/example.env.test`   | exemple tests                      |
| `client/.env`               | configuration frontend locale      |
| `client/example.env`        | exemple frontend                   |
| `compose.prod.yml`          | Compose production par image digest |
| `deploy/manifests/*.yaml`   | versions et digests par environnement |
| `deploy/manifests/schema.json` | schéma JSON des manifests        |

Les `.env` versionnés contiennent des valeurs de développement. Pour un environnement partagé, remplacer les secrets et éviter de réutiliser `JWT_SECRET` ou les mots de passe fournis.

## 5. Variables backend

### Runtime et ports

| Variable            | Exemple local | Exemple Docker | Usage                     |
| ------------------- | ------------- | -------------- | ------------------------- |
| `NODE_ENV`          | `development` | `development`  | mode runtime              |
| `GATEWAY_PORT`      | `3000`        | `3000`         | port gateway              |
| `AUTH_PORT`         | `3001`        | `3001`         | port auth-service         |
| `PROJECT_PORT`      | `3002`        | `3002`         | port project-service      |
| `TASK_PORT`         | `3003`        | `3003`         | port task-service         |
| `NOTIFICATION_PORT` | `3004`        | `3004`         | port notification-service |

En test, les ports sont `3100` à `3104`.

### Persistance

| Variable              | Exemple            | Usage                               |
| --------------------- | ------------------ | ----------------------------------- |
| `DB_DRIVER`           | `mysql`            | choix `memory`, `sqlite` ou `mysql` |
| `SQLITE_DB_LOCATION`  | `./var/todo.db`    | fichier SQLite                      |
| `MYSQL_HOST`          | `localhost` / `db` | hôte MySQL                          |
| `MYSQL_PORT`          | `3306`             | port MySQL                          |
| `MYSQL_USER`          | `test_user`        | utilisateur MySQL                   |
| `MYSQL_PASSWORD`      | `test_password`    | mot de passe conteneur/healthcheck  |
| `MYSQL_ROOT_PASSWORD` | `test_password`    | mot de passe lu par le code actuel  |
| `MYSQL_DATABASE`      | `test_todos`       | nom de base                         |

Le code supporte aussi `MYSQL_HOST_FILE`, `MYSQL_USER_FILE`, `MYSQL_PASSWORD_FILE` et `MYSQL_DB_FILE` pour lire certains secrets depuis des fichiers.

### Authentification

| Variable         | Exemple            | Usage                 |
| ---------------- | ------------------ | --------------------- |
| `JWT_SECRET`     | `super_secret_key` | signature JWT         |
| `JWT_EXPIRES_IN` | `7d`               | durée de vie du token |

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

| Variable       | Exemple | Usage          |
| -------------- | ------- | -------------- |
| `VITE_API_URL` | `/api`  | base URL Axios |

En développement, Vite proxifie les préfixes `/api/auth`, `/api/users`, `/api/projects` et `/api/notifications` vers `http://localhost:3000`.

En Docker, le `Dockerfile` client reçoit `VITE_API_URL` comme argument de build, avec `/api` dans `compose.yaml`.

## 7. Installation

### Avec Makefile

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

### Sans Makefile

```bash
cd server
npm ci

cd ../client
npm ci
```

Option Playwright hôte:

```bash
cd client
npx playwright install
```

## 8. Exécution locale

### Chemin recommandé

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
- Mailpit: `http://localhost:8025`.

### Démarrer seulement l'infrastructure

```bash
make infra-up
```

Services démarrés:

- MySQL;
- Redis;
- Mailpit.

### Démarrer seulement le backend

```bash
make up-backend
```

Cette cible démarre l'infrastructure, puis lance les cinq processus backend localement.

### Démarrer seulement le frontend

```bash
make up-frontend
```

### Commandes manuelles

Terminal 1, depuis la racine:

```bash
docker compose up -d db redis mailpit
```

Terminal 2:

```bash
cd server
npm run dev:all
```

Terminal 3:

```bash
cd client
npm run dev
```

## 9. Exécution Docker Compose complète

### Avec Makefile

```bash
make up-docker
```

Cette cible exécute:

```bash
docker compose --project-directory . -f compose.yaml up --build -d
```

### Sans Makefile

```bash
docker compose up --build -d
```

Après démarrage:

- application web: `http://localhost`;
- API gateway: `http://localhost:3000`;
- Mailpit: `http://localhost:8025`.

### Services Compose

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

### Compose production

`compose.prod.yml` ne construit pas d'images applicatives. Il attend une référence immuable par service:

| Service                | Variable requise              |
| ---------------------- | ----------------------------- |
| `auth-service`         | `AUTH_SERVICE_IMAGE`          |
| `project-service`      | `PROJECT_SERVICE_IMAGE`       |
| `task-service`         | `TASK_SERVICE_IMAGE`          |
| `notification-service` | `NOTIFICATION_SERVICE_IMAGE`  |
| `gateway`              | `GATEWAY_IMAGE`               |
| `client`               | `CLIENT_IMAGE`                |

Ces valeurs doivent être des références GHCR avec digest, par exemple:

```text
ghcr.io/tres7/projet-archi-to-do-list/auth-service@sha256:<digest>
```

Le fichier d'environnement Compose n'est pas versionné. Il est généré depuis un manifest:

```bash
node .github/scripts/manifest.mjs render-compose-env \
  --manifest deploy/manifests/integration.yaml \
  --output /tmp/integration-images.env

docker compose \
  --env-file /tmp/integration-images.env \
  -f compose.prod.yml \
  config
```

Le CI utilise la commande courte équivalente:

```bash
node .github/scripts/manifest.mjs validate-compose \
  --manifest deploy/manifests/integration.yaml \
  --output /tmp/integration-images.env
```

## 10. Build

### Build local

```bash
make build
```

Cette cible exécute:

- `npm --prefix server run build`;
- `npm --prefix client run build`.

Manuellement:

```bash
cd server
npm run build

cd ../client
npm run build
```

### Build Docker

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
4. exécution en utilisateur `node`;
5. commande `node .../dist/index.js`.

Les services métier compilent aussi `@app/common`. Le `gateway` ne dépend pas de `@app/common`.

### Image frontend

Le Dockerfile client:

1. utilise `node:24-alpine` pour builder;
2. installe les dépendances;
3. compile avec `npm run build`;
4. copie `dist` dans `nginx:alpine`;
5. copie `client/nginx.conf`;
6. expose le port `80`.

Nginx:

- sert la SPA avec fallback `try_files ... /index.html`;
- proxifie `/api/` vers `http://gateway:3000`;
- conserve les en-têtes `Host`, `X-Real-IP`, `X-Forwarded-*`.

## 11. Tests depuis le Makefile

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

## 12. Arrêt et nettoyage

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

## 13. Dépannage

### Port déjà utilisé

Vérifier les ports `80`, `3000`-`3004`, `3306`, `6379`, `1025`, `8025`, `5173`.

### Backend ne démarre pas

Contrôler:

- `DB_DRIVER`;
- variables MySQL;
- `REDIS_HOST` / `REDIS_PORT`;
- `JWT_SECRET`;
- disponibilité de MySQL/Redis/Mailpit;
- logs du service concerné.

### Frontend ne voit pas l'API

Contrôler:

- `VITE_API_URL`;
- proxy Vite;
- Nginx `/api/`;
- état de `gateway`;
- `AUTH_SERVICE_URL`, `PROJECT_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`.

### Notifications absentes

Contrôler:

- présence de `userId` dans le JWT;
- connexion `EventSource` vers `/api/notifications/events?userId=...`;
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

## 14. Manifests de déploiement

Le dépôt maintient deux manifests:

| Manifest | Rôle |
| -------- | ---- |
| `deploy/manifests/integration.yaml` | versions et digests en cours de validation |
| `deploy/manifests/production.yaml` | versions et digests censés être utilisés par les utilisateurs |

Chaque manifest contient `schemaVersion`, `environment`, puis une entrée pour chacun des six services runtime. Une entrée contient seulement:

- `version`;
- `sourceRevision`;
- `image`.

Les manifests initiaux sont des entrées d'amorçage validables localement. Aucun digest GHCR réel correspondant aux versions actuelles n'a été trouvé lors de la mise en place; le premier release flow remplace les entrées concernées par les digests produits par GHCR.

Validation locale:

```bash
node .github/scripts/manifest.mjs validate deploy/manifests/integration.yaml
node .github/scripts/manifest.mjs validate deploy/manifests/production.yaml
```

Le script valide la syntaxe YAML, `deploy/manifests/schema.json`, la présence de tous les services, le format SemVer, le SHA Git complet, les références GHCR avec `@sha256`, l'absence de `latest`, et le nom de service dans l'image.

## 15. Release, promotion et rollback

Après merge dans `main`, `pre_push_main.yml` détecte les services runtime réellement modifiés, construit seulement ces images, scanne le digest et publie un petit artifact JSON:

```json
{
  "service": "auth-service",
  "version": "1.4.0",
  "sourceRevision": "<full-git-sha>",
  "image": "ghcr.io/tres7/projet-archi-to-do-list/auth-service@sha256:<digest>"
}
```

Le même workflow télécharge ces artifacts, met à jour uniquement les services publiés dans `integration.yaml`, régénère `deploy/compose/integration.yml`, valide le résultat, puis ouvre ou met à jour une seule Pull Request sur `deploy/update-integration`. Un groupe de concurrence unique empêche deux publications parallèles d'écraser les changements l'une de l'autre.

La promotion production est manuelle via `release.yml`. Elle copie exactement une entrée, ou toutes les entrées, depuis `integration.yaml` vers `production.yaml`:

- même `version`;
- même `sourceRevision`;
- même `image` et donc même digest.

Elle ne build pas, ne push pas, ne retag pas, ne crée pas de nouvelle version et ne modifie pas `integration.yaml`. Elle régénère `deploy/compose/production.yml` et ouvre ou met à jour une Pull Request sur `deploy/promote-production`.

Le rollback applicatif se fait aussi par manifest:

```text
restaurer l'ancienne entrée du service dans production.yaml
→ créer/merger la Pull Request
→ le workflow production valide et déploie l'ancien digest si un target réel existe
```

Un rollback d'image ne garantit pas le rollback d'une migration de base irréversible. Aucun framework de migrations n'est ajouté dans ce flux.

## 16. Déploiement réel

Les workflows actuels valident les manifests, génèrent les fichiers Compose versionnés et exécutent `docker compose config` pendant les PR, les publications integration et les promotions production.

Aucun target réel n'est configuré dans le dépôt actuellement: pas de runner self-hosted, SSH, VM, Docker host distant, Kubernetes ou plateforme cloud. Par conséquent:

- `pre_push_main.yml` prépare les fichiers integration prêts à déployer;
- `release.yml` prépare les fichiers production prêts à déployer.

Pour activer un vrai déploiement, il faut d'abord configurer l'environnement GitHub `production` avec reviewers requis, secrets d'accès au target, et runner/connexion réseau adaptés. Les commandes de déploiement devront ensuite pull et lancer les exacts digests du manifest, sans rebuild ni retag.
