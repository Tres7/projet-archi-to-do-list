# Tests

## 1. Organisation générale

Le projet sépare maintenant les tests backend en suites Jest dédiées et garde les tests navigateur côté frontend avec Playwright.

| Suite | Outil | Configuration | Emplacement des tests | Usage principal |
| --- | --- | --- | --- | --- |
| Backend unit | Jest + ts-jest | `server/jest.unit.config.mjs` | `server/apps/**/test/unit/**/*.spec.ts` | règles métier, services applicatifs, handlers isolés |
| Backend integration | Jest + ts-jest | `server/jest.integration.config.mjs` | `server/apps/**/test/integration/**/*.spec.ts` | repositories et drivers de persistance |
| Backend e2e | Jest + ts-jest | `server/jest.e2e.config.mjs` | `server/spec/e2e/**/*.spec.ts` | scénarios HTTP et interactions entre services |
| Backend all | Jest + ts-jest | `server/jest.config.mjs` | `server/spec/**/*.spec.ts` et `server/apps/**/test/**/*.spec.ts` | exécution groupée de toutes les suites backend |
| Frontend e2e | Playwright | `client/playwright.config.js` | `client/e2e/**/*.spec.js` | parcours utilisateur dans Chromium |

Les suites backend partagent une base commune dans `server/jest.base.config.mjs`. Cette base charge `server/.env.test`, configure `ts-jest` en ESM, ignore `dist`, `node_modules`, `coverage` et `spec/legacy`, puis définit les règles de collecte de coverage.

## 2. Configuration Jest backend

### Base commune

`server/jest.base.config.mjs` définit :

- `testEnvironment: node` ;
- transformation TypeScript via `ts-jest` avec `server/tsconfig.jest.json` ;
- support ESM avec `--experimental-vm-modules` dans les scripts npm ;
- chargement automatique de `.env.test` avec override ;
- collecte de coverage sur `apps/**/*.ts` et `common/**/*.ts` ;
- exclusion des fichiers `index.ts`, `.d.ts`, `.spec.ts` et des dossiers de test.

`server/tsconfig.jest.json` étend le `tsconfig.json` principal et ajoute les types `node` et `jest`.

### Suites spécialisées

| Script npm | Config | Dossier coverage | Remarque |
| --- | --- | --- | --- |
| `npm run test:unit` | `jest.unit.config.mjs` | `server/coverage/unit` | tests rapides et isolés |
| `npm run test:integration` | `jest.integration.config.mjs` | `server/coverage/integration` | `maxWorkers: 1` pour éviter les conflits d'infrastructure |
| `npm run test:e2e` | `jest.e2e.config.mjs` | `server/coverage/e2e` | `maxWorkers: 1`, dépend de l'infrastructure |
| `npm run test:all` | `jest.config.mjs` | `server/coverage/all` | regroupe tous les patterns backend |

Le script `npm test` exécute dans l'ordre :

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 3. Ce que couvrent les tests backend

### Unit tests

Ils vérifient notamment :

- les entités et règles de domaine ;
- les services applicatifs ;
- les validations métier ;
- les handlers d'événements isolés ;
- la logique de projection comme `openTaskCount`.

### Integration tests

Ils vérifient notamment :

- le comportement des repositories ;
- les drivers de persistance ;
- la création et la réinitialisation des schémas de stockage ;
- la compatibilité avec les modes `memory`, `sqlite` et `mysql` quand l'environnement le permet.

### Backend e2e

Ils valident :

- les routes HTTP exposées par les services ;
- les scénarios d'authentification et d'inscription ;
- les flux projet/tâches ;
- les notifications liées aux événements ;
- l'intégration avec MySQL, Redis et Mailpit selon le scénario.

Pour les scénarios basés sur l'infrastructure réelle, MySQL, Redis et Mailpit doivent être démarrés avant l'exécution.

## 4. Configuration Playwright frontend

Les tests frontend utilisent `client/playwright.config.js`.

La configuration actuelle :

- cherche les tests dans `client/e2e` ;
- lance Chromium Desktop ;
- active `forbidOnly` en CI ;
- utilise 2 retries en CI ;
- limite les workers à 1 en CI ;
- produit un rapport HTML ;
- collecte une trace au premier retry.

Les tests couvrent typiquement :

- inscription et login ;
- navigation protégée ;
- profil utilisateur ;
- création et consultation de projets ;
- création, changement d'état et suppression de tâches ;
- rendu des notifications.

En mode Docker/CI, Playwright démarre le backend et Vite via `webServer`. Le fallback sur la machine hôte reste piloté par le `Makefile`.

## 5. Préparatifs

Avant de lancer les tests backend ou les commandes locales hors Docker, installer les dépendances :

```bash
make install
```

