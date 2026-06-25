# Tests

## 1. Vue d'ensemble

Le projet sépare les tests backend en suites Jest spécialisées et les tests navigateur frontend avec Playwright.

| Suite               | Outil          | Configuration                        | Emplacement                                                      | Usage                                               |
| ------------------- | -------------- | ------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------- |
| Backend unit        | Jest + ts-jest | `server/jest.unit.config.mjs`        | `server/apps/**/test/unit/**/*.spec.ts`                          | domaine, application, handlers, repositories isolés |
| Backend integration | Jest + ts-jest | `server/jest.integration.config.mjs` | `server/apps/**/test/integration/**/*.spec.ts`                   | drivers de persistance et repositories              |
| Backend e2e         | Jest + ts-jest | `server/jest.e2e.config.mjs`         | `server/spec/e2e/**/*.spec.ts`                                   | routes HTTP, services assemblés, notifications      |
| Backend all         | Jest + ts-jest | `server/jest.config.mjs`             | `server/spec/**/*.spec.ts` et `server/apps/**/test/**/*.spec.ts` | exécution groupée                                   |
| Frontend e2e        | Playwright     | `client/playwright.config.js`        | `client/e2e/**/*.spec.js`                                        | parcours utilisateur Chromium                       |

Les tests backend utilisent Node.js avec ESM et `--experimental-vm-modules`.

## 2. Configuration Jest backend

### Base commune

`server/jest.base.config.mjs`:

- charge `server/.env.test` avec override;
- utilise `testEnvironment: node`;
- configure `ts-jest` avec `server/tsconfig.jest.json`;
- active `extensionsToTreatAsEsm: ['.ts']`;
- mappe `@app/common/*` vers `server/common/*`;
- collecte le coverage sur `apps/**/*.ts` et `common/**/*.ts`;
- ignore `dist`, `node_modules`, `coverage` et `spec/legacy`;
- produit les rapports `html`, `lcov`, `json-summary`, `text` et `text-summary`.

### Configs spécialisées

| Config                        | `displayName` | `maxWorkers`           | Coverage               |
| ----------------------------- | ------------- | ---------------------- | ---------------------- |
| `jest.unit.config.mjs`        | `unit`        | valeur Jest par défaut | `coverage/unit`        |
| `jest.integration.config.mjs` | `integration` | `1`                    | `coverage/integration` |
| `jest.e2e.config.mjs`         | `e2e`         | `1`                    | `coverage/e2e`         |
| `jest.config.mjs`             | `all`         | `1`                    | `coverage/all`         |

Le seuil global de couverture lignes pour les tests unitaires est `84%`.

### Scripts npm backend

Depuis `server`:

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:all
npm run coverage:unit
npm run coverage:integration
npm run coverage:e2e
npm run coverage:all
```

`npm test` exécute:

```bash
npm run test:unit && npm run test:integration && npm run test:e2e
```

## 3. Ce que couvrent les tests backend

### Unit tests

Ils vérifient notamment:

- entités `Project`, `Task`, `User`;
- value objects `ProjectName`, `OpenTaskCount`, `TaskName`, statuts;
- services applicatifs `AuthService`, `UserService`, `ProjectService`, `ProjectTaskService`, `TaskService`;
- handlers d'événements;
- factories de persistance;
- repositories mémoire;
- routing/controllers avec stubs quand nécessaire.

### Integration tests

Ils vérifient:

- le contrat repository par service;
- les drivers `memory`, `sqlite` et `mysql` quand l'environnement le permet;
- l'initialisation des schémas;
- les comportements de lecture/écriture persistants.

`RUN_MYSQL_TESTS=1` dans `.env.test` active les scénarios MySQL qui le consultent.

### Backend e2e

Ils couvrent:

- routes auth et users;
- scénarios projet/tâche;
- notifications liées aux événements;
- interactions entre `project-service`, `task-service`, `notification-service`;
- intégration avec MySQL, Redis et Mailpit selon le scénario.

## 4. Configuration Playwright frontend

`client/playwright.config.js`:

- cherche les tests dans `client/e2e`;
- lance Chromium Desktop;
- utilise `baseURL: http://localhost:5173`;
- active `trace: on-first-retry`;
- en CI, active `retries: 2`;
- en CI, limite `workers` à `1`;
- en CI, produit les reporters `list`, `github`, `html` et `junit`;
- hors CI, produit un rapport HTML.

