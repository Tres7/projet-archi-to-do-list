# Microservices et zones de responsabilité

## 1. Cartographie des composants

| Composant              | Rôle principal                                           | Entrées                               | Sorties                                    | État possédé              |
| ---------------------- | -------------------------------------------------------- | ------------------------------------- | ------------------------------------------ | ------------------------- |
| `gateway`              | point d'entrée public et proxy HTTP/SSE                  | `/api/*`                              | requêtes proxifiées                        | aucun état métier         |
| `auth-service`         | identité, login, profil utilisateur                      | HTTP `/auth`, `/users`                | JWT, profils utilisateur                   | `users`                   |
| `project-service`      | projets, projection `openTaskCount`, commandes de tâches | HTTP `/projects`, événements `task.*` | événements `project.*`, commandes `task.*` | `projects`                |
| `task-service`         | tâches et cycle de vie `OPEN`/`DONE`                     | commandes BullMQ, request/reply       | événements `task.*`                        | `tasks`                   |
| `notification-service` | diffusion SSE et e-mails                                 | événements BullMQ, HTTP SSE           | événements navigateur, e-mails             | connexions SSE en mémoire |
| `client`               | expérience utilisateur web                               | navigateur, SSE, API HTTP             | requêtes HTTP, rendu UI                    | `localStorage`            |
| `server/common`        | contrats et infrastructure partagée                      | imports backend                       | types, middleware, bus                     | aucun état métier         |

## 2. `gateway`

### Responsabilité

`gateway` masque la topologie interne des services et expose un préfixe HTTP unique au frontend. Il ne contient pas de use case métier et ne valide pas actuellement le JWT. Il conserve les routes legacy et expose aussi une partie des routes versionnées `/api/v1` et `/api/v2`.

### Fichier principal

- `server/apps/gateway/index.ts`

### Routes publiques proxifiées

| Route publique            | Cible configurée           | Cible interne effective |
| ------------------------- | -------------------------- | ----------------------- |
| `/api/auth/*`             | `AUTH_SERVICE_URL`         | `/auth/*`               |
| `/api/users/*`            | `AUTH_SERVICE_URL`         | `/users/*`              |
| `/api/projects/*`         | `PROJECT_SERVICE_URL`      | `/projects/*`           |
| `/api/notifications/*`    | `NOTIFICATION_SERVICE_URL` | `/notifications/*`      |
| `/api/v1/auth/*`          | `AUTH_SERVICE_URL`         | `/v1/auth/*`            |
| `/api/v1/users/*`         | `AUTH_SERVICE_URL`         | `/v1/users/*`           |
| `/api/v1/projects/*`      | `PROJECT_SERVICE_URL`      | `/v1/projects/*`        |
| `/api/v1/notifications/*` | `NOTIFICATION_SERVICE_URL` | `/notifications/*`      |
| `/api/v2/auth/*`          | `AUTH_SERVICE_URL`         | `/v2/auth/*`            |
| `/api/v2/users/*`         | `AUTH_SERVICE_URL`         | `/v2/users/*`           |

### Variables utilisées

- `GATEWAY_PORT`;
- `AUTH_SERVICE_URL`;
- `PROJECT_SERVICE_URL`;
- `NOTIFICATION_SERVICE_URL`.

`TASK_SERVICE_URL` existe dans les fichiers d'environnement, mais `gateway` ne proxifie pas de route vers `task-service` dans l'état actuel.

### Ce qu'il ne doit pas faire

- stocker de l'état métier;
- importer les internals des services;
- exécuter les règles de domaine;
- devenir un orchestrateur de workflows.

## 3. `auth-service`

### Responsabilité

`auth-service` gère l'identité utilisateur, la vérification des mots de passe et l'émission de JWT.

### Fichiers clés

- `server/apps/auth-service/src/app.ts`;
- `server/apps/auth-service/src/application/AuthService.ts`;
- `server/apps/auth-service/src/application/UserService.ts`;
- `server/apps/auth-service/src/infrastructure/http/controllers/AuthController.ts`;
- `server/apps/auth-service/src/infrastructure/http/controllers/UserController.ts`;
- `server/apps/auth-service/src/infrastructure/persistence/*`.

