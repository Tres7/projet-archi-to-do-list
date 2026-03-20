# API: HTTP, événements et SSE

## 1. Points d'entrée

### Développement local

| Usage                         | URL                            |
| ----------------------------- | ------------------------------ |
| frontend (Vite)               | `http://localhost:5173`        |
| API gateway publique          | `http://localhost:3000/api`    |
| health `auth-service`         | `http://localhost:3001/health` |
| health `project-service`      | `http://localhost:3002/health` |
| health `task-service`         | `http://localhost:3003/health` |
| health `notification-service` | `http://localhost:3004/health` |

### Docker Compose

| Usage                | URL                     |
| -------------------- | ----------------------- |
| frontend (Nginx)     | `http://localhost`      |
| API gateway publique | `http://localhost/api`  |
| gateway TCP          | `http://localhost:3000` |
| interface Mailpit    | `http://localhost:8025` |

## 2. API HTTP

Toutes les routes publiques passent par `gateway` et ont le préfixe `/api`.

### 2.1 API Auth

| Méthode | Route                | Authentification | Usage                      |
| ------- | -------------------- | ---------------- | -------------------------- |
| `POST`  | `/api/auth/register` | non              | enregistrer un utilisateur |
| `POST`  | `/api/auth/login`    | non              | obtenir un JWT             |

#### `POST /api/auth/register`

Corps de requête :

```json
{
  "username": "anton",
  "email": "anton@example.com",
  "password": "secret"
}
```

Comportement :

- si l'un des champs manque, la route renvoie `400` ;
- en cas de conflit sur le username, elle renvoie `409` ;
- le frontend actuel n'utilise pas le corps de réponse et déclenche ensuite directement `login`.

#### `POST /api/auth/login`

Corps de requête :

```json
{
  "username": "anton",
  "password": "secret"
}
```

Corps de réponse :

```json
{
  "token": "<jwt>"
}
```

### 2.2 API User

Toutes les routes exigent l'en-tête :

```http
Authorization: Bearer <jwt>
```

| Méthode  | Route                       | Usage                               |
| -------- | --------------------------- | ----------------------------------- |
| `GET`    | `/api/users`                | liste des utilisateurs              |
| `GET`    | `/api/users/:id`            | obtenir un utilisateur par id       |
| `GET`    | `/api/users/username/:name` | obtenir un utilisateur par username |
| `PATCH`  | `/api/users/:id/name`       | changer le username                 |
| `PATCH`  | `/api/users/:id/password`   | changer le mot de passe             |
| `DELETE` | `/api/users/:id`            | supprimer le compte                 |

#### `PATCH /api/users/:id/name`

Corps de requête :

```json
{
  "username": "new-name"
}
```

Corps de réponse :

```json
{
  "message": "Username updated successfully"
}
```

#### `PATCH /api/users/:id/password`

Corps de requête :

```json
{
  "password": "new-password"
}
```

Corps de réponse :

```json
{
  "message": "Password changed successfully"
}
```

### 2.3 API Project

Toutes les routes sont également protégées par JWT.

| Méthode  | Route                                                  | Usage                                            |
| -------- | ------------------------------------------------------ | ------------------------------------------------ |
| `GET`    | `/api/projects`                                        | liste des projets de l'utilisateur courant       |
| `GET`    | `/api/projects/:projectId/details`                     | détails agrégés du projet et liste des tâches    |
| `POST`   | `/api/projects`                                        | créer un projet                                  |
| `POST`   | `/api/projects/:projectId/close`                       | clôturer un projet                               |
| `DELETE` | `/api/projects/:projectId`                             | supprimer un projet                              |
| `POST`   | `/api/projects/:projectId/tasks`                       | créer une tâche de manière asynchrone            |
| `PATCH`  | `/api/projects/:projectId/tasks/:taskId/toggle-status` | changer l'état d'une tâche de manière asynchrone |
| `DELETE` | `/api/projects/:projectId/tasks/:taskId`               | supprimer une tâche de manière asynchrone        |

#### `GET /api/projects`

Corps de réponse :

```json
[
  {
    "id": "project-id",
    "ownerId": "user-id",
    "name": "Project Alpha",
    "description": "Description",
    "status": "OPEN",
    "openTaskCount": 2
  }
]
```

#### `GET /api/projects/:projectId/details`

Corps de réponse (`ProjectDetailsDto`) :

```json
{
  "id": "project-id",
  "ownerId": "user-id",
  "name": "Project Alpha",
  "description": "Description",
  "status": "OPEN",
  "openTaskCount": 2,
  "tasks": [
    {
      "id": "task-id",
      "name": "Ma tâche",
      "description": "Décrire le système en détail",
      "status": "OPEN",
      "createdAt": "2026-03-20T01:00:00.000Z",
      "userId": "user-id",
      "projectId": "project-id"
    }
  ]
}
```

#### `POST /api/projects`

Corps de requête :

```json
{
  "name": "Project Alpha",
  "description": "Description du projet"
}
```

L'implémentation actuelle renvoie `201`, mais le client n'utilise pas le corps de réponse et relit séparément la liste des projets.

#### `POST /api/projects/:projectId/tasks`

Corps de requête :

