# API: HTTP, événements et SSE

## 1. Points d'entrée

### Développement local

| Usage                         | URL                                           |
| ----------------------------- | --------------------------------------------- |
| frontend Vite                 | `http://localhost:5173`                       |
| API publique via gateway      | `http://localhost:3000/api`                   |
| API projets/notifications     | `http://localhost:3000/api/v1`                |
| API auth/users v2             | `http://localhost:3000/api/v2`                |
| health `gateway`              | pas de `/health` dédié dans le gateway actuel |
| health `auth-service`         | `http://localhost:3001/health`                |
| health `project-service`      | `http://localhost:3002/health`                |
| health `task-service`         | `http://localhost:3003/health`                |
| health `notification-service` | `http://localhost:3004/health`                |
| Mailpit Web UI                | `http://localhost:8025`                       |

### Docker Compose

| Usage                            | URL                     |
| -------------------------------- | ----------------------- |
| frontend Nginx                   | `http://localhost`      |
| API publique via Nginx + gateway | `http://localhost/api`  |
| gateway exposé directement       | `http://localhost:3000` |
| Mailpit Web UI                   | `http://localhost:8025` |

## 2. Routage public

Toutes les routes appelées par le frontend passent par le préfixe `/api`. Le gateway garde les routes legacy et expose aussi des routes versionnées.

| Préfixe public          | Service cible          | Préfixe interne  | Usage         |
| ----------------------- | ---------------------- | ---------------- | ------------- |
| `/api/auth`             | `auth-service`         | `/auth`          | legacy v1     |
| `/api/users`            | `auth-service`         | `/users`         | legacy v1     |
| `/api/projects`         | `project-service`      | `/projects`      | legacy        |
| `/api/notifications`    | `notification-service` | `/notifications` | legacy        |
| `/api/v1/auth`          | `auth-service`         | `/v1/auth`       | auth v1       |
| `/api/v1/users`         | `auth-service`         | `/v1/users`      | users v1      |
| `/api/v1/projects`      | `project-service`      | `/v1/projects`   | client actuel |
| `/api/v1/notifications` | `notification-service` | `/notifications` | client SSE    |
| `/api/v2/auth`          | `auth-service`         | `/v2/auth`       | client actuel |
| `/api/v2/users`         | `auth-service`         | `/v2/users`      | client actuel |

Le `gateway` proxifie les requêtes mais ne vérifie pas lui-même le JWT. La vérification JWT est faite par `authMiddleware` dans les services qui protègent leurs routes.

Le client utilise:

- `apiClient` avec base URL `${VITE_API_URL}/v1` pour projets, tâches et notifications;
- `authApiClient` avec base URL `${VITE_API_URL}/${VITE_API_VERSION}` pour auth et users.

En local et dans `compose.yaml`, `VITE_API_VERSION` vaut `v2` par défaut.

## 3. Authentification HTTP

Après login, le client reçoit un JWT. Les routes protégées attendent:

```http
Authorization: Bearer <jwt>
```

Le payload signé contient:

```json
{
  "userId": "user-id",
  "email": "user@example.com",
  "username": "anton",
  "iat": 1718000000,
  "exp": 1718604800
}
```

Le frontend stocke ce token dans `localStorage` sous la clé `auth_token`. Axios ajoute automatiquement l'en-tête `Authorization` dans `client/src/shared/api/apiClient.ts`.

## 4. API Auth

### Routes

| Méthode | Route legacy/v1                               | Route v2                | Auth | Usage                |
| ------- | --------------------------------------------- | ----------------------- | ---- | -------------------- |
| `POST`  | `/api/auth/register`, `/api/v1/auth/register` | `/api/v2/auth/register` | non  | créer un utilisateur |
| `POST`  | `/api/auth/login`, `/api/v1/auth/login`       | `/api/v2/auth/login`    | non  | obtenir un JWT       |

### `POST /api/auth/register` ou `/api/v1/auth/register`

Requête:

```json
{
  "username": "anton",
  "email": "anton@example.com",
  "password": "secret"
}
```

Réponse actuelle en cas de succès: `200`, sans corps exploité par le client.

Comportement:

- `username`, `email` et `password` sont trimés;
- si un champ manque, réponse `400`;
- si le username existe déjà, réponse `409`;
- le mot de passe est haché avec bcrypt avant persistance;
- le frontend enchaîne ensuite automatiquement avec un login.

### `POST /api/v2/auth/register`

La v2 ajoute `birthDate` obligatoire au format `YYYY-MM-DD`.

Requête:

```json
{
  "username": "anton",
  "email": "anton@example.com",
  "password": "secret",
  "birthDate": "1990-01-01"
}
```