### Entité principale

`User` contient:

- `id`;
- `userName`;
- `email`;
- `passwordHash`.
- `birthDate` optionnel, exposé par l'API v2.

### Cas d'usage

| Use case                              | Description                                                               |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `register(username, email, password)` | crée un utilisateur, vérifie l'unicité du username, hache le mot de passe |
| `register(..., birthDate)`            | en v2, exige une date `YYYY-MM-DD` et la retourne dans les DTO v2         |
| `login(username, password)`           | vérifie le mot de passe avec bcrypt et signe un JWT                       |
| `getUsers()`                          | retourne la liste des utilisateurs sans `passwordHash`                    |
| `getUserById(id)`                     | retourne un profil par id                                                 |
| `getUserByUsername(username)`         | retourne un profil par username                                           |
| `updateUsername(id, username)`        | change le username après vérification d'unicité                           |
| `changeUserPassword(id, password)`    | hache le nouveau mot de passe                                             |
| `deleteUser(id)`                      | supprime le compte utilisateur                                            |

### Invariants

- le `username` doit être unique;
- l'e-mail est unique au niveau du schéma;
- le mot de passe n'est jamais stocké en clair;
- le JWT contient `userId`, `email` et `username`;
- `JWT_SECRET` doit être défini.
- `login` et `register` ont un rate limiter actif en production.

### HTTP

`/auth/login`, `/v1/auth/login`, `/v2/auth/login` et les routes register associées sont publics. Toutes les routes `/users/*`, `/v1/users/*` et `/v2/users/*` passent par `authMiddleware`.

### Persistance

Le service utilise `UserRepository` et supporte `memory`, `sqlite` et `mysql` via `PersistenceFactory`.

## 4. `project-service`

### Responsabilité

`project-service` possède le modèle `Project`, l'autorisation par propriétaire et la projection `openTaskCount`. Il est aussi le service qui reçoit les commandes HTTP concernant les tâches, puis les convertit en commandes BullMQ destinées à `task-service`.

### Fichiers clés

- `server/apps/project-service/src/app.ts`;
- `server/apps/project-service/src/domain/entities/Project.ts`;
- `server/apps/project-service/src/application/ProjectService.ts`;
- `server/apps/project-service/src/application/ProjectTaskService.ts`;
- `server/apps/project-service/src/application/ProjectEventHandler.ts`;
- `server/apps/project-service/src/infrastructure/http/controllers/*`;
- `server/apps/project-service/src/infrastructure/messaging/ProjectEventConsumer.ts`;
- `server/apps/project-service/src/infrastructure/persistence/*`.

### Entité principale

`Project` contient:

- `id`;
- `ownerId`;
- `name`;
- `description`;
- `status`;
- `openTaskCount`.

### Value objects et règles

| Élément                 | Règle                                                 |
| ----------------------- | ----------------------------------------------------- |
| `ProjectName`           | trim, obligatoire, longueur maximale 120 caractères   |
| `ProjectStatus`         | `OPEN` ou `CLOSED`                                    |
| `OpenTaskCount`         | entier positif ou nul                                 |
| `assertOwnedBy(userId)` | rejette un utilisateur qui n'est pas propriétaire     |
| `assertOpen()`          | rejette les commandes de tâche sur un projet fermé    |
| `close()`               | interdit la clôture si `openTaskCount` n'est pas zéro |

### Cas d'usage synchrones

| Use case            | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `createProject`     | crée un projet `OPEN` et publie `project.created`            |
| `getProjects`       | liste les projets du propriétaire courant                    |
| `getProjectDetails` | agrège le projet et les tâches via request/reply BullMQ      |
| `closeProject`      | ferme un projet si le compteur de tâches ouvertes est à zéro |
| `deleteProject`     | supprime un projet après vérification du propriétaire        |

### Commandes de tâches

| Use case                  | Commande publiée               | Réponse HTTP                                |
| ------------------------- | ------------------------------ | ------------------------------------------- |
| `requestCreateTask`       | `task.creation.requested`      | `201 { accepted, operationId, resourceId }` |
| `requestToggleTaskStatus` | `task.status-toggle.requested` | `202 { accepted, operationId, resourceId }` |
| `requestDeleteTask`       | `task.deletion.requested`      | `202 { accepted, operationId, resourceId }` |