```json
{
  "name": "Créer l'API",
  "description": "Définir les endpoints et les contrats"
}
```

Corps de réponse :

```json
{
  "accepted": true,
  "operationId": "operation-id",
  "resourceId": "task-id"
}
```

#### `PATCH /api/projects/:projectId/tasks/:taskId/toggle-status`

Corps de réponse :

```json
{
  "accepted": true,
  "operationId": "operation-id",
  "resourceId": "task-id"
}
```

#### `DELETE /api/projects/:projectId/tasks/:taskId`

Corps de réponse :

```json
{
  "accepted": true,
  "operationId": "operation-id",
  "resourceId": "task-id"
}
```

## 3. Statuts et comportement des erreurs

| Code  | Où il apparaît                                 | Signification                                         |
| ----- | ---------------------------------------------- | ----------------------------------------------------- |
| `200` | login, lectures, clôture/suppression de projet | opération effectuée                                   |
| `201` | register, create project, create task command  | ressource créée ou commande acceptée                  |
| `202` | toggle/delete task                             | commande acceptée pour traitement asynchrone          |
| `204` | delete user                                    | supprimé sans corps de réponse                        |
| `400` | validation failures                            | corps de requête incomplet                            |
| `401` | auth failures                                  | token manquant ou invalide                            |
| `403` | une partie des opérations project/task         | interdit pour l'utilisateur courant                   |
| `404` | utilisateur / projet / tâche introuvable       | ressource absente                                     |
| `409` | conflit de username                            | violation d'unicité                                   |
| `500` | erreur générique                               | erreur de service ou gestion d'erreur non uniformisée |

## 4. Événements d'intégration

### 4.1 Catalogue des événements

| Nom de l'événement             | Produit par       | Consommé par                              | Signification                   |
| ------------------------------ | ----------------- | ----------------------------------------- | ------------------------------- |
| `task.creation.requested`      | `project-service` | `task-service`                            | demande de création d'une tâche |
| `task.status.toggle.requested` | `project-service` | `task-service`                            | demande de changement d'état    |
| `task.deletion.requested`      | `project-service` | `task-service`                            | demande de suppression          |
| `task.created`                 | `task-service`    | `project-service`, `notification-service` | tâche créée                     |
| `task.closed`                  | `task-service`    | `project-service`, `notification-service` | tâche marquée comme terminée    |
| `task.reopened`                | `task-service`    | `project-service`, `notification-service` | tâche rouverte                  |
| `task.deleted`                 | `task-service`    | `project-service`, `notification-service` | tâche supprimée                 |

### 4.2 Format d'enveloppe d'événement

```json
{
  "type": "task.created",
  "timestamp": "2026-03-20T01:00:00.000Z",
  "payload": {
    "taskId": "task-id",
    "projectId": "project-id",
    "userId": "user-id"
  }
}
```

### 4.3 Payloads typiques

#### `task.creation.requested`

```json
{
  "taskId": "task-id",
  "projectId": "project-id",
  "userId": "user-id",
  "name": "Ma tâche",
  "description": "Décrire le système en détail",
  "operationId": "operation-id"
}
```

#### `task.created`

```json
{
  "taskId": "task-id",
  "projectId": "project-id",
  "userId": "user-id",
  "name": "Ma tâche",
  "status": "OPEN",
  "operationId": "operation-id"
}
```

#### `task.closed` / `task.reopened`

```json
{
  "taskId": "task-id",
  "projectId": "project-id",
  "userId": "user-id",
  "status": "DONE",
  "operationId": "operation-id"
}
```

#### `task.deleted`

```json
{
  "taskId": "task-id",
  "projectId": "project-id",
  "userId": "user-id",
  "operationId": "operation-id"
}
```

## 5. API SSE

### Endpoint

```http
GET /api/notifications/events?userId=<user-id>
```

### Comportement

- la requête passe par `gateway` ;
- `gateway` proxifie la connexion vers `notification-service` ;
- le service garde la connexion HTTP ouverte ;
- quand un événement métier pertinent survient, le service envoie un événement SSE au navigateur.

### Événements navigateur

Exemple de trame SSE :

```text
event: notification
data: {"type":"task.created","message":"Task created","projectId":"project-id","taskId":"task-id"}
```

### Payload côté client

Le frontend transforme ces événements dans sa propre structure de notification et stocke ensuite l'historique dans `localStorage`.

## 6. Où l'API est réellement utilisée dans le frontend

- `auth` : login, register, récupération du profil ;
- `projects` : liste des projets, création, suppression, clôture, détail ;
- `tasks` : création, suppression, changement d'état ;
- `notifications` : abonnement SSE et rendu de l'historique.

Le client s'attend à ce que certaines opérations sur les tâches soient asynchrones : l'appel HTTP ne garantit donc pas que l'état final soit déjà visible dans la réponse immédiate.

## 7. Particularités du contrat à connaître

- les opérations sur les tâches renvoient `accepted`, pas toujours l'état métier final ;
- `project details` est une vue agrégée construite par `project-service` ;
- le canal SSE s'appuie actuellement sur `userId` dans la query string ;
- le contrat d'erreur n'est pas encore totalement uniformisé entre services.
