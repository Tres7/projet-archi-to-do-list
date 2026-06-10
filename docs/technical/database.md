# Base de données et stratégie de stockage

## 1. Vue d'ensemble

Le backend utilise une stratégie de persistance multi-driver. Les services `auth-service`, `project-service` et `task-service` accèdent aux données via des interfaces de repository et choisissent leur driver avec `DB_DRIVER`.

Drivers supportés:

| Driver   | Usage principal                     | Dépendance externe | Persistance                   |
| -------- | ----------------------------------- | ------------------ | ----------------------------- |
| `memory` | tests unitaires et scénarios isolés | aucune             | non, état perdu à l'arrêt     |
| `sqlite` | développement local léger           | fichier SQLite     | oui, via `SQLITE_DB_LOCATION` |
| `mysql`  | mode principal local/Docker         | MySQL 8            | oui                           |

Le service `notification-service` ne possède pas encore de table de notifications. Il garde les connexions SSE en mémoire et le client stocke l'historique dans `localStorage`.

## 2. Propriété logique des données

Même si le mode Docker utilise une seule instance MySQL, les services possèdent leurs données par bounded context:

| Service           | Table      | Responsabilité                                 |
| ----------------- | ---------- | ---------------------------------------------- |
| `auth-service`    | `users`    | identité utilisateur et hash de mot de passe   |
| `project-service` | `projects` | projets, statut et compteur de tâches ouvertes |
| `task-service`    | `tasks`    | tâches et statut `OPEN`/`DONE`                 |

Les services ne font pas de jointures SQL interservices. Les relations sont logiques et maintenues par:

- JWT et `userId`;
- commandes/événements BullMQ;
- request/reply `task.list.requested` / `task.list.replied`;
- projection `openTaskCount`.

