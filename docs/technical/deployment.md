# Déploiement, installation, exécution et build

## 1. Modes d'exécution supportés

Le projet peut être lancé de trois façons :

1. localement sans Docker complet pour l'application : backend et frontend tournent comme processus locaux, Docker ne lance que l'infrastructure ;
2. entièrement dans Docker Compose ;
3. mode mixte : commandes séparées pour le build et les tests.

Le `Makefile` simplifie ces scénarios, mais n'est pas obligatoire : les commandes sans `make` sont aussi fournies ci-dessous.

## 2. Prérequis d'environnement

### Dépendances obligatoires

| Outil          | Pourquoi il est nécessaire              | Remarque                                                   |
| -------------- | --------------------------------------- | ---------------------------------------------------------- |
| Git            | récupérer les sources                   | toute version récente                                      |
| Node.js        | exécuter backend/frontend localement    | viser Node 24                                              |
| npm            | installer les dépendances               | fourni avec Node.js                                        |
| Docker         | infrastructure et exécution full Docker | requis pour `db`, `redis`, `mailpit` et le Compose complet |
| Docker Compose | orchestration de conteneurs             | `docker compose`                                           |
| `make`         | optionnel, mais pratique                | sinon utiliser les commandes manuelles                     |

### Pour le frontend e2e

Il faut en plus :

- installer les navigateurs Playwright ;
- sous Linux, installer si nécessaire les dépendances système des navigateurs.

## 3. Ports par défaut

| Port   | Composant                    |
| ------ | ---------------------------- |
| `80`   | frontend dans Docker (Nginx) |
| `3000` | gateway                      |
| `3001` | auth-service                 |
| `3002` | project-service              |
| `3003` | task-service                 |
| `3004` | notification-service         |
| `3306` | MySQL                        |
| `6379` | Redis                        |
| `1025` | SMTP Mailpit                 |
| `8025` | interface Web Mailpit        |
| `5173` | serveur Vite                 |

Avant le lancement, vérifier que ces ports sont libres.

## 4. Fichiers env présents dans le dépôt

Le projet contient déjà des fichiers env prêts à l'emploi :

- `server/.env` : exécution locale du backend ;
- `server/.env.docker` : Docker Compose ;
- `server/.env.test` : mode test ;
- `client/.env` : frontend.

Il suffit de les modifier seulement si vous avez besoin d'autres ports, secrets ou hôtes.

## 5. Variables d'environnement backend

### 5.1 Paramètres runtime principaux

| Variable            | Exemple                       | Utilisée par              | Usage                          |
| ------------------- | ----------------------------- | ------------------------- | ------------------------------ |
| `NODE_ENV`          | `development` / `test`        | tous les services         | mode d'exécution               |
| `GATEWAY_PORT`      | `3000`                        | `gateway`                 | port du gateway                |
| `AUTH_PORT`         | `3001`                        | `auth-service`            | port de `auth-service`         |
| `PROJECT_PORT`      | `3002`                        | `project-service`         | port de `project-service`      |
| `TASK_PORT`         | `3003`                        | `task-service`            | port de `task-service`         |
| `NOTIFICATION_PORT` | `3004`                        | `notification-service`    | port de `notification-service` |
| `DB_DRIVER`         | `mysql` / `sqlite` / `memory` | auth/project/task         | choix du driver de stockage    |
| `BUS_PREFIX`        | `todo` / `test`               | project/task/notification | namespace des queues BullMQ    |

### 5.2 Base de données

| Variable              | Exemple                 | Usage                           | Important                                                                            |
| --------------------- | ----------------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| `SQLITE_DB_LOCATION`  | `./var/todo.db`         | chemin vers le fichier sqlite   | tous les drivers sqlite lisent la même clé                                           |
| `MYSQL_HOST`          | `localhost` / `db`      | hôte MySQL                      | requis pour le driver `mysql`                                                        |
| `MYSQL_PORT`          | `3306`                  | port MySQL                      | utilisé par l'infrastructure et l'attente du port                                    |
| `MYSQL_USER`          | `test_user`             | utilisateur MySQL               | utilisé par les services                                                             |
| `MYSQL_ROOT_PASSWORD` | `test_password`         | mot de passe de connexion       | le code actuel utilise cette clé comme mot de passe applicatif                       |
| `MYSQL_PASSWORD`      | `test_password`         | mot de passe du conteneur MySQL | nécessaire pour Compose et le healthcheck, mais non lu directement par l'application |
| `MYSQL_DATABASE`      | `test_todos`            | nom de la base                  | base commune aux services                                                            |
| `MYSQL_HOST_FILE`     | chemin vers secret file | optionnel                       | supporté par la connexion MySQL                                                      |
| `MYSQL_USER_FILE`     | chemin vers secret file | optionnel                       | supporté par la connexion MySQL                                                      |
| `MYSQL_PASSWORD_FILE` | chemin vers secret file | optionnel                       | supporté par la connexion MySQL                                                      |
| `MYSQL_DB_FILE`       | chemin vers secret file | optionnel                       | supporté par la connexion MySQL                                                      |

### 5.3 Auth et sécurité

| Variable         | Exemple            | Usage                 |
| ---------------- | ------------------ | --------------------- |
| `JWT_SECRET`     | `super_secret_key` | signature du JWT      |
| `JWT_EXPIRES_IN` | `7d`               | durée de vie du token |

### 5.4 Routage interservices