### Événements consommés

| Événement       | Effet local                                | Événement republié                          |
| --------------- | ------------------------------------------ | ------------------------------------------- |
| `task.created`  | incrémente `openTaskCount`                 | `task.created` vers `notification-service`  |
| `task.closed`   | décrémente `openTaskCount`                 | `task.closed` vers `notification-service`   |
| `task.reopened` | incrémente `openTaskCount`                 | `task.reopened` vers `notification-service` |
| `task.deleted`  | décrémente si l'ancien statut était `OPEN` | `task.deleted` vers `notification-service`  |

### Limites

- `getProjectDetails` utilise un request/reply de 5 secondes vers `task-service`;
- certains chemins d'erreur sont encore mappés en `500` générique;
- la projection `openTaskCount` dépend du bon traitement des événements.

## 5. `task-service`

### Responsabilité

`task-service` est la source de vérité des tâches. Il reçoit des commandes asynchrones et publie les faits métier finaux.

### Fichiers clés

- `server/apps/task-service/src/app.ts`;
- `server/apps/task-service/src/domain/entities/Task.ts`;
- `server/apps/task-service/src/application/TaskService.ts`;
- `server/apps/task-service/src/application/TaskEventHandler.ts`;
- `server/apps/task-service/src/application/task-event-publisher.ts`;
- `server/apps/task-service/src/infrastructure/messaging/TaskEventConsumer.ts`;
- `server/apps/task-service/src/infrastructure/persistence/*`.

### Entité principale

`Task` contient:

- `id`;
- `userId`;
- `projectId`;
- `createdAt`;
- `name`;
- `description`;
- `status`.

### Value objects et règles

| Élément          | Règle                                               |
| ---------------- | --------------------------------------------------- |
| `TaskName`       | trim, obligatoire, longueur maximale 120 caractères |
| `TaskStatus`     | `OPEN` ou `DONE`                                    |
| `toggleStatus()` | bascule `OPEN` vers `DONE` et `DONE` vers `OPEN`    |
| `createdAt`      | normalisé à la minute UTC lors de la création       |

### Commandes consommées

| Commande                       | Effet en cas de succès                                     | Échec publié                  |
| ------------------------------ | ---------------------------------------------------------- | ----------------------------- |
| `task.creation.requested`      | crée une tâche `OPEN`, publie `task.created`               | `task.creation.rejected`      |
| `task.status-toggle.requested` | vérifie `taskId`, `projectId`, `userId`, bascule le statut | `task.status-toggle.rejected` |
| `task.deletion.requested`      | vérifie `taskId`, `projectId`, `userId`, supprime la tâche | `task.deletion.rejected`      |

### Request/reply

`task-service` répond à:

- requête: `task.list.requested`;
- réponse: `task.list.replied`;
- queue: `task-service`.

La réponse contient les tâches du projet avec `id`, `name`, `description`, `status`, `createdAt`, `userId` et `projectId`.

### HTTP

Le service expose uniquement:

```http
GET /health
```

Il n'expose pas de routes HTTP métier publiques.

## 6. `notification-service`

### Responsabilité

`notification-service` transforme les événements d'intégration en événements client et en e-mails.

### Fichiers clés

- `server/apps/notification-service/src/app.ts`;
- `server/apps/notification-service/src/notification.module.ts`;
- `server/apps/notification-service/src/application/NotificationEventHandler.ts`;
- `server/apps/notification-service/src/infrastructure/messaging/NotificationBusRegistrar.ts`;
- `server/apps/notification-service/src/infrastructure/sse/*`;
- `server/apps/notification-service/src/infrastructure/email/NodemailerEmailSender.ts`.

### Événements consommés

| Événement backend             | Effet SSE            | Effet e-mail            |
| ----------------------------- | -------------------- | ----------------------- |
| `project.created`             | `project.created`    | aucun                   |
| `project.closed`              | `project.closed`     | e-mail "Project closed" |
| `project.deleted`             | `project.deleted`    | aucun                   |
| `task.created`                | `task.created`       | aucun                   |
| `task.closed`                 | `task.updated`       | aucun                   |
| `task.reopened`               | `task.updated`       | e-mail "Task reopened"  |
| `task.deleted`                | `task.deleted`       | aucun                   |
| `task.creation.rejected`      | `operation.rejected` | aucun                   |
| `task.status-toggle.rejected` | `operation.rejected` | aucun                   |
| `task.deletion.rejected`      | `operation.rejected` | aucun                   |

