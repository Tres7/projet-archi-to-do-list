# Problèmes connus et plan de correction

Ci-dessous figurent les limitations et dettes techniques déjà visibles dans le code et l'architecture actuels.

## 1. Le canal SSE n'est pas authentifié côté serveur

### Symptôme

`notification-service` accepte une connexion de la forme :

```http
GET /api/notifications/events?userId=<user-id>
```

et ne vérifie pas le JWT.

### Risque

En connaissant un `userId`, un utilisateur peut tenter de s'abonner au flux d'événements d'un autre utilisateur.

### Plan de correction

- signer l'abonnement SSE non pas avec `userId`, mais avec un JWT vérifié ;
- ou bien émettre un token court dédié à l'abonnement SSE ;
- supprimer la confiance accordée à la query string comme source d'identité.

## 2. Le JWT est stocké dans `localStorage`

### Symptôme

Le frontend stocke le token dans `localStorage` et y lit aussi `userId`, `email`, `username`.

### Risque

En cas de compromission XSS, le token peut être volé.

### Plan de correction

- passer à un `HttpOnly` cookie ou à un schéma combiné access/refresh token ;
- réduire la durée de vie de l'access token ;
- mettre en place une CSP plus stricte et une meilleure sanitation UI.

## 3. Les notifications ne sont pas persistées côté backend

### Symptôme

- les connexions SSE sont stockées dans `InMemorySseHub` ;
- l'historique des notifications est stocké uniquement dans le `localStorage` du navigateur.

### Risque

- après redémarrage du backend, les connexions actives disparaissent ;
- l'historique des notifications est perdu lors d'un changement de navigateur ou d'appareil ;
- le scaling horizontal de `notification-service` devient difficile.

### Plan de correction

- externaliser le stockage des notifications dans un stockage dédié ;
- conserver les notifications non lues côté serveur ;
- utiliser un mécanisme pub/sub ou un broker partagé pour le fan-out entre plusieurs instances de `notification-service`.

## 4. Le schéma de base évolue sans migrations

### Symptôme

Les tables sont créées via `CREATE TABLE IF NOT EXISTS` directement dans le code des drivers. Il n'existe pas de système de migration séparé.

### Risque

- difficile de suivre l'évolution du schéma entre versions ;
- risque d'écart de schéma entre `sqlite` et `mysql` ;
- mise à jour moins prévisible d'un environnement proche de la production.

### Plan de correction

- introduire des migrations explicites ;
- décrire la version du schéma séparément du code runtime ;
- ajouter une vérification smoke du schéma au démarrage.

## 5. Drift des schémas de stockage

### Symptôme

- le schéma MySQL `projects` contient une colonne legacy `tasks` qui n'est plus utilisée ;
- le code des services utilise `MYSQL_ROOT_PASSWORD` comme mot de passe applicatif au lieu de `MYSQL_PASSWORD`.

### Risque

- une configuration MySQL non standard peut cesser de fonctionner de manière inattendue ;
- la portabilité d'environnement devient plus confuse.

### Plan de correction

- supprimer la colonne inutilisée `tasks` ou l'encadrer formellement par une migration ;
- commencer à utiliser un `MYSQL_PASSWORD` dédié pour l'application.

## 6. Gestion des erreurs non uniforme dans la couche HTTP

### Symptôme

Une partie des contrôleurs et services transforme encore des erreurs de domaine en `500` générique, alors qu'il serait plus utile pour le client de recevoir `400`, `403`, `404` ou `409`.

### Risque

- le frontend reçoit un diagnostic moins précis ;
- il est plus difficile de stabiliser le contrat d'API ;
- l'intégration et les tests sont plus coûteux à maintenir.

### Plan de correction

- introduire une couche unique de mapping d'erreurs ;
- normaliser les exceptions de domaine et d'infrastructure ;
- décrire les réponses d'erreur comme partie intégrante du contrat d'API.

## 7. Eventual consistency pour les commandes de tâche

### Symptôme

La création, le changement d'état et la suppression d'une tâche fonctionnent comme des commandes acceptées. L'état final n'apparaît qu'ensuite, après traitement de l'événement.

### Risque

- l'utilisateur ne voit pas immédiatement le résultat final ;
- il faut relire l'état et garder l'abonnement SSE ;
- en cas de dégradation de la queue, l'UI paraît moins réactive.

### Plan de correction

- ajouter côté client une indication explicite des opérations pending ;
- stocker le statut des opérations par `operationId` ;
- si nécessaire, ajouter un chemin synchrone ciblé pour certains scénarios.

## 8. Absence de rate limiting et de protection brute force

### Symptôme

Les routes `register` et `login` n'ont pas de limitation de fréquence.

### Risque

- attaques brute force sur le login ;
- spam d'inscription ;
- charge inutile sur le service.

### Plan de correction

- ajouter un rate limiter sur `gateway` ou `auth-service` ;
- auditer les tentatives de login échouées ;
- si nécessaire, ajouter un CAPTCHA ou un throttling progressif.

## 9. Ce qu'il faut traiter en priorité

Ordre recommandé de la dette technique :

1. sécuriser l'authentification SSE ;
2. normaliser la gestion du mot de passe MySQL ;
3. introduire les migrations de schéma ;
4. uniformiser la gestion des erreurs ;
5. sortir le stockage des notifications de `localStorage`/in-memory ;
6. ajouter rate limiting et hardening sécurité.
