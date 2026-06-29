# Client web

Frontend React/Vite de l'application Todo List. Le client parle uniquement au `gateway` via `/api`, stocke le JWT côté navigateur et consomme les notifications temps réel par SSE.

## Stack

- React 19;
- Vite 7;
- TypeScript;
- React Router;
- Axios;
- React Bootstrap / Bootstrap;
- Playwright pour les tests e2e.

## Configuration

Variables attendues:

```env
VITE_API_URL=/api
VITE_API_VERSION=v2
```

`VITE_API_URL` définit la base API publique. `VITE_API_VERSION` choisit la version des routes auth/users.

Le code crée deux clients Axios:

- `apiClient`: `${VITE_API_URL}/v1`, utilisé par projets, tâches et notifications;
- `authApiClient`: `${VITE_API_URL}/${VITE_API_VERSION}`, utilisé par login, register et profil.

En Docker, `docker-entrypoint.sh` génère `/env-config.js` au démarrage pour permettre de changer `VITE_API_VERSION` sans reconstruire l'image.

## Lancement local

Depuis la racine du dépôt:

```bash
make up-frontend
```

ou depuis `client`:

```bash
npm ci
npm run dev
```

Le serveur Vite écoute par défaut sur `http://localhost:5173`.

Pour lancer toute l'application localement:

```bash
make up
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test:e2e
npm run changeset
```

## Tests e2e

Chemin recommandé depuis la racine:

```bash
make test-frontend
```

Ce chemin utilise l'image Docker Playwright déclarée dans `compose.yaml`.

Sur l'hôte, installer les navigateurs puis lancer:

```bash
npx playwright install
npm run test:e2e
```

## Versionnement

Les changements runtime du client doivent avoir un Changeset dans `client/.changeset`:

```bash
make verup client
```

Après merge dans `main`, le workflow CI/CD applique le bump, build l'image client, la publie dans GHCR et l'inscrit dans un manifest de déploiement.