### SSE

L'endpoint interne est:

```http
GET /notifications/events?userId=<user-id>
```

Via `gateway`, le frontend l'appelle sous:

```http
GET /api/v1/notifications/events?userId=<user-id>
```

Le hub SSE:

- stocke les connexions par `userId`;
- envoie un événement `connected` à l'ouverture;
- envoie un heartbeat commentaire toutes les 25 secondes;
- supprime la connexion à la fermeture de la requête.

### E-mails

L'envoi est fait par Nodemailer. Les variables principales sont:

- `SMTP_HOST`;
- `SMTP_PORT`;
- `SMTP_SECURE`;
- `SMTP_FROM`;
- `NOTIFY_FALLBACK_TO`;
- `NOTIFY_DRY_RUN`.

En test, `NOTIFY_DRY_RUN=1` journalise l'e-mail au lieu de l'envoyer.

### Limites

- le service ne valide pas le JWT du flux SSE;
- les connexions sont en mémoire;
- l'historique n'est pas persisté côté backend;
- le scaling horizontal nécessite une stratégie supplémentaire.

## 7. `client`

### Responsabilité

Le client React fournit l'interface utilisateur et orchestre les appels API et SSE.

### Fichiers clés

- `client/src/app/App.tsx`;
- `client/src/shared/api/apiClient.ts`;
- `client/src/shared/utils/tokenStorage.ts`;
- `client/src/shared/notifications/*`;
- `client/src/features/*`;
- `client/src/pages/*`.

### Routes UI

| Route                  | Accès   | Écran                         |
| ---------------------- | ------- | ----------------------------- |
| `/auth`                | public  | login et inscription          |
| `/`                    | protégé | redirection vers `/projects`  |
| `/projects`            | protégé | liste et création des projets |
| `/projects/:projectId` | protégé | détail projet et tâches       |
| `/profile`             | protégé | profil utilisateur            |

La protection UI repose sur la présence de `auth_token` dans `localStorage`.

### API client

`apiClient` utilise `${VITE_API_URL}/v1` comme `baseURL` pour projets, tâches et notifications. `authApiClient` utilise `${VITE_API_URL}/${VITE_API_VERSION}` pour auth et users. Les deux ajoutent le JWT à chaque requête si le token existe.

### Stockage local

| Clé                             | Contenu                                         |
| ------------------------------- | ----------------------------------------------- |
| `auth_token`                    | JWT                                             |
| `username_cache`                | cache temporaire du username                    |
| `notifications_<userId>`        | historique local des 20 dernières notifications |
| `notifications_unread_<userId>` | compteur non lu                                 |

### Notifications côté UI

Le client se connecte avec:

```ts
new EventSource(`/api/v1/notifications/events?userId=${userId}`);
```

Les événements de type `project.*` rafraîchissent la liste des projets. Les événements `task.*` rafraîchissent le détail du projet concerné. Les événements `operation.rejected` affichent la raison de l'échec sur la page de détail.

## 8. `server/common`

### Responsabilité

`server/common` regroupe le code partagé nécessaire aux services backend.

### Contenu principal

| Zone                           | Rôle                                            |
| ------------------------------ | ----------------------------------------------- |
| `contracts/events`             | noms, payloads, enveloppe et map d'événements   |
| `contracts/queries`            | DTO de détail projet                            |
| `contracts/requests`           | réponse standard d'opération acceptée           |
| `messaging`                    | interface `MessageBus` et implémentation BullMQ |
| `middleware/authMiddleware.ts` | vérification JWT Express                        |
| `errors`                       | erreurs métier communes                         |

### Règle de maintenance

Toute modification d'un événement ou d'un DTO partagé doit être synchronisée avec:

- les handlers producteurs;
- les handlers consommateurs;
- les tests unitaires et e2e;
- la documentation [API](api.md).