Équivalent manuel :

```bash
cd server
npm ci

cd ../client
npm ci
```

Les tests frontend e2e utilisent par défaut l'image Docker officielle Playwright, avec les navigateurs déjà présents dans l'image. Pour le fallback frontend e2e sur la machine hôte, installer aussi les navigateurs :

```bash
make install-with-playwright
```

Docker doit être disponible pour les tests qui utilisent MySQL, Redis, Mailpit ou l'image Playwright.

## 6. Lancer les tests via Makefile

### Backend complet

```bash
make test-backend
```

Cette commande démarre l'infrastructure, attend les ports `3306`, `6379` et `1025`, lance `npm test` côté backend, puis arrête l'infrastructure.

### Backend par suite

```bash
make test-backend-unit
make test-backend-integration
make test-backend-e2e
```

Les cibles integration/e2e démarrent l'infrastructure quand c'est nécessaire.

### Coverage backend

```bash
make coverage-backend-unit
make coverage-backend-integration
make coverage-backend-e2e
make coverage-backend-all
```

Chaque suite écrit son rapport dans son dossier `server/coverage/<suite>`.

### Frontend e2e

```bash
make test-frontend
```

Cette commande démarre l'infrastructure, le backend complet et le serveur Vite, attend les ports applicatifs, lance Playwright, puis nettoie les processus et conteneurs démarrés.

Par défaut, elle exécute Playwright dans `mcr.microsoft.com/playwright:v1.58.2-noble`, le même chemin que la CI. Le fallback historique sur la machine hôte reste disponible :

```bash
make test-frontend-host
```

## 7. Lancer les tests sans Makefile

### Backend unit

```bash
cd server
npm run test:unit
```

### Backend integration

```bash
cd server
npm run dev:infra
npm run test:integration
npm run dev:infra:down
```

### Backend e2e

```bash
cd server
npm run dev:infra
npm run test:e2e
npm run dev:infra:down
```

### Backend complet

```bash
cd server
npm run dev:infra
npm test
npm run dev:infra:down
```

### Frontend e2e

Terminal 1 :

```bash
cd server
npm run dev:infra
```

Terminal 2 :

```bash
cd server
npm run dev:all
```

Terminal 3 :

```bash
cd client
npm run dev
```

Terminal 4 :

```bash
cd client
npm run test:e2e
```

Après l'exécution manuelle, arrêter les processus frontend/backend et l'infrastructure Docker.

## 8. CI pull request

Les tests PR sont séparés en trois workflows GitHub Actions :

- `PR Unit Tests` lance les tests unitaires backend avec coverage ;
- `PR Backend Integration Tests` démarre seulement après le succès de `PR Unit Tests`, puis lance integration et backend e2e ;
- `PR Frontend E2E Tests` démarre seulement après le succès de `PR Backend Integration Tests`, puis lance Playwright frontend e2e.

Le seuil minimal du coverage unit backend est `84%` sur les lignes. Ce seuil est défini dans `server/jest.unit.config.mjs`, donc il s'applique aussi hors CI quand la commande unit est lancée avec `--coverage`.

## 9. Artefacts de test

| Artefact | Emplacement |
| --- | --- |
| Coverage unit backend | `server/coverage/unit` |
| Coverage integration backend | `server/coverage/integration` |
| Coverage e2e backend | `server/coverage/e2e` |
| Coverage all backend | `server/coverage/all` |
| Rapport Playwright | `client/playwright-report` |
| Logs Makefile e2e | `.make-logs/backend-e2e.log`, `.make-logs/frontend-e2e.log` |

Les dossiers `coverage`, `playwright-report` et `.make-logs` sont des artefacts locaux et ne doivent pas être traités comme du code source.

## 10. Points d'attention

- Les tests Jest utilisent `.env.test`, donc une valeur modifiée dans ce fichier peut changer le comportement de toutes les suites backend.
- Les suites integration et e2e backend sont en `maxWorkers: 1` pour éviter les collisions sur la base, Redis ou les ports.
- `RUN_MYSQL_TESTS=1` active les scénarios MySQL quand les tests le vérifient.
- Les opérations sur les tâches et les notifications sont partiellement asynchrones, donc les e2e doivent attendre l'état observable final.
- Les notifications reposent sur SSE et Mailpit en développement/test.
- Si un test échoue au démarrage, vérifier d'abord les ports `3000`, `3001`, `3002`, `3003`, `3004`, `3306`, `6379`, `1025` et `5173`.

## 11. Scénario minimal avant livraison

Avant de livrer un changement applicatif :

```bash
make test-backend
make test-frontend
```

Pour un changement limité au backend métier, lancer au minimum :

```bash
make test-backend-unit
make test-backend-integration
```