En CI, la config Playwright peut démarrer:

- backend: `npm --prefix ../server run dev:all`;
- frontend: `npm run dev -- --host 127.0.0.1`.

Dans le Makefile, le chemin recommandé utilise plutôt le service Compose `playwright`, qui installe les dépendances dans l'image officielle et lance les tests dans un environnement contrôlé.

## 5. Préparation

Installation:

```bash
make install
```

ou:

```bash
cd server
npm ci

cd ../client
npm ci
```

Pour Playwright sur l'hôte:

```bash
make install-with-playwright
```

ou:

```bash
cd client
npx playwright install
```

## 6. Lancer les tests avec Makefile

### Backend complet

```bash
make test-backend
```

Cette cible:

1. démarre `db`, `redis` et `mailpit` via Compose;
2. attend Redis et Mailpit, MySQL étant couvert par `compose up --wait db`;
3. exécute `npm --prefix server run test`;
4. arrête le Compose à la fin.

### Backend unit

```bash
make test-backend-unit
```

Ne démarre pas l'infrastructure.

### Backend integration

```bash
make test-backend-integration
```

Cette cible exécute seulement `npm --prefix server run test:integration`. Elle ne démarre pas l'infrastructure. Si les tests MySQL sont nécessaires, démarrer l'infra avant:

```bash
make infra-up
make test-backend-integration
make down
```

### Backend e2e

```bash
make test-backend-e2e
```

Cette cible démarre `db`, `redis` et `mailpit`, attend les ports nécessaires, lance les e2e, puis nettoie le Compose.

### Coverage backend

```bash
make coverage-backend-unit
make coverage-backend-integration
make coverage-backend-e2e
make coverage-backend-all
```

Attention: `coverage-backend-integration` ne démarre pas l'infrastructure. `coverage-backend-e2e` la démarre.

### Frontend e2e

```bash
make test-frontend
```

Alias du chemin Docker:

```bash
make test-frontend-docker
```

Le service Compose `playwright`:

1. utilise `mcr.microsoft.com/playwright:v1.58.2-noble` par défaut;
2. monte le dépôt dans `/workspace`;
3. installe `server` et `client` avec `npm ci`;
4. attend `db:3306`, `redis:6379`, `mailpit:1025`;
5. lance `npm --prefix client run test:e2e`.

Fallback sur l'hôte:

```bash
make test-frontend-host
```

Cette cible démarre l'infra, le backend et Vite localement, écrit des logs dans `.make-logs`, puis lance Playwright.

## 7. Lancer les tests sans Makefile

### Unit backend

```bash
cd server
npm run test:unit
```

### Integration backend avec infra

Depuis la racine:

```bash
docker compose up -d --wait db redis mailpit

cd server
npm run test:integration

cd ..
docker compose down
```

### E2E backend avec infra

Depuis la racine:

```bash
docker compose up -d --wait db redis mailpit

cd server
npm run test:e2e

cd ..
docker compose down
```

### Frontend e2e sur hôte

Terminal 1:

```bash
docker compose up -d --wait db redis mailpit
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

Terminal 4:

```bash
cd client
npm run test:e2e
```

## 8. Tests et événements asynchrones

Les tests qui touchent aux tâches et aux notifications doivent tenir compte de la cohérence éventuelle:

- une réponse HTTP `201` ou `202` sur une tâche signifie que la commande est acceptée;
- l'état final arrive via BullMQ;
- la vue frontend se met à jour après réception SSE;
- les tests doivent attendre l'état observable final plutôt que supposer une mise à jour immédiate.

Points à surveiller:

- queues Redis isolées par `BUS_PREFIX=test`;
- workers `project-service`, `task-service`, `notification-service` démarrés;
- Mailpit disponible sur `1025`;
- données MySQL résiduelles si les volumes ne sont pas nettoyés.

## 9. CI GitHub Actions

### Workflows de test principaux

| Workflow        | Déclencheur              | Contenu |
| --------------- | ------------------------ | ------- |
| `pr_main.yml`   | pull request vers `main` | lint, build, tests backend, tests frontend, Docker checks, manifests, CodeQL, Gitleaks |
| `nightly.yml`   | planning ou manuel       | CodeQL planifié, audit npm, Trivy production |

Node.js CI: `24.x`.

### Workflows qualité/sécurité

| Workflow            | Rôle |
| ------------------- | ---- |
| `pr_main.yml`       | orchestration des checks Pull Request via composite actions |
| `pre_push_main.yml` | versioning Changesets, vérification des images candidates, publication GHCR et mise à jour integration par manifest |
| `release.yml`       | promotion manuelle vers production |
| `nightly.yml`       | CodeQL planifié, audit npm et scan Trivy des digests production |

### Artefacts CI

| Artefact                           | Source                                                  |
| ---------------------------------- | ------------------------------------------------------- |
| `backend-unit-test-results`        | `server/unit-results.json`                              |
| `backend-unit-coverage`            | `server/coverage/unit/**`                               |
| `backend-integration-test-results` | `server/integration-results.json`                       |
| `backend-integration-coverage`     | `server/coverage/integration/**`                        |
| `backend-e2e-test-results`         | `server/e2e-results.json`                               |
| `backend-e2e-coverage`             | `server/coverage/e2e/**`                                |
| `frontend-e2e-reports`             | `client/playwright-report/**`, `client/test-results/**` |

## 10. Artefacts locaux

| Artefact                     | Emplacement                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| Coverage unit backend        | `server/coverage/unit`                                      |
| Coverage integration backend | `server/coverage/integration`                               |
| Coverage e2e backend         | `server/coverage/e2e`                                       |
| Coverage all backend         | `server/coverage/all`                                       |
| Rapport Playwright           | `client/playwright-report`                                  |
| Résultats Playwright         | `client/test-results`                                       |
| Logs Makefile frontend host  | `.make-logs/backend-e2e.log`, `.make-logs/frontend-e2e.log` |
| Sorties Jest JSON CI local   | `server/*-results.json`                                     |

Ces fichiers sont des artefacts de test et ne doivent pas être traités comme du code source.

## 11. Scénarios recommandés avant livraison

Changement applicatif complet:

```bash
make test-backend
make test-frontend
```

Changement backend pur:

```bash
make test-backend-unit
make infra-up
make test-backend-integration
make test-backend-e2e
make down
```

Changement frontend pur:

```bash
cd client
npm run lint
cd ..
make test-frontend
```

Changement architecture/imports backend:

```bash
cd server
npm run validate:architecture
npm run lint
npm run test:unit
```

## 12. Dépannage

| Symptôme                         | Vérifications                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------- |
| Jest ne trouve pas `@app/common` | vérifier `moduleNameMapper` et build common si test hors Jest                   |
| tests MySQL ignorés ou échouent  | vérifier `RUN_MYSQL_TESTS`, MySQL et credentials `.env.test`                    |
| e2e backend timeout              | vérifier Redis, Mailpit, ports `3100`-`3104` ou `3000`-`3004` selon le scénario |
| Playwright ne démarre pas        | préférer `make test-frontend`, ou installer les navigateurs sur l'hôte          |
| notifications non reçues         | vérifier `EventSource`, `userId`, Redis et workers de messaging                 |
| coverage unit sous seuil         | le seuil de lignes est `84%` dans `jest.unit.config.mjs`                        |
