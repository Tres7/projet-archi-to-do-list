# Documentation technique - Projet Todo List

## 1. Objectif du projet
Application Todo List decouplée frontend/backend, avec authentification, persistance interchangeable (InMemory, SQLite, MySQL), tests unitaires/integration/e2e, et exécution locale ou via Docker Compose.

## 2. Stack technique
- Frontend: React 19, TypeScript, Vite, React Router, Axios, Bootstrap
- Backend: Node.js, Express 5, TypeScript
- Authentification: JWT + bcrypt
- Persistance: Driver pattern (`memory`, `sqlite`, `mysql`)
- Tests backend: Jest + Supertest
- Tests frontend e2e: Playwright
- Infra: Docker Compose + Nginx

## 3. Structure du repository
```
.
├── client/
├── server/
├── docs/
├── compose.yaml
└── README.md
```

## 4. Architecture backend
Le backend suit une separation en couches:

- `domain/`
  - Entités: `User`, `Todo`
  - Contrats: `UserRepository`, `TodoRepository`
  - Erreurs métier: `NotFoundError`, `UnauthorizedError`, etc.
- `application/`
  - Services métier: `AuthService`, `UserService`, `TodoService`
  - DTO: `UserResponseDTO`
- `infrastructure/`
  - HTTP: routes, controllers, middleware JWT
  - Persistence: factories + implementations `memory/sqlite/mysql`
- `app.ts`
  - Composition root (injection repositories -> services -> controllers -> routes)
- `index.ts`
  - Amorçage du serveur (chargement env, init connexion DB, lancement serveur)

### 4.1 Injection de la persistance
- `PersistenceFactory.create(driver)` charge dynamiquement le driver de persistance.
- Le driver est determiné via `DB_DRIVER` (`memory`, `sqlite`, `mysql`).
- Chaque driver retourne un `PersistenceContainer`:
  - `connection` (init, teardown, clearDatabase)
  - `repositories` (`todoRepository`, `userRepository`)

### 4.2 Entites métier
- `User`
  - `id: string`
  - `userName: string`
  - `passwordHash: string`
- `Todo`
  - `id: string`
  - `name: string`
  - `completed: boolean`
  - `userId?: string`

## 5. API HTTP backend
Base URL locale: `http://localhost:3000`

### 5.1 Auth
- `POST /auth/register`
  - Body: `{ username, password }`
  - Reponse: utilisateur crée
- `POST /auth/login`
  - Body: `{ username, password }`
  - Reponse: `{ token }`

### 5.2 Users (protégé par JWT)
Routes sous `/users` avec `Authorization: Bearer <token>`

- `GET /users`
- `GET /users/:id`
- `GET /users/username/:name`
- `PATCH /users/:id/name`
  - Body: `{ username }`
- `PATCH /users/:id/password`
  - Body: `{ password }`
- `DELETE /users/:id`

### 5.3 Todos (protégé par JWT)
Routes sous `/items` avec `Authorization: Bearer <token>`

- `GET /items`
- `POST /items`
  - Body: `{ name }`
- `PUT /items/:id`
  - Body: `{ name, completed }`
- `DELETE /items/:id`

### 5.4 Santé
- `GET /health` -> `{ ok: true }`

## 6. Authentification et sécurité
- Le login renvoie un JWT signe avec `JWT_SECRET`.
- Le middleware `authMiddleware`:
  - extrait le bearer token
  - verifie le token
  - injecte `req.currentUser = { userId, username }`
- Les routes `/users` et `/items` sont protegees via ce middleware.

## 7. Persistance et schéma données
Schéma logique identique en SQLite et MySQL:

- Table `users`
  - `id` (PK)
  - `user_name` (UNIQUE)
  - `passwordHash`
- Table `todo_items`
  - `id` (PK)
  - `name`
  - `completed`
  - `user_id` (FK vers `users.id`, `ON DELETE CASCADE`)

### 7.1 Drivers
- `memory`
  - Utilisé pour tests rapides / sans DB externe
- `sqlite`
  - Fichier local (`SQLITE_DB_LOCATION`)
- `mysql`
  - Connexion pool mysql2 + attente du port 3306

## 8. Frontend
Architecture feature-first:
- `features/auth`
- `features/todo`
- `features/user`
- `shared/` (api client, ui commune, token storage)
- `pages/` (Auth, Todo, Profile)
- `app/` (routing + bootstrap)

### 8.1 Routing
- `/auth` -> AuthPage
- `/` -> TodoPage (route privee)
- `/profile` -> ProfilePage (route privee)

`PrivateRoute` redirige vers `/auth` si pas de token local.

### 8.2 Communication API
- `apiClient` Axios centralise:
  - `baseURL = VITE_API_URL`
  - intercepteur `Authorization` si token present

### 8.3 Gestion session
- `localStorage.auth_token`
- extraction `username` et `userId` depuis le payload JWT pour usage UI

## 9. Exécution du projet
## 9.1 Docker Compose
Depuis la racine:
```bash
docker compose up --build
```
Services:
- `db` (MySQL 8)
- `server` (API sur port 3000)
- `client` (Nginx sur port 80)

## 9.2 Local dev
Backend:
```bash
cd server
npm install
npm run dev
```

Frontend:
```bash
cd client
npm install
npm run dev
```

- frontend: `http://localhost:5173`
- backend: `http://localhost:3000`

Le proxy Vite redirige `/auth/*`, `/users`, `/items` vers l'API.

## 10. Variables d'environnement
## 10.1 Backend (principales)
- `PORT`
- `DB_DRIVER` (`memory` | `sqlite` | `mysql`)
- `SQLITE_DB_LOCATION`
- `MYSQL_HOST`
- `MYSQL_USER`
- `MYSQL_DATABASE`
- `MYSQL_ROOT_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

## 10.2 Frontend
- `VITE_API_URL`

## 11. Scripts utiles
## 11.1 Server
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm test`
- `npm run test:coverage`
- `npm run lint`
- `npm run validate:architecture`

## 11.2 Client
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run test:e2e`

## 12. Stratégie de test
## 12.1 Backend
- Unitaires: services metier
- Integration: contrats repositories sur drivers memory/sqlite/mysql
- e2e API: routes auth/users/items via supertest

## 12.2 Frontend
- e2e UI Playwright:
  - auth
  - todos
  - profile

## 13. ADR disponibles
Le dossier `docs/` contient des décisions d'architecture (ADR), notamment:
- React Router DOM
- Nginx reverse proxy
- Axios client HTTP
- Organisation frontend par feature
- bcrypt pour hash mot de passe
- supertest pour e2e backend
- architecture serveur
