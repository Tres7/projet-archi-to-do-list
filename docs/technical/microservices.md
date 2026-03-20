# Microservices et zones de responsabilité

## 1. Cartographie des composants

| Composant              | Rôle principal                                               | Dépendances principales                                |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| `gateway`              | point d'entrée public, auth middleware, proxy HTTP/SSE       | Express, JWT, proxy HTTP                               |
| `auth-service`         | utilisateurs, inscription, login, profil                     | Express, repositories utilisateur, bcrypt, JWT         |
| `project-service`      | projets, détail agrégé du projet, projection `openTaskCount` | Express, repositories projet, Redis/BullMQ, task query |
| `task-service`         | état des tâches et traitement des commandes asynchrones      | Express, repositories tâche, Redis/BullMQ              |
| `notification-service` | SSE, notifications, e-mail                                   | Express, SSE hub, Redis/BullMQ, Nodemailer             |
| `client`               | SPA utilisateur                                              | React, Vite, Axios, React Router, Playwright           |

## 2. `gateway`

### Responsabilité

`gateway` est le seul point d'entrée HTTP public côté backend. Il masque la topologie interne des services.

### Ce qu'il fait

- reçoit les requêtes du frontend ;
- vérifie le header `Authorization` pour les routes protégées ;
- injecte l'utilisateur décodé dans le contexte de requête ;
- redirige les requêtes vers `auth-service`, `project-service` et `notification-service` ;
- expose le flux SSE côté client.

### Ce qu'il ne doit pas faire

- stocker de l'état métier ;
- implémenter les use cases métier ;
- devenir un orchestrateur lourd contenant des règles de domaine.

### Use cases qu'il sert

- inscription et authentification ;
- opérations utilisateur ;
- opérations projet ;
- commandes de tâches ;
- connexion du navigateur au canal SSE.

## 3. `auth-service`

### Responsabilité

`auth-service` gère l'identité utilisateur et le cycle de vie du compte.

### Entités clés

- `User`

Attributs principaux :

- `id`
- `username`
- `email`
- `passwordHash`

### Use cases

- `registerUser`
- `loginUser`
- `getUsers`
- `getUserById`
- `getUserByName`
- `changeUsername`
- `changePassword`
- `deleteUser`

### Invariants métier

- `username` doit être unique ;
- `email` doit être unique ;
- le mot de passe est stocké sous forme de hash, jamais en clair.

### Entrées / sorties

Entrées :

- requêtes HTTP proxifiées par `gateway`.

Sorties :

- JWT, profil utilisateur.

### Événements

Dans la version actuelle, `auth-service` est principalement synchrone et ne publie pas de catalogue d'événements métier riche.

## 4. `project-service`

### Responsabilité

`project-service` possède le modèle `Project` et la logique d'agrégation associée à l'écran projet.

### Entités clés

- `Project`

Attributs principaux :

- `id`
- `ownerId`
- `name`
- `description`
- `status`
- `openTaskCount`

### Use cases

- `createProject`
- `getProjectsByOwner`
- `getProjectDetails`
- `closeProject`
- `deleteProject`
- `requestTaskCreation`
- `requestTaskStatusToggle`
- `requestTaskDeletion`
- `onTaskCreated`
- `onTaskClosed`
- `onTaskReopened`
- `onTaskDeleted`

### Pourquoi le service projets est séparé du service tâches

Parce qu'un projet a sa propre responsabilité métier :

- il a son propre cycle de vie ;
- il possède son propriétaire ;
- il expose une vue agrégée ;
- il maintient la projection locale du nombre de tâches ouvertes.

### Entrées / sorties

Entrées :

- HTTP depuis `gateway` ;
- événements depuis `task-service`.

Sorties :

- réponse HTTP agrégée du projet ;
- commandes asynchrones à destination de `task-service`.

### Événements / commandes publiés

Commandes :

- `task.creation.requested`
- `task.status.toggle.requested`
- `task.deletion.requested`

Événements consommés :

- `task.created`
- `task.closed`
- `task.reopened`
- `task.deleted`

## 5. `task-service`

### Responsabilité

`task-service` est la source de vérité pour les tâches.

### Entités clés

- `Task`

Attributs principaux :

- `id`
- `projectId`
- `userId`
- `name`
- `description`
- `status`
- `createdAt`

### Use cases

- `createTask`
- `toggleTaskStatus`
- `deleteTask`
- `getTaskById`
- `getTasksByProjectId`

### Invariants métier

- une tâche appartient à un projet ;
- une tâche a un auteur / initiateur ;
- le statut bascule entre `OPEN` et `DONE` ;
- la date de création est fixée au moment de l'écriture.

### Entrées / sorties

Entrées :

- commandes BullMQ venant de `project-service` ;
- lectures HTTP internes utilisées pour les détails projet.

Sorties :

- événements métier finaux sur les tâches.

### Événements publiés

- `task.created`
- `task.closed`
- `task.reopened`
- `task.deleted`

## 6. `notification-service`

### Responsabilité

`notification-service` traduit les événements métier en notifications utilisateur.

### Entités / modèles principaux

Le service ne possède pas encore de modèle de notification persistant complet. Les composants centraux sont :

- le hub SSE en mémoire ;
- les handlers d'événements ;
- l'adaptateur d'envoi d'e-mail.

### Use cases

- s'abonner au flux SSE ;
- traiter un événement métier ;
- pousser une notification vers le navigateur ;
- envoyer un e-mail si la configuration le permet.

### Événements consommés

- `task.created`
- `task.closed`
- `task.reopened`
- `task.deleted`

### Limitations importantes

- les connexions SSE sont stockées en mémoire ;
- l'historique des notifications n'est pas persisté côté backend ;
- le scaling horizontal nécessitera une couche supplémentaire de distribution des événements.

## 7. `client`

### Responsabilité

Le client React fournit l'expérience utilisateur de bout en bout.

### Ce qu'il gère

- formulaires d'inscription et de connexion ;
- écran liste des projets ;
- écran détail d'un projet ;
- création / suppression / changement d'état des tâches ;
- consommation du flux SSE ;
- stockage local des notifications et de leur état de lecture.

### Use cases frontend

- `login`
- `register`
- `listProjects`
- `createProject`
- `openProjectDetails`
- `createTask`
- `toggleTaskStatus`
- `deleteTask`
- `consumeNotifications`

## 8. Vue d'ensemble des responsabilités

| Zone                   | Possède l'état de référence       | Expose à l'extérieur            | Réagit aux événements        |
| ---------------------- | --------------------------------- | ------------------------------- | ---------------------------- |
| `auth-service`         | utilisateurs                      | auth et gestion utilisateur     | peu / pas dans l'état actuel |
| `project-service`      | projets                           | API projet, projection agrégée  | oui                          |
| `task-service`         | tâches                            | événements et lectures internes | oui                          |
| `notification-service` | connexions temps réel temporaires | SSE, e-mail                     | oui                          |
| `client`               | état UI local                     | interface web                   | oui                          |

Cette découpe permet de raisonner séparément sur :

- la gestion de l'identité ;
- le cycle de vie du projet ;
- le cycle de vie de la tâche ;
- la diffusion des notifications ;
- l'interface utilisateur.
