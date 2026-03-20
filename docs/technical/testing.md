# Tests

## 1. Quels tests existent dans le projet

Le projet contient deux grands groupes de tests :

- tests backend ;
- tests e2e frontend.

Le backend couvre les règles métier, les repositories, l'intégration avec plusieurs drivers de stockage et une partie des scénarios end-to-end côté services. Le frontend est vérifié avec Playwright à travers des scénarios utilisateur réels dans le navigateur.

## 2. Ce que couvre la suite de tests backend

### Unit tests

Ils vérifient notamment :

- les entités et règles de domaine ;
- les use cases de création, modification et suppression ;
- les validations métier ;
- la logique de projection comme `openTaskCount`.

### Integration tests

Ils vérifient notamment :

- le fonctionnement des repositories ;
- le comportement avec différents drivers de persistance ;
- la compatibilité avec :
  - `InMemoryRepository`
  - `SqliteRepository`
  - `MysqlRepository`

### Backend e2e

Ils valident les interactions entre services backend, routes HTTP, infrastructure et composants de messaging.

Important : pour les scénarios backend e2e basés sur l'infrastructure réelle, MySQL/Redis doivent être démarrés.

## 3. Ce que couvre le frontend e2e

Les tests Playwright couvrent typiquement :

- inscription et login ;
- création de projet ;
- ouverture du détail d'un projet ;
- création de tâches ;
- changement d'état des tâches ;
- suppression de tâches ;
- rendu des notifications ;
- scénarios de navigation et de protection de session.

Ces tests lancent le frontend, le backend et l'infrastructure nécessaire, puis vérifient le comportement visible de l'application.

## 4. Préparatifs

Avant de lancer les tests, il faut :

- installer les dépendances backend et frontend ;
- installer les navigateurs Playwright ;
- vérifier que Docker est disponible pour l'infrastructure ;
- s'assurer que les ports requis sont libres.

Installation initiale :

```bash
make install
```

ou manuellement :

```bash
cd server
npm ci

cd ../client
npm ci
npx playwright install
```

## 5. Lancer les tests via make

### Tests backend

```bash
make test-backend
```

Ce que fait la commande :

- démarre l'infrastructure nécessaire ;
- lance la suite de tests backend ;
- arrête ce qu'elle a démarré après l'exécution.

### Tests frontend

```bash
make test-frontend
```

Ce que fait la commande :

- démarre l'infrastructure ;
- démarre le backend ;
- démarre le frontend ;
- lance les tests Playwright ;
- arrête les processus locaux et les conteneurs après l'exécution.

## 6. Lancer les tests sans make

### Backend

```bash
cd server
npm run dev:infra
```

Dans un autre terminal :

```bash
cd server
npm test
```

Si le projet sépare aussi des commandes backend e2e dédiées dans `package.json`, elles peuvent être lancées de la même manière après démarrage de l'infrastructure.

### Frontend e2e

Terminal 1, infrastructure :

```bash
cd server
npm run dev:infra
```

Terminal 2, backend :

```bash
cd server
npm run dev:all
```

Terminal 3, frontend :

```bash
cd client
npm run dev
```

Terminal 4, tests Playwright :

```bash
cd client
npm run test:e2e
```

Après l'exécution, il faut arrêter manuellement les processus et les conteneurs si vous n'utilisez pas `make`.

## 7. Commandes utiles supplémentaires

Backend uniquement :

```bash
cd server
npm test
```

Frontend Playwright en mode UI ou debug selon `package.json` :

```bash
cd client
npm run test:e2e
```

Arrêt de l'infrastructure :

```bash
docker compose down
```

## 8. Où se trouvent les artefacts de test

Selon la configuration actuelle :

- les rapports Playwright sont générés dans le répertoire standard de Playwright côté `client` ;
- la couverture backend, si activée, se trouve dans les répertoires de reporting du backend ;
- les logs runtime restent dans la sortie standard des processus ou des conteneurs.

## 9. Particularités importantes

- une partie des opérations sur les tâches est asynchrone, donc les e2e s'appuient sur l'état final observé dans l'UI et pas seulement sur la réponse HTTP immédiate ;
- les notifications utilisent SSE, donc les tests frontend dépendent aussi du bon fonctionnement du `notification-service` ;
- certaines suites backend peuvent dépendre de `RUN_MYSQL_TESTS=1` et d'un environnement Docker fonctionnel ;
- si des services ou tests précédents ont laissé des ports occupés, les suites peuvent échouer au démarrage.

## 10. Scénario minimal recommandé avant livraison d'un changement

1. lancer `make test-backend` ;
2. lancer `make test-frontend` ;
3. vérifier qu'après les tests, il ne reste ni processus applicatifs, ni conteneurs inutiles.