| Variable                   | Exemple                 | Utilisée dans | Usage                                            |
| -------------------------- | ----------------------- | ------------- | ------------------------------------------------ |
| `AUTH_SERVICE_URL`         | `http://localhost:3001` | gateway       | proxy de `/api/auth` et `/api/users`             |
| `PROJECT_SERVICE_URL`      | `http://localhost:3002` | gateway       | proxy de `/api/projects`                         |
| `TASK_SERVICE_URL`         | `http://localhost:3003` | env contract  | actuellement non utilisé directement par gateway |
| `NOTIFICATION_SERVICE_URL` | `http://localhost:3004` | gateway       | proxy de `/api/notifications`                    |

### 5.5 Redis et notifications

| Variable             | Exemple                 | Usage                                               |
| -------------------- | ----------------------- | --------------------------------------------------- |
| `REDIS_HOST`         | `localhost` / `redis`   | hôte Redis                                          |
| `REDIS_PORT`         | `6379`                  | port Redis                                          |
| `SMTP_HOST`          | `localhost` / `mailpit` | hôte SMTP                                           |
| `SMTP_PORT`          | `1025`                  | port SMTP                                           |
| `SMTP_FROM`          | `no-reply@todo.local`   | adresse expéditrice                                 |
| `NOTIFY_FALLBACK_TO` | `stub-user@todo.local`  | adresse de fallback si l'événement n'a pas d'e-mail |
| `NOTIFY_DRY_RUN`     | `0` / `1`               | mode dry-run pour l'e-mail                          |
| `SMTP_SECURE`        | `0` / `1`               | optionnel, TLS pour SMTP                            |
| `SSE_ALLOW_ORIGIN`   | `*`                     | CORS pour l'endpoint SSE                            |

### 5.6 Mode test

| Variable          | Valeur dans `.env.test` | Pourquoi                                       |
| ----------------- | ----------------------- | ---------------------------------------------- |
| `RUN_MYSQL_TESTS` | `1`                     | active les tests d'intégration basés sur MySQL |
| `BUS_PREFIX`      | `test`                  | isole les queues de test                       |
| `NOTIFY_DRY_RUN`  | `1`                     | interdit les e-mails réels pendant les tests   |

## 6. Variables d'environnement frontend

| Variable       | Exemple | Usage                   |
| -------------- | ------- | ----------------------- |
| `VITE_API_URL` | `/api`  | baseURL du client Axios |

En mode dev, Vite proxifie aussi les requêtes `/api/*` vers `http://localhost:3000`.

## 7. Installation du projet

### 7.1 Via `make` (uniquement sur linux)

Depuis la racine du projet :

```bash
make install
```

La commande exécute :

- `npm ci` dans `server` ;
- `npm ci` dans `client` ;
- `npx playwright install` dans `client`.

### 7.2 Sans `make`

```bash
cd server
npm ci

cd ../client
npm ci
npx playwright install
```

Si Playwright demande des dépendances système de navigateurs, installez-les avec les outils de votre OS puis relancez la commande.

## 8. Exécution locale du projet

### 8.1 Via `make`

#### Infrastructure uniquement

```bash
make infra-up
```

Conteneurs démarrés :

- MySQL
- Redis
- Mailpit

#### Backend uniquement

```bash
make up-backend
```

La commande démarre d'abord l'infrastructure, puis lance :

- `gateway`
- `auth-service`
- `project-service`
- `task-service`
- `notification-service`

#### Frontend uniquement

```bash
make up-frontend
```

#### Stack locale complète

```bash
make up
```

ou

```bash
make up-local
```

### 8.2 Sans `make`

Ouvrez trois terminaux.

#### Terminal 1 : infrastructure

```bash
cd server
npm run dev:infra
```

#### Terminal 2 : backend

```bash
cd server
npm run dev:all
```

#### Terminal 3 : frontend

```bash
cd client
npm run dev
```

Ensuite :

- le frontend est disponible sur `http://localhost:5173` ;
- l'API publique sur `http://localhost:3000/api` ;
- l'interface Mailpit sur `http://localhost:8025`.

## 9. Exécution complète du projet dans Docker

### 9.1 Via `make`

```bash
make up-docker
```

### 9.2 Sans `make`

```bash
docker compose up --build -d
```

Après le démarrage :

- l'application s'ouvre sur `http://localhost` ;
- le gateway est disponible sur `http://localhost:3000` ;
- l'interface Mailpit est disponible sur `http://localhost:8025`.

## 10. Build du projet

### 10.1 Via `make`

Build local Node/Vite :

```bash
make build
```

Build des images Docker :

```bash
make build-docker
```

### 10.2 Sans `make`

Backend :

```bash
cd server
npm run build
```

Frontend :

```bash
cd client
npm run build
```

Images Docker :

```bash
docker compose build
```

## 11. Arrêt et nettoyage

### 11.1 Via `make`

Arrêter les conteneurs Compose :

```bash
make down
```

Nettoyage complet des conteneurs, volumes et images du Compose :

```bash
make clean
```

### 11.2 Sans `make`

Arrêt standard :

```bash
docker compose down
```

Nettoyage avec volumes et images locales du Compose :

```bash
docker compose down -v --rmi local
```

## 12. Dépannage minimal

- Si `make install` échoue sur Playwright, installer les dépendances système navigateur puis relancer `npx playwright install` dans `client`.
- Si le backend ne démarre pas, vérifier d'abord `DB_DRIVER`, les variables MySQL/Redis/SMTP et l'occupation des ports.
- Si le frontend ne voit pas l'API, vérifier `VITE_API_URL`, le proxy Vite et l'état de `gateway`.
- Si les tests e2e échouent de façon intermittente, vérifier que rien n'écoute déjà sur `3000`, `3001`, `3002`, `3003`, `3004` et `5173`.
