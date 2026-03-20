# ADR-001 Choix entre reverse proxy Nginx, API Gateway Node.js et BFF — API Gateway Node.js

**Date :** 2026-03-19
**Statut :** Accepted

## Contexte

Le projet expose désormais plusieurs services backend (`auth-service`, `project-service`, `task-service`, `notification-service`) derrière un client web unique.

Il faut :
- fournir un point d'entrée HTTP unique sous `/api` ;
- masquer les services internes au client ;
- router à la fois des requêtes JSON classiques et un flux SSE ;
- garder une solution simple à faire évoluer dans Docker Compose et dans le même stack que le reste du projet.

## Options

### 1. Reverse proxy Nginx dédié à l'API

Description :
- utiliser uniquement Nginx pour router `/api/*` vers les services backend ;
- conserver une configuration déclarative par blocs `location`.

Avantages :
- très bonne performance ;
- faible empreinte runtime ;
- technologie éprouvée pour le proxy HTTP.

Inconvénients :
- configuration moins flexible dès qu'il faut faire évoluer le routage ;
- plus difficile à tester et à versionner comme du code applicatif ;
- moins pratique pour ajouter plus tard des règles applicatives (middleware, logs enrichis, auth centralisée, agrégation).

### 2. API Gateway Node.js / Express

Description :
- introduire un service dédié en Node.js qui centralise les routes publiques ;
- utiliser `http-proxy-middleware` pour router `/api/auth`, `/api/users`, `/api/projects` et `/api/notifications`.

Avantages :
- cohérent avec le stack TypeScript / Node déjà utilisé dans le backend ;
- configuration du routage plus lisible et plus simple à faire évoluer ;
- meilleure testabilité qu'une configuration Nginx seule ;
- permet d'ajouter plus facilement des responsabilités transverses à l'avenir.

Inconvénients :
- ajoute un service applicatif supplémentaire à exécuter et surveiller ;
- moins performant qu'un simple reverse proxy statique ;
- point unique de défaillance si le gateway tombe.

### 3. BFF (Backend For Frontend)

Description :
- créer un backend dédié au client web ;
- agréger et transformer les réponses spécifiquement pour ce client.

Avantages :
- réponses parfaitement adaptées au frontend ;
- possibilité de réduire certains allers-retours réseau ;
- bonne option si plusieurs types de clients apparaissent.

Inconvénients :
- complexité excessive pour un seul client web ;
- risque de duplication de logique avec les services métier ;
- coût de maintenance supérieur à la taille actuelle du projet.

## Choix

Le choix retenu est l'**API Gateway Node.js / Express (option 2)**.

Pourquoi ce choix :
- le projet n'a aujourd'hui qu'un seul client, donc un BFF dédié n'est pas justifié ;
- un simple proxy Nginx était suffisant au début, mais le routage API a évolué vers plusieurs services backend et un flux SSE ;
- un gateway Node.js reste simple tout en étant plus facile à faire évoluer que de la configuration Nginx seule ;
- Nginx est conservé côté client pour servir l'application web, mais il ne porte plus la logique principale de gateway API.

## Conséquences

Positives :
- toutes les routes publiques restent centralisées derrière `/api` ;
- les services internes restent non exposés directement au navigateur ;
- l'ajout d'une nouvelle route backend se fait dans du code versionné avec le reste du projet ;
- le gateway peut accueillir plus tard des responsabilités transverses sans changer l'architecture publique.

Négatives / limites :
- le gateway devient un composant supplémentaire à déployer et maintenir ;
- il faut surveiller sa disponibilité comme les autres services ;
- certaines fonctionnalités avancées d'un vrai API management restent hors périmètre.

Impact sur les évolutions futures :
- si un second client apparaît, un BFF pourra être ajouté derrière ce gateway ou à côté de lui ;
- si les besoins restent très simples, le routage pourra toujours être rebasculé vers Nginx sans remettre en cause les services métier ;
- le choix actuel privilégie l'évolutivité du code sur la performance brute du proxy.