Réponse actuelle en cas de succès: `200`, sans corps exploité par le client.

Comportement:

- si `birthDate` manque ou n'utilise pas le format attendu, réponse `400`;
- MySQL persiste `birth_date`;
- SQLite retourne actuellement `birthDate: null`, car son schéma n'a pas encore la colonne.

### `POST /api/auth/login`, `/api/v1/auth/login` ou `/api/v2/auth/login`

Requête:

```json
{
  "username": "anton",
  "password": "secret"
}
```

Réponse `200`:

```json
{
  "token": "<jwt>"
}
```

Comportement:

- si `username` ou `password` manque, réponse `400`;
- si l'utilisateur n'existe pas ou si le mot de passe est invalide, réponse `401`;
- le JWT est signé avec `JWT_SECRET`;
- l'expiration vient de `JWT_EXPIRES_IN`, `7d` par défaut.

## 5. API User

Toutes les routes users legacy, v1 et v2 sont protégées par `authMiddleware` dans `auth-service`.

### Routes

| Méthode  | Route legacy/v1                                             | Route v2                       | Usage                               | Réponse principale  |
| -------- | ----------------------------------------------------------- | ------------------------------ | ----------------------------------- | ------------------- |
| `GET`    | `/api/users`, `/api/v1/users`                               | `/api/v2/users`                | lister les utilisateurs             | `200 User[]`        |
| `GET`    | `/api/users/:id`, `/api/v1/users/:id`                       | `/api/v2/users/:id`            | obtenir un utilisateur par id       | `200 User` ou `404` |
| `GET`    | `/api/users/username/:name`, `/api/v1/users/username/:name` | `/api/v2/users/username/:name` | obtenir un utilisateur par username | `200 User` ou `404` |
| `PATCH`  | `/api/users/:id/name`, `/api/v1/users/:id/name`             | `/api/v2/users/:id/name`       | changer le username                 | `200 { message }`   |
| `PATCH`  | `/api/users/:id/password`, `/api/v1/users/:id/password`     | `/api/v2/users/:id/password`   | changer le mot de passe             | `201 { message }`   |
| `DELETE` | `/api/users/:id`, `/api/v1/users/:id`                       | `/api/v2/users/:id`            | supprimer le compte                 | `204`               |

### `User`

```json
{
  "id": "user-id",
  "email": "anton@example.com",
  "userName": "anton"
}
```

Le champ `passwordHash` n'est pas retourné par les use cases utilisateur.

En v2, `User` ajoute:

```json
{
  "birthDate": "1990-01-01"
}
```

`birthDate` peut être `null`.

### `PATCH /api/users/:id/name`

Requête:

```json
{
  "username": "new-name"
}
```

Réponse `200`:

```json
{
  "message": "Username updated successfully"
}
```

Erreurs:

- `400` si `username` manque;
- `404` si l'utilisateur n'existe pas;
- `409` si le nouveau username existe déjà.

### `PATCH /api/users/:id/password`

Requête:

```json
{
  "password": "new-password"
}
```

Réponse actuelle en cas de succès: `201`.

```json
{
  "message": "Password changed successfully"
}
```

Erreurs:

- `400` si `password` manque;
- `404` si l'utilisateur n'existe pas.

## 6. API Project

Toutes les routes `/api/projects/*` et `/api/v1/projects/*` sont protégées par `authMiddleware` dans `project-service`. Le client actuel utilise `/api/v1/projects`.

### Routes

| Méthode  | Route v1                                                  | Usage                                     | Réponse principale              |
| -------- | --------------------------------------------------------- | ----------------------------------------- | ------------------------------- |
| `GET`    | `/api/v1/projects`                                        | liste des projets du propriétaire courant | `200 Project[]`                 |
| `GET`    | `/api/v1/projects/:projectId/details`                     | projet + tâches                           | `200 ProjectDetails`            |
| `POST`   | `/api/v1/projects`                                        | créer un projet                           | `201`                           |
| `POST`   | `/api/v1/projects/:projectId/close`                       | clôturer un projet                        | `200`                           |
| `DELETE` | `/api/v1/projects/:projectId`                             | supprimer un projet                       | `200`                           |
| `POST`   | `/api/v1/projects/:projectId/tasks`                       | demander la création d'une tâche          | `201 AcceptedOperationResponse` |
| `PATCH`  | `/api/v1/projects/:projectId/tasks/:taskId/toggle-status` | demander le changement d'état d'une tâche | `202 AcceptedOperationResponse` |
| `DELETE` | `/api/v1/projects/:projectId/tasks/:taskId`               | demander la suppression d'une tâche       | `202 AcceptedOperationResponse` |