## 3. Schéma logique

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : "ownerId logique"
    USERS ||--o{ TASKS : "userId logique"
    PROJECTS ||--o{ TASKS : "projectId logique"

    USERS {
        varchar id PK
        varchar user_name UK
        varchar email UK
        varchar passwordHash
    }

    PROJECTS {
        varchar id PK
        varchar name
        varchar description
        varchar status
        int uncomplete_task_count
        text tasks "MySQL legacy only"
        varchar owner_id
    }

    TASKS {
        varchar id PK
        varchar name
        text description
        varchar status
        datetime created_at
        varchar user_id
        varchar project_id
    }
```

Les clés étrangères ne sont pas matérialisées dans les schémas actuels.

## 4. Initialisation des drivers

Chaque service construit un container de persistance au démarrage:

1. lecture de `DB_DRIVER`;
2. sélection d'une factory `memory`, `sqlite` ou `mysql`;
3. création d'une connexion;
4. appel à `connection.init()`;
5. création du repository;
6. injection dans la couche application.

Les tables sont créées avec `CREATE TABLE IF NOT EXISTS` directement dans les drivers. Il n'existe pas encore de système de migrations séparé.

## 5. Variables de configuration

| Variable              | Usage                                                     |
| --------------------- | --------------------------------------------------------- |
| `DB_DRIVER`           | `memory`, `sqlite` ou `mysql`                             |
| `SQLITE_DB_LOCATION`  | chemin du fichier SQLite                                  |
| `MYSQL_HOST`          | hôte MySQL, `localhost` ou `db`                           |
| `MYSQL_PORT`          | port MySQL, `3306` par défaut                             |
| `MYSQL_USER`          | utilisateur MySQL                                         |
| `MYSQL_ROOT_PASSWORD` | mot de passe actuellement utilisé par le code applicatif  |
| `MYSQL_PASSWORD`      | mot de passe du conteneur MySQL et du healthcheck Compose |
| `MYSQL_DATABASE`      | base utilisée par les services                            |
| `MYSQL_HOST_FILE`     | secret file optionnel pour l'hôte                         |
| `MYSQL_USER_FILE`     | secret file optionnel pour l'utilisateur                  |
| `MYSQL_PASSWORD_FILE` | secret file optionnel pour le mot de passe                |
| `MYSQL_DB_FILE`       | secret file optionnel pour le nom de base                 |

Point d'attention: dans l'état actuel, le code de connexion MySQL lit `MYSQL_ROOT_PASSWORD` comme mot de passe applicatif. `MYSQL_PASSWORD` est nécessaire au conteneur et au healthcheck, mais n'est pas le mot de passe utilisé directement par les repositories.

## 6. Table `users`

Fichiers:

- `server/apps/auth-service/src/infrastructure/persistence/mysql/schema.ts`;
- `server/apps/auth-service/src/infrastructure/persistence/sqlite/schema.ts`.

Schéma MySQL et SQLite:

```sql
CREATE TABLE IF NOT EXISTS users
(
    id varchar(36) PRIMARY KEY,
    user_name varchar(255) UNIQUE,
    passwordHash varchar(255),
    email varchar(255) UNIQUE
)
```

### Colonnes

| Colonne        | Type           | Rôle             |
| -------------- | -------------- | ---------------- |
| `id`           | `varchar(36)`  | identifiant UUID |
| `user_name`    | `varchar(255)` | username unique  |
| `passwordHash` | `varchar(255)` | hash bcrypt      |
| `email`        | `varchar(255)` | e-mail unique    |

### Repository

Interface: `server/apps/auth-service/src/domain/repositories/UserRepository.ts`.

Méthodes:

- `getUsers()`;
- `getUserById(id)`;
- `getUserByName(name)`;
- `createUser(user)`;
- `updateUsername(id, username)`;
- `changeUserPassword(id, passwordHash)`;
- `deleteUser(id)`.

## 7. Table `projects`

Fichiers:

- `server/apps/project-service/src/infrastructure/persistence/mysql/schema.ts`;
- `server/apps/project-service/src/infrastructure/persistence/sqlite/schema.ts`.

### MySQL

```sql
CREATE TABLE IF NOT EXISTS projects
(
    id varchar(36) PRIMARY KEY,
    name varchar(255),
    description varchar(255),
    status varchar(10),
    uncomplete_task_count INT DEFAULT 0,
    tasks TEXT,
    owner_id varchar(36)
)
```

### SQLite

```sql
CREATE TABLE IF NOT EXISTS projects
(
    id varchar(36) PRIMARY KEY,
    name varchar(255),
    description varchar(255),
    status varchar(10),
    uncomplete_task_count integer DEFAULT 0,
    owner_id varchar(36)
)
```

### Colonnes

| Colonne                 | Type              | Rôle                                       |
| ----------------------- | ----------------- | ------------------------------------------ |
| `id`                    | `varchar(36)`     | identifiant UUID du projet                 |
| `name`                  | `varchar(255)`    | nom du projet                              |
| `description`           | `varchar(255)`    | description du projet                      |
| `status`                | `varchar(10)`     | `OPEN` ou `CLOSED`                         |
| `uncomplete_task_count` | `INT` / `integer` | projection du nombre de tâches ouvertes    |
| `tasks`                 | `TEXT`            | colonne legacy présente seulement en MySQL |
| `owner_id`              | `varchar(36)`     | propriétaire logique                       |

### Mapping domaine

| Base                    | Domaine/API       |
| ----------------------- | ----------------- |
| `owner_id`              | `ownerId`         |
| `uncomplete_task_count` | `openTaskCount`   |
| `status`                | `OPEN` / `CLOSED` |

`openTaskCount` est mis à jour par les événements de tâches, pas par calcul SQL:

- `task.created` incrémente;
- `task.closed` décrémente;
- `task.reopened` incrémente;
- `task.deleted` décrémente seulement si `previousStatus` vaut `OPEN`.

### Repository

Interface: `server/apps/project-service/src/domain/repositories/ProjectRepository.ts`.

Méthodes:

- `findById(id)`;
- `findByOwnerId(ownerId)`;
- `save(project)`;
- `delete(projectId)`.

## 8. Table `tasks`

Fichiers:

- `server/apps/task-service/src/infrastructure/persistence/mysql/schema.ts`;
- `server/apps/task-service/src/infrastructure/persistence/sqlite/schema.ts`.

### MySQL

```sql
CREATE TABLE IF NOT EXISTS tasks
(
    id varchar(36) PRIMARY KEY,
    name varchar(255),
    description TEXT,
    status varchar(16),
    created_at DATETIME(3) NOT NULL,
    user_id varchar(36),
    project_id varchar(36)
)
```

### SQLite

```sql
CREATE TABLE IF NOT EXISTS tasks
(
    id varchar(36) PRIMARY KEY,
    name varchar(255),
    description text,
    status varchar(16),
    created_at datetime,
    user_id varchar(36),
    project_id varchar(36)
)
```

### Colonnes

| Colonne       | Type                       | Rôle                      |
| ------------- | -------------------------- | ------------------------- |
| `id`          | `varchar(36)`              | identifiant UUID de tâche |
| `name`        | `varchar(255)`             | nom de tâche              |
| `description` | `TEXT` / `text`            | description               |
| `status`      | `varchar(16)`              | `OPEN` ou `DONE`          |
| `created_at`  | `DATETIME(3)` / `datetime` | date de création          |
| `user_id`     | `varchar(36)`              | utilisateur initiateur    |
| `project_id`  | `varchar(36)`              | projet logique            |

### Mapping domaine

| Base         | Domaine/API |
| ------------ | ----------- |
| `created_at` | `createdAt` |
| `user_id`    | `userId`    |
| `project_id` | `projectId` |

La création d'une tâche normalise `createdAt` à la minute UTC. Les lectures de détail projet retournent `createdAt` au format ISO.

### Repository

Interface: `server/apps/task-service/src/domain/repositories/TaskRepository.ts`.

Méthodes:

- `findById(id)`;
- `findByProjectId(projectId)`;
- `save(task)`;
- `delete(taskId)`.

Les tâches sont lues par projet pour construire `ProjectDetailsDto`.

## 9. Comportement par driver

### `memory`

Caractéristiques:

- aucune dépendance externe;
- utile pour les tests unitaires;
- état perdu à l'arrêt du processus;
- schéma simulé par des collections en mémoire.

Limites:

- ne permet pas de tester les contraintes SQL;
- ne représente pas le comportement de concurrence d'une vraie base.

### `sqlite`

Caractéristiques:

- fichier défini par `SQLITE_DB_LOCATION`;
- pratique pour un développement local simple;
- schémas proches de MySQL;
- aucune dépendance serveur externe.

Limites:

- pas identique à MySQL sur les types et certains comportements;
- pas de migrations explicites;
- si le schéma évolue fortement, il peut être nécessaire de supprimer le fichier local.

### `mysql`

Caractéristiques:

- mode principal dans `compose.yaml`;
- image `mysql:8`;
- volume Compose `db_data`;
- pool `mysql2`;
- attente du port avant initialisation;
- tables créées au démarrage par chaque service.

Limites:

- une seule base physique pour plusieurs bounded contexts;
- pas de migrations séparées;
- mot de passe applicatif actuellement lu via `MYSQL_ROOT_PASSWORD`;
- colonne legacy `projects.tasks`.

## 10. Données non persistées en base

| Donnée                                   | Où elle vit actuellement          | Conséquence                                   |
| ---------------------------------------- | --------------------------------- | --------------------------------------------- |
| connexions SSE actives                   | mémoire de `notification-service` | perdues au redémarrage                        |
| historique des notifications             | `localStorage` navigateur         | non partagé entre appareils                   |
| compteur non lu                          | `localStorage` navigateur         | non fiable comme source serveur               |
| messages BullMQ                          | Redis                             | dépend de la configuration Redis et de BullMQ |
| opérations asynchrones par `operationId` | non persistées                    | pas de suivi public d'état                    |

## 11. Cohérence et intégrité

Le modèle actuel privilégie la séparation pédagogique des responsabilités:

- pas de clés étrangères interservices;
- pas de transaction distribuée;
- pas de cascade SQL entre projet et tâches;
- compteur `openTaskCount` mis à jour par événements;
- détails projet reconstruits par request/reply.

Conséquences:

- une commande de tâche peut être acceptée avant que la vue ne reflète le résultat;
- si Redis ou un worker est indisponible, la projection peut prendre du retard;
- les suppressions de projet et tâches doivent être renforcées si une garantie de nettoyage complet est requise.

## 12. Recommandations d'évolution

Avant une exploitation plus sérieuse, il faudrait:

- introduire un outil de migrations;
- aligner `MYSQL_PASSWORD` et le mot de passe applicatif;
- supprimer ou migrer la colonne legacy `projects.tasks`;
- ajouter des contraintes `NOT NULL` là où le domaine les impose;
- décider si les relations logiques doivent rester sans foreign keys ou être matérialisées dans certains environnements;
- persister les notifications côté backend;
- ajouter un suivi d'opération asynchrone par `operationId`.
