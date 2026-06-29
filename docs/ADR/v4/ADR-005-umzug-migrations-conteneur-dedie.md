# Umzug pour les migrations de base de données, conteneur dédié en production

**Status:** Accepté

## Contexte

L'ajout du champ `birthDate` obligatoire (fil rouge du projet) impose une évolution de schéma sur la base de `auth-service`. Le code existant créait les tables via `CREATE TABLE IF NOT EXISTS` au démarrage, sans suivi de l'état des migrations ni mécanisme de rollback. Le cours impose un comportement différent en développement (migration au démarrage du service) et en production (conteneur/job dédié exécuté avant le redémarrage des services).

## Options

### Option 1 - ORM avec migration intégrée (ex. TypeORM)

Utiliser un ORM gérant nativement les migrations et la synchronisation de schéma.

### Option 2 - Umzug, exécuté au démarrage en dev et dans un conteneur dédié en prod

Utiliser Umzug comme runner de migration agnostique de l'ORM, avec stockage de l'état des migrations appliquées en base (`MysqlUmzugStorage`), une factory partagée (`createMysqlMigrator.ts`), des fichiers de migration par service (`server/apps/auth-service/src/migrations/`) et un CLI (`scripts/migrate.ts`). En développement, la migration est lancée au démarrage du service ; en production, un service Docker Compose dédié par service (`auth-service-migrate`, `project-service-migrate`, `task-service-migrate`) exécute `node apps/<service>/dist/scripts/migrate.js up` et doit se terminer avec succès (`service_completed_successfully`) avant que le service applicatif ne démarre.

## Décision

L'option 2 est retenue : Umzug gère les migrations de chaque service, avec exécution au démarrage en développement et via un conteneur Compose dédié exécuté avant le service applicatif en production.

## Conséquences

### Positives (Bénéfices)

- L'état des migrations appliquées est stocké en base et non déduit de l'état du schéma, ce qui rend les migrations idempotentes et traçables.
- En production, séparer la migration du démarrage du service applicatif évite qu'un service démarre avec un schéma partiellement migré, et permet de bloquer le déploiement si la migration échoue avant même de redémarrer le service.
- TypeORM (initialement envisagé) a été explicitement écarté : Umzug reste découplé de la couche de persistance applicative (multi-driver), conforme à l'architecture déjà en place.

### Négatives (Inconvénients)

- Chaque service doit dupliquer son propre dossier `migrations/` et son script CLI, même si la logique de connexion est partagée via `createMysqlMigrator.ts`.
- Le rollback (`migrate.js down`) doit être écrit et maintenu manuellement pour chaque migration, sans garantie automatique d'absence de perte de données.

### Impact futur

Toute nouvelle migration devra explicitement gérer la compatibilité avec l'ancienne version du service tant que les deux coexistent en déploiement (ex. colonne `birthDate` ajoutée en `NULL` autorisé pour rester non cassante avant que `auth-service` v2 ne la rende obligatoire au niveau applicatif).