Les mêmes routes existent aussi sous `/api/projects/*` pour compatibilité legacy.

### `Project`

```json
{
  "id": "project-id",
  "ownerId": "user-id",
  "name": "Project Alpha",
  "description": "Description du projet",
  "status": "OPEN",
  "openTaskCount": 2
}
```

`status` vaut `OPEN` ou `CLOSED`.

### `GET /api/v1/projects`

Réponse `200`:

```json
[
  {
    "id": "project-id",
    "ownerId": "user-id",
    "name": "Project Alpha",
    "description": "Description du projet",
    "status": "OPEN",
    "openTaskCount": 2
  }
]
```

### `GET /api/v1/projects/:projectId/details`

Réponse `200`:

```json
{
  "id": "project-id",
  "ownerId": "user-id",
  "name": "Project Alpha",
  "description": "Description du projet",
  "status": "OPEN",
  "openTaskCount": 2,
  "tasks": [
    {
      "id": "task-id",
      "name": "Créer l'API",
      "description": "Définir les endpoints",
      "status": "OPEN",
      "createdAt": "2026-06-10T10:00:00.000Z",
      "userId": "user-id",
      "projectId": "project-id"
    }
  ]
}
```

La liste des tâches est récupérée par `project-service` via `task.list.requested` / `task.list.replied` sur BullMQ. Le timeout par défaut est `5000 ms`.

### `POST /api/v1/projects`

Requête:

```json
{
  "name": "Project Alpha",
  "description": "Description du projet"
}
```

Réponse actuelle en cas de succès: `201`, sans corps exploité par le client.

Règles:

- `name` est trimé, obligatoire et limité à 120 caractères;
- `description` est optionnelle, remplacée par une chaîne vide si absente;
- le projet démarre en `OPEN`;
- `openTaskCount` démarre à `0`;
- `project.created` est publié vers `notification-service`.

### `POST /api/v1/projects/:projectId/close`

Réponse actuelle en cas de succès: `200`.

Règles:

- le projet doit appartenir à l'utilisateur courant;
- le projet ne peut être fermé que si `openTaskCount` vaut `0`;
- le statut devient `CLOSED`;
- `project.closed` est publié vers `notification-service`.

### `DELETE /api/v1/projects/:projectId`

Réponse actuelle en cas de succès: `200`.

Règles:

- le projet doit exister;
- le projet doit appartenir à l'utilisateur courant;
- `project.deleted` est publié vers `notification-service`.

La suppression du projet ne déclenche pas actuellement une suppression en cascade documentée des tâches côté `task-service`.

## 7. API Task via Project

Les opérations de tâche passent par `project-service`, puis sont traitées de manière asynchrone par `task-service`.

### `AcceptedOperationResponse`

```json
{
  "accepted": true,
  "operationId": "operation-id",
  "resourceId": "task-id"
}
```

`operationId` permet d'identifier l'opération asynchrone. Il n'existe pas encore d'endpoint public de suivi d'opération.

### `POST /api/v1/projects/:projectId/tasks`

Requête:

```json
{
  "name": "Créer l'API",
  "description": "Définir les endpoints et les contrats"
}
```

Réponse `201`:

```json
{
  "accepted": true,
  "operationId": "operation-id",
  "resourceId": "task-id"
}
```

Règles:

- le projet doit exister;
- le projet doit appartenir à l'utilisateur courant;
- le projet doit être `OPEN`;
- le nom de tâche est obligatoire et limité à 120 caractères;
- la commande publiée est `task.creation.requested`;
- l'état final arrive ensuite via `task.created` ou `task.creation.rejected`.

### `PATCH /api/v1/projects/:projectId/tasks/:taskId/toggle-status`

Réponse `202`:

```json
{
  "accepted": true,
  "operationId": "operation-id",
  "resourceId": "task-id"
}
```

La commande publiée est `task.status-toggle.requested`. Le résultat métier final est:

- `task.closed` si la tâche passe à `DONE`;
- `task.reopened` si la tâche repasse à `OPEN`;
- `task.status-toggle.rejected` en cas d'échec.

### `DELETE /api/v1/projects/:projectId/tasks/:taskId`

Réponse `202`:

```json
{
  "accepted": true,
  "operationId": "operation-id",
  "resourceId": "task-id"
}
```

La commande publiée est `task.deletion.requested`. Le résultat métier final est:

- `task.deleted`;
- ou `task.deletion.rejected`.

## 8. Codes d'erreur HTTP

