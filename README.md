# Todo List - application distribuée de gestion de projets et de tâches

Ce dépôt contient un système full-stack d'apprentissage construit comme un ensemble de services séparés : authentification, gestion des projets, gestion des tâches, notifications et client web. Le projet montre comment combiner HTTP synchrone, échanges asynchrones via événements, SSE pour les notifications, plusieurs drivers de persistance et plusieurs modes d'exécution.

## Fonctionnalités principales

- inscription et authentification avec JWT ;
- gestion du profil utilisateur ;
- création et clôture de projets ;
- création, suppression et changement d'état des tâches ;
- mise à jour asynchrone des compteurs de tâches ouvertes ;
- notifications en temps réel via SSE et e-mail ;
- support de plusieurs drivers de stockage : `memory`, `sqlite`, `mysql`.

## Architecture en deux lignes

- Le frontend est une SPA React/Vite qui communique uniquement avec le `gateway` public.
- Le backend est découpé en `gateway`, `auth-service`, `project-service`, `task-service`, `notification-service`, avec Redis/BullMQ pour les échanges asynchrones, MySQL/SQLite pour la persistance et Mailpit pour les e-mails de développement.

## Commandes rapides

Installation initiale :

```bash
make install
```

Exécution locale :

```bash
make up
```

Exécution complète dans Docker :

```bash
make up-docker
```

Tests backend :

```bash
make test-backend
```

Tests frontend e2e :

```bash
make test-frontend
```

Arrêt et nettoyage des conteneurs :

```bash
make down
make clean
```

## Documentation technique

Note : Pour lire les documents, il est recommandé d'utiliser un outil compatible avec Mermaid.

Toute la documentation technique détaillée se trouve dans [`docs/technical`](docs/technical/README.md).

Sections principales :

- [Architecture](docs/technical/architecture.md)
- [Microservices](docs/technical/microservices.md)
- [API](docs/technical/api.md)
- [Base de données](docs/technical/database.md)
- [Sécurité](docs/technical/security.md)
- [Déploiement](docs/technical/deployment.md)
- [Tests](docs/technical/testing.md)
- [Problèmes connus](docs/technical/known-issues.md)

## ADR

Les décisions d'architecture historiques et complémentaires se trouvent dans `docs/ADR`.
