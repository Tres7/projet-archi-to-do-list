# Sécurité

## 1. Ce qui est déjà implémenté

### 1.1 Authentification basée sur JWT

Le backend utilise JWT pour authentifier les requêtes utilisateur. Après `login`, le client reçoit un token signé qui est ensuite transmis dans :

```http
Authorization: Bearer <jwt>
```

`gateway` vérifie le token, décode le payload et protège les routes internes.

### 1.2 Routes protégées

Les routes liées aux utilisateurs, projets et tâches ne sont accessibles qu'avec un JWT valide. Cela évite les appels anonymes vers les endpoints métier principaux.

### 1.3 Hashage des mots de passe

`auth-service` ne stocke pas les mots de passe en clair. Les mots de passe sont hachés avec `bcrypt` avant écriture dans le repository.

### 1.4 Masquage des détails internes derrière `gateway`

Le frontend ne parle pas directement à `auth-service`, `project-service`, `task-service` ou `notification-service`. Cela permet :

- d'avoir un point d'entrée unique ;
- de centraliser une partie de la logique d'authentification ;
- de réduire l'exposition directe des services internes.

### 1.5 Séparation des responsabilités

Le découpage en services limite le volume de logique sensible dans un seul endroit :

- `auth-service` gère l'identité ;
- `project-service` gère les projets ;
- `task-service` gère le cycle de vie des tâches ;
- `notification-service` gère la diffusion des notifications.

Cette séparation simplifie l'audit et réduit le risque de couplages implicites.

### 1.6 Mode e-mail dry-run

L'infrastructure de notification supporte `NOTIFY_DRY_RUN=1`. En test et en développement, cela évite les envois réels accidentels d'e-mails.

## 2. Frontières de confiance

Le projet a plusieurs frontières de confiance explicites :

- navigateur <-> `gateway` ;
- `gateway` <-> services internes ;
- services <-> Redis/MySQL/SMTP ;
- services <-> Docker network en mode conteneurisé.

À travers ces frontières, les hypothèses suivantes sont faites :

- le JWT reçu par `gateway` est la source de vérité pour l'identité HTTP ;
- Redis/MySQL/SMTP sont considérés comme des dépendances internes de confiance dans l'environnement de dev ;
- le réseau Docker n'est pas traité comme un réseau hostile dans la version actuelle.

## 3. Ce qui compte pour une exécution sûre

Pour exécuter le projet sans dégrader la sécurité, il faut au minimum :

- définir un `JWT_SECRET` non trivial ;
- ne pas exposer MySQL, Redis ou SMTP inutilement hors de la machine locale ;
- éviter de réutiliser les secrets de dev dans un environnement partagé ;
- vérifier que `NOTIFY_DRY_RUN` est correctement configuré avant tout scénario avec e-mail ;
- garder les ports publics limités à ce qui est réellement nécessaire.

## 4. Limitations et risques actuels

### 4.1 JWT stocké dans `localStorage`

Le frontend stocke le JWT dans `localStorage`. C'est pratique en développement, mais expose le token en cas de XSS.

### 4.2 SSE non authentifié côté serveur

Le canal SSE actuel s'appuie sur `userId` en query string. C'est un point faible important : sans validation forte du lien entre la connexion et l'identité, un utilisateur pourrait tenter de s'abonner à un flux qui n'est pas le sien.

### 4.3 Absence de rate limiting

Les routes `register` et `login` n'ont pas encore de protection anti brute force ou anti-abus.

### 4.4 Contrat d'erreur non uniforme

Certaines erreurs métier ou d'infrastructure remontent encore sous forme de `500` générique. Cela ne crée pas directement une faille, mais complique le hardening, l'observabilité et les protections côté client.

### 4.5 Absence de persistance backend des notifications

L'historique des notifications vit surtout côté navigateur. En cas de redémarrage ou de changement d'appareil, il n'existe pas de source serveur persistante des notifications utilisateur.

## 5. Recommandations pratiques d'exploitation

- utiliser des secrets distincts pour `development`, `test` et tout environnement partagé ;
- réserver `localStorage` au contexte de développement et prévoir à terme une stratégie `HttpOnly cookie` ou access/refresh token ;
- ne pas exposer directement les services internes sur Internet ;
- ajouter rate limiting, audit des connexions échouées et rotation correcte des secrets avant toute exposition plus large ;
- traiter Redis, SMTP et MySQL comme des composants d'infrastructure à isoler réseau et à superviser.

## 6. Ce qui aide déjà à maintenir la sécurité

Même si le projet reste pédagogique, plusieurs décisions vont dans le bon sens :

- les mots de passe sont hachés ;
- l'API publique est centralisée ;
- les rôles des services sont séparés ;
- les tests couvrent une partie significative des scénarios backend et frontend ;
- la liste des problèmes de sécurité connus est documentée dans [known-issues](known-issues.md).
