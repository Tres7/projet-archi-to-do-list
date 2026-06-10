# Problèmes connus et plan de correction

Ce document liste les limites visibles dans le code et l'architecture actuels. Il complète les sections [Architecture](architecture.md), [Sécurité](security.md), [Base de données](database.md) et [API](api.md).

## 1. Le canal SSE n'est pas authentifié côté serveur

### Symptôme

`notification-service` accepte:

```http
GET /api/notifications/events?userId=<user-id>
```

Le service vérifie seulement que `userId` est présent. Le JWT n'est pas vérifié dans le service de notification.

### Risque

Un utilisateur qui connaît un `userId` peut tenter de recevoir des événements qui ne lui appartiennent pas.

### Plan de correction

- vérifier le JWT côté `notification-service`;
- ou émettre un token court dédié au SSE depuis un endpoint authentifié;
- supprimer `userId` comme source de vérité d'identité;
- ajouter des tests e2e de refus d'abonnement non autorisé.

## 2. Le JWT est stocké dans `localStorage`

### Symptôme

Le frontend stocke le token sous la clé `auth_token` et décode localement `userId`, `email` et `username`.

### Risque

En cas de XSS, le token peut être lu et réutilisé.

### Plan de correction

- migrer vers des cookies `HttpOnly`, `Secure`, `SameSite`;
- ou adopter un schéma access token court + refresh token protégé;
- ajouter une CSP stricte;
- limiter la durée de vie des tokens;
- auditer les affichages de contenu utilisateur.

## 3. `gateway` n'est pas une couche d'autorisation

### Symptôme

`gateway` proxifie les routes `/api/*`, mais ne valide pas le JWT. La protection est appliquée dans `auth-service` pour `/users` et dans `project-service` pour `/projects`.

### Risque

Un futur endpoint interne exposé par erreur via `gateway` pourrait être accessible sans contrôle si le service cible ne protège pas lui-même la route.

### Plan de correction

- décider explicitement si l'autorisation doit rester distribuée ou être centralisée;
- si elle est centralisée, ajouter un middleware JWT dans `gateway`;
- conserver une validation de défense en profondeur dans les services sensibles;
- documenter la règle dans les tests et dans dependency-cruiser si nécessaire.

## 4. Les notifications ne sont pas persistées côté backend

### Symptôme

- les connexions SSE vivent dans `InMemorySseHub`;
- l'historique est stocké dans `localStorage`;
- le compteur non lu est stocké dans `localStorage`.

### Risque

- perte des connexions au redémarrage;
- historique absent sur un autre navigateur/appareil;
- scaling horizontal difficile;
- impossibilité de reconstruire un état fiable côté serveur.

### Plan de correction

- créer un modèle de notification persistant;
- stocker les notifications non lues côté serveur;
- ajouter des endpoints de lecture/marquage lu;
- utiliser une couche pub/sub ou Redis Streams pour distribuer les événements entre instances.

## 5. Les schémas évoluent sans migrations

### Symptôme

Les tables sont créées avec `CREATE TABLE IF NOT EXISTS` dans les drivers. Il n'existe pas de système de migrations.

### Risque

- dérive entre MySQL et SQLite;
- changements de schéma difficiles à appliquer sans perte de données;
- environnements locaux incohérents;
- dette de production importante.

### Plan de correction

- introduire un outil de migration;
- versionner les changements de schéma;
- ajouter un smoke test de schéma au démarrage ou en CI;
- documenter les procédures de rollback.

## 6. Drift des schémas et de la configuration MySQL

### Symptôme

- `projects.tasks` existe en MySQL mais pas en SQLite et n'est plus utilisé;
- le code applicatif lit actuellement `MYSQL_ROOT_PASSWORD` comme mot de passe;
- `MYSQL_PASSWORD` est utilisé par Compose/healthcheck, mais pas comme mot de passe applicatif principal.

### Risque

- confusion lors du déploiement;
- configuration moins portable;
- schémas divergents entre drivers;
- risque d'utiliser un compte trop privilégié.

### Plan de correction

- remplacer l'usage applicatif de `MYSQL_ROOT_PASSWORD` par `MYSQL_PASSWORD`;
- supprimer ou migrer la colonne `projects.tasks`;
- créer un utilisateur applicatif à privilèges limités;
- ajouter des tests qui comparent les schémas MySQL et SQLite.

## 7. Gestion des erreurs HTTP non uniforme

### Symptôme

Certains contrôleurs mappent correctement `NotFoundError` ou `UnauthorizedError`, mais d'autres chemins encapsulent encore des erreurs de domaine en `500`.

Exemples:

- certains échecs de `getProjectDetails` sont renvoyés comme `500`;
- certaines erreurs de clôture de projet peuvent être masquées par une erreur générique;
- les erreurs de validation domaine ne sont pas toutes exposées en `400`.

### Risque

- contrat API difficile à consommer;
- tests e2e moins précis;
- mauvaise expérience utilisateur;
- observabilité limitée.

### Plan de correction

- introduire un middleware Express unique de mapping d'erreurs;
- conserver les erreurs de domaine sans les envelopper trop tôt;
- définir un format d'erreur commun;
- ajouter des tests par type d'erreur.

## 8. Cohérence éventuelle des tâches

### Symptôme

Créer, basculer ou supprimer une tâche renvoie une réponse `accepted`, puis le traitement réel se fait via BullMQ.

### Risque

- l'utilisateur peut voir temporairement un état ancien;
- une panne Redis/worker retarde ou bloque la projection;
- aucun endpoint ne permet de consulter l'état d'une opération par `operationId`.

### Plan de correction

- ajouter un état d'opération persistant ou temporaire;
- exposer `GET /operations/:operationId`;
- afficher clairement les opérations pending côté frontend;
- ajouter des retries/alertes opérationnelles sur les queues.

## 9. Suppression de projet sans cascade métier documentée

### Symptôme

La suppression d'un projet supprime le projet côté `project-service` et publie `project.deleted`, mais il n'existe pas encore de flux documenté qui supprime automatiquement les tâches associées dans `task-service`.

### Risque

- tâches orphelines côté `task-service`;
- détails incohérents si un flux futur consulte les tâches sans projet;
- nettoyage manuel nécessaire.

### Plan de correction

- décider de la règle métier: cascade, archivage ou interdiction de suppression avec tâches;
- publier une commande `project.deleted` ou `task.project-deletion.requested` consommée par `task-service`;
- ajouter un test e2e de suppression de projet avec tâches;
- documenter la stratégie retenue.

## 10. Absence de rate limiting

### Symptôme

Les routes `POST /api/auth/login` et `POST /api/auth/register` n'ont pas de limitation de fréquence.

### Risque

- brute force login;
- spam d'inscription;
- charge inutile sur bcrypt et la base.

### Plan de correction

- ajouter un rate limiter dans `gateway` ou `auth-service`;
- journaliser les tentatives échouées;
- ajouter un throttling progressif;
- envisager CAPTCHA ou vérification e-mail si le projet devient public.

## 11. Validation métier partielle côté HTTP

### Symptôme

Les value objects valident certains champs (`ProjectName`, `TaskName`), mais les contrôleurs convertissent parfois directement avec `String(req.body.name)`. Des erreurs de domaine peuvent donc se transformer en `500`.

### Risque

- un champ manquant peut devenir une chaîne inattendue;
- le client ne reçoit pas un `400` clair;
- les règles métier sont moins visibles au niveau API.

### Plan de correction

- ajouter une validation de requête explicite;
- renvoyer `400` pour les erreurs de payload;
- utiliser un schéma de validation partagé ou local;
- couvrir les payloads invalides par tests.

## 12. Pas de persistance des opérations asynchrones

### Symptôme

Les réponses de tâches contiennent `operationId`, mais cet identifiant n'est pas stocké dans une table ou exposé par une API de suivi.

### Risque

- impossible de diagnostiquer facilement l'état d'une commande;
- le frontend dépend uniquement du SSE et des relances de lecture;
- perte d'information si la notification n'est pas reçue.

### Plan de correction

- créer un store d'opérations;
- persister `operationId`, `status`, `resourceId`, `reason`;
- exposer un endpoint de consultation;
- publier les changements d'état via SSE.

## 13. Absence de fichier Compose de production

### Symptôme

Le dépôt versionne `compose.yaml`, mais aucun `compose.prod.yml`.

### Risque

- ambiguïté si un environnement attend une configuration production;
- réutilisation accidentelle de valeurs de développement;
- exposition de ports ou secrets non adaptés.

### Plan de correction

- créer un Compose ou une configuration d'orchestration dédiée à la production si nécessaire;
- ne pas réutiliser les `.env` de développement;
- isoler les services internes;
- documenter TLS, reverse proxy, secrets et volumes.

## 14. Priorités recommandées

Ordre de traitement conseillé:

1. sécuriser le SSE;
2. corriger la gestion MySQL `MYSQL_PASSWORD` / `MYSQL_ROOT_PASSWORD`;
3. uniformiser le mapping d'erreurs HTTP;
4. introduire des migrations de schéma;
5. clarifier la suppression de projet et le cycle de vie des tâches associées;
6. ajouter un suivi d'opération par `operationId`;
7. persister les notifications côté backend;
8. ajouter rate limiting et durcissement d'authentification;
9. définir une vraie configuration de production.