| Code  | Situation actuelle                                                              |
| ----- | ------------------------------------------------------------------------------- |
| `200` | login, lectures, clôture/suppression de projet                                  |
| `201` | changement de mot de passe, création projet, commande de création de tâche      |
| `202` | commandes toggle/delete tâche acceptées                                         |
| `204` | suppression utilisateur                                                         |
| `400` | champs requis manquants dans auth/user, `userId` SSE absent                     |
| `401` | JWT absent/invalide sur routes protégées, login invalide                        |
| `403` | certains refus d'accès propriétaire                                             |
| `404` | utilisateur/projet/tâche absent dans certains contrôleurs                       |
| `409` | username déjà utilisé                                                           |
| `500` | erreurs non mappées ou chemins de domaine encore encapsulés en erreur générique |

Limite importante: la gestion des erreurs n'est pas uniforme. Certains cas qui devraient être `403` ou `404` peuvent encore remonter en `500`, notamment dans certaines opérations projet.

## 9. Événements d'intégration

Les noms exacts sont définis dans `server/common/contracts/events/event-names.ts`.

### Catalogue

| Événement                      | Producteur                             | Consommateur                              | Signification                           |
| ------------------------------ | -------------------------------------- | ----------------------------------------- | --------------------------------------- |
| `project.created`              | `project-service`                      | `notification-service`                    | projet créé                             |
| `project.closed`               | `project-service`                      | `notification-service`                    | projet clôturé                          |
| `project.deleted`              | `project-service`                      | `notification-service`                    | projet supprimé                         |
| `task.creation.requested`      | `project-service`                      | `task-service`                            | demande de création de tâche            |
| `task.created`                 | `task-service`, puis `project-service` | `project-service`, `notification-service` | tâche créée                             |
| `task.creation.rejected`       | `task-service`                         | `notification-service`                    | création de tâche refusée               |
| `task.status-toggle.requested` | `project-service`                      | `task-service`                            | demande de bascule de statut            |
| `task.closed`                  | `task-service`, puis `project-service` | `project-service`, `notification-service` | tâche passée à `DONE`                   |
| `task.reopened`                | `task-service`, puis `project-service` | `project-service`, `notification-service` | tâche repassée à `OPEN`                 |
| `task.status-toggle.rejected`  | `task-service`                         | `notification-service`                    | bascule refusée                         |
| `task.deletion.requested`      | `project-service`                      | `task-service`                            | demande de suppression de tâche         |
| `task.deleted`                 | `task-service`, puis `project-service` | `project-service`, `notification-service` | tâche supprimée                         |
| `task.deletion.rejected`       | `task-service`                         | `notification-service`                    | suppression refusée                     |
| `task.list.requested`          | `project-service`                      | `task-service`                            | demande de liste des tâches d'un projet |
| `task.list.replied`            | `task-service`                         | queue `reply.<uuid>`                      | réponse de liste des tâches             |

### Envelope

```json
{
  "id": "envelope-id",
  "name": "task.created",
  "version": 1,
  "occurredAt": "2026-06-10T10:00:00.000Z",
  "meta": {
    "correlationId": "correlation-id",
    "replyTo": "reply.queue"
  },
  "payload": {}
}
```

`meta` est optionnel pour les publications simples. Il est utilisé pour le request/reply.

## 10. Payloads d'événements

### Projets

#### `project.created`

```json
{
  "operationId": "operation-id",
  "projectId": "project-id",
  "ownerId": "user-id",
  "ownerEmail": "user@example.com",
  "name": "Project Alpha",
  "description": "Description",
  "status": "OPEN",
  "openTaskCount": 0
}
```

#### `project.closed`

```json
{
  "operationId": "operation-id",
  "projectId": "project-id",
  "ownerId": "user-id",
  "ownerEmail": "user@example.com"
}
```

#### `project.deleted`

```json
{
  "operationId": "operation-id",
  "projectId": "project-id",
  "ownerId": "user-id"
}
```

### Commandes de tâches

#### `task.creation.requested`

```json
{
  "operationId": "operation-id",
  "taskId": "task-id",
  "projectId": "project-id",
  "userId": "user-id",
  "userEmail": "user@example.com",
  "name": "Créer l'API",
  "description": "Définir les endpoints"
}
```

#### `task.status-toggle.requested`

```json
{
  "operationId": "operation-id",
  "taskId": "task-id",
  "projectId": "project-id",
  "userId": "user-id",
  "userEmail": "user@example.com"
}
```

#### `task.deletion.requested`

```json
{
  "operationId": "operation-id",
  "taskId": "task-id",
  "projectId": "project-id",
  "userId": "user-id",
  "userEmail": "user@example.com"
}
```

