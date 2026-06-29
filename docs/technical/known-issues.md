# Problèmes connus et plan de correction

Dernière mise à jour: 29 juin 2026.

Ce document liste les limites visibles dans le code et l'architecture actuels. Les problèmes déjà corrigés ne sont plus gardés ici: par exemple les migrations MySQL existent maintenant, `login`/`register` ont un rate limiter en production, et les workflows disposent d'un déploiement Compose sur VM.

## 1. Le canal SSE n'est pas authentifié côté serveur

### Symptôme

`notification-service` accepte:

```http
GET /api/v1/notifications/events?userId=<user-id>
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

`gateway` proxifie les routes `/api/*`, mais ne valide pas le JWT. La protection est appliquée dans `auth-service` pour `/users`, `/v1/users`, `/v2/users` et dans `project-service` pour `/projects` et `/v1/projects`.

### Risque

Un futur endpoint interne exposé par erreur via `gateway` pourrait être accessible sans contrôle si le service cible ne protège pas lui-même la route.

### Plan de correction

- décider explicitement si l'autorisation doit rester distribuée ou être centralisée;
- si elle est centralisée, ajouter un middleware JWT dans `gateway`;
- conserver une validation de défense en profondeur dans les services sensibles;
- documenter la règle dans les tests.

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

## 5. SQLite n'est pas aligné avec les migrations MySQL

### Symptôme

MySQL utilise maintenant Umzug et une table `schema_migrations`. SQLite continue d'utiliser des fichiers `schema.ts` dans chaque driver. Exemple visible: `users.birth_date` existe côté MySQL pour l'API v2, mais pas dans le schéma SQLite actuel.

### Risque

- comportement différent entre drivers;
- tests SQLite moins représentatifs du runtime MySQL;
- évolutions de schéma plus difficiles à valider sur tous les modes de stockage.

### Plan de correction

- décider si SQLite reste un driver léger de développement ou devient un driver supporté au même niveau que MySQL;
- si SQLite reste supporté, introduire une stratégie de migrations équivalente;
- ajouter des tests de comparaison des schémas utiles;
- documenter explicitement les écarts acceptés.

## 6. Drift de schéma MySQL historique

### Symptôme

`projects.tasks` existe en MySQL mais pas en SQLite et n'est plus utilisé par le domaine actuel.

### Risque

- confusion lors de l'exploitation;
- schémas divergents entre drivers;
- dette de migration lors d'une future contrainte plus stricte.

### Plan de correction

- supprimer ou migrer la colonne `projects.tasks`;
- ajouter une migration MySQL dédiée;
- vérifier l'impact sur les manifests et le rollback;
- garder les schémas documentés alignés avec le domaine.

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

## 10. Validation métier partielle côté HTTP

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

## 11. Pas de persistance des opérations asynchrones

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

## 12. Rate limiting encore minimal

### Symptôme

`login` et `register` utilisent `express-rate-limit` en production avec une limite simple par fenêtre. Il n'y a pas encore de journal d'audit, de throttling progressif, de verrouillage temporaire ou de protection spécifique par compte.

### Risque

- faible visibilité sur les tentatives échouées;
- protection brute force correcte mais minimale;
- difficulté à enquêter en environnement partagé.

### Plan de correction

- journaliser les tentatives échouées;
- ajouter un throttling progressif;
- envisager une limite par couple IP/username;
- surveiller les compteurs du rate limiter.

## 13. Priorités recommandées

Ordre de traitement conseillé:

1. sécuriser le SSE;
2. uniformiser le mapping d'erreurs HTTP;
3. clarifier la suppression de projet et le cycle de vie des tâches associées;
4. ajouter un suivi d'opération par `operationId`;
5. aligner ou documenter définitivement SQLite face à MySQL;
6. supprimer la colonne legacy `projects.tasks`;
7. persister les notifications côté backend;
8. durcir l'authentification au-delà du rate limiting simple;
9. réduire l'exposition réseau MySQL/Redis/SMTP sur les environnements partagés.
