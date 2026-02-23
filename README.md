# Todo List — Refonte architecturale

Application Todo List refondue dans le cadre du cours d'Architecture Logicielle (M1 Dev Full Stack — 2025/2026).

Basée sur l'application monolithique (https://github.com/docker/getting-started-app), refondue en architecture découplée frontend/backend, typée TypeScript, testée et conteneurisée sous Docker Compose.

---
## Stack technique

| Côté | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite, Bootstrap, Axios, React Router DOM |
| Backend | Node.js, Express, TypeScript |
| Base de données | MySQL (production), SQLite (dev), InMemory (tests) |
| Authentification | JWT, bcrypt |
| Tests | Jest (unitaire + intégration), Playwright (E2E) |
| Infrastructure | Docker Compose, Nginx |

---

## Prérequis

- [Docker](https://www.docker.com/) et Docker Compose
- [Node.js](https://nodejs.org/) LTS (pour le développement local)

---
## Lancer le projet

### Avec Docker Compose (recommandé)
```bash
docker compose up --build
```
L'application est disponible sur http://localhost


### En développement local
#### Backend
```bash
cd server
npm install
npm run dev
```
#### Frontend (dans un autre terminal bien sûr)
```bash
cd client
npm install
npm run dev
```
Le frontend est accessible sur  http://localhost:5173.
Le proxy Vite redirige automatiquement les appels API vers http://localhost:3000


---
## Tests
### Tests backend (unitaires + intégration)
```bash
cd server
npm test
```
Les tests utilisent une base InMemory — aucune base de données requise.
Pour le rapport de couverture :
```bash
npm run test:coverage
```
Le rapport HTML est généré dans server/coverage/.
### Tests E2E frontend (Playwright)
L'application doit être lancée avant d'exécuter les tests E2E.
```bash
cd client
npm run test:e2e
```
### Validation de l'architecture
```bash
cd server
npm run validate:architecture
```
Vérifie que les règles de dépendances entre couches sont respectées (ex : le domaine ne doit pas importer depuis l'infrastructure).

---
## Documentation
Les décisions d'architecture sont documentées sous forme d'ADR dans le dossier "docs" 