### Faits de tâches

#### `task.created`

```json
{
  "operationId": "operation-id",
  "taskId": "task-id",
  "projectId": "project-id",
  "userId": "user-id",
  "userEmail": "user@example.com",
  "name": "Créer l'API",
  "description": "Définir les endpoints",
  "status": "OPEN",
  "createdAt": "2026-06-10T10:00:00.000Z"
}
```

#### `task.closed`

```json
{
  "operationId": "operation-id",
  "taskId": "task-id",
  "projectId": "project-id",
  "userId": "user-id",
  "userEmail": "user@example.com"
}
```

#### `task.reopened`

```json
{
  "operationId": "operation-id",
  "taskId": "task-id",
  "projectId": "project-id",
  "userId": "user-id",
  "userEmail": "user@example.com"
}
```

#### `task.deleted`

```json
{
  "operationId": "operation-id",
  "taskId": "task-id",
  "projectId": "project-id",
  "userId": "user-id",
  "userEmail": "user@example.com",
  "previousStatus": "OPEN"
}
```

### Rejets de tâches

Les événements `task.creation.rejected`, `task.status-toggle.rejected` et `task.deletion.rejected` partagent le même format:

```json
{
  "operationId": "operation-id",
  "taskId": "task-id",
  "projectId": "project-id",
  "userId": "user-id",
  "userEmail": "user@example.com",
  "reason": "Task not found"
}
```

### Request/reply de liste

#### `task.list.requested`

```json
{
  "projectId": "project-id",
  "userId": "user-id"
}
```

#### `task.list.replied`

```json
{
  "ok": true,
  "projectId": "project-id",
  "tasks": [
    {
      "id": "task-id",
      "name": "Créer l'API",
      "description": "Définir les endpoints",
      "status": "OPEN",
      "createdAt": "2026-06-10T10:00:00.000Z",
      "userId": "user-id",
      "projectId": "project-id"
    }
  ]
}
```

## 11. API SSE

### Endpoint public

```http
GET /api/v1/notifications/events?userId=<user-id>
```

### Endpoint interne

```http
GET /notifications/events?userId=<user-id>
```

### Comportement serveur

- `userId` est obligatoire, sinon réponse `400`;
- `Content-Type` vaut `text/event-stream`;
- `Cache-Control` vaut `no-cache, no-transform`;
- `X-Accel-Buffering` vaut `no`;
- `Access-Control-Allow-Origin` vaut `SSE_ALLOW_ORIGIN` ou `*`;
- le serveur envoie `retry: 5000` à l'ouverture;
- le hub envoie ensuite un événement `connected`;
- un heartbeat commentaire est écrit toutes les 25 secondes;
- la connexion est retirée du hub à la fermeture.

### Événements navigateur

Les noms côté client sont définis dans `client/src/shared/notifications/notification.types.ts`.

| Événement SSE        | Payload principal                                         | Effet UI                |
| -------------------- | --------------------------------------------------------- | ----------------------- |
| `connected`          | `{ type, refresh: [], message }`                          | confirme la connexion   |
| `project.created`    | `{ projectId, refresh: ["projects"] }`                    | rafraîchit la liste     |
| `project.closed`     | `{ projectId, refresh: ["projects", "project-details"] }` | rafraîchit liste/détail |
| `project.deleted`    | `{ projectId, refresh: ["projects"] }`                    | rafraîchit la liste     |
| `task.created`       | `{ projectId, taskId, refresh: ["project-details"] }`     | rafraîchit le détail    |
| `task.updated`       | `{ projectId, taskId, refresh: ["project-details"] }`     | rafraîchit le détail    |
| `task.deleted`       | `{ projectId, taskId, refresh: ["project-details"] }`     | rafraîchit le détail    |
| `operation.rejected` | `{ projectId, taskId, reason, refresh: [] }`              | affiche la raison       |

Exemple de trame:

```text
event: task.created
data: {"type":"task.created","projectId":"project-id","taskId":"task-id","refresh":["project-details"],"message":"Task created"}
```

## 12. Particularités à connaître

- Les opérations de tâches sont asynchrones: la réponse HTTP confirme l'acceptation, pas forcément l'état final.
- `project-service` reste responsable du contrôle propriétaire avant de publier une commande de tâche.
- `task-service` revérifie `userId` et `projectId` sur toggle/delete.
- `notification-service` ne vérifie pas le JWT de la connexion SSE.
- Les notifications historiques sont stockées côté navigateur, pas côté backend.
- Le contrat d'erreur doit encore être uniformisé.
