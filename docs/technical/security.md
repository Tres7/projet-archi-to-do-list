# Sécurité

## 1. Vue d'ensemble

La sécurité actuelle est adaptée à un projet pédagogique et à un environnement de développement. Le système dispose déjà d'une authentification JWT, du hachage bcrypt des mots de passe et d'une séparation en services, mais plusieurs points doivent être renforcés avant une exposition plus large.

Les risques les plus importants sont:

- le JWT stocké dans `localStorage`;
- le flux SSE identifié par `userId` en query string;
- des secrets de développement versionnés dans les fichiers `.env`;
- la dépendance à une configuration runtime correcte des secrets et des ports exposés;
- une gestion d'erreurs HTTP encore non uniforme.

## 2. Authentification JWT

### Émission du token

Le login est traité par `auth-service`:

1. recherche de l'utilisateur par `username`;
2. comparaison du mot de passe avec `bcrypt.compare`;
3. signature d'un JWT avec `JWT_SECRET`;
4. expiration configurée par `JWT_EXPIRES_IN`.

Payload signé:

```json
{
  "userId": "user-id",
  "email": "user@example.com",
  "username": "anton"
}
```

### Utilisation du token

Les routes protégées attendent:

```http
Authorization: Bearer <jwt>
```

Le middleware commun `server/common/middleware/authMiddleware.ts`:

- extrait le bearer token;
- vérifie la signature avec `JWT_SECRET`;
- injecte `req.currentUser = { userId, email, username }`;
- renvoie `401` si le token est absent ou invalide.

### Où le middleware est appliqué

| Service           | Routes protégées |
| ----------------- | ---------------- |
| `auth-service`    | `/users/*`       |
| `project-service` | `/projects/*`    |

Le `gateway` ne valide pas le JWT dans l'état actuel. Il proxifie seulement les requêtes vers les services internes.

## 3. Mots de passe

Les mots de passe ne sont pas stockés en clair.

Comportement:

- inscription: `bcrypt.hash(password, 10)`;
- changement de mot de passe: nouveau hash bcrypt;
- login: `bcrypt.compare(password, user.passwordHash)`;
- les réponses utilisateur ne retournent pas `passwordHash`.

Limites:

- aucune politique de complexité de mot de passe n'est appliquée;
- pas de mécanisme de reset de mot de passe;
- pas d'audit des tentatives échouées;
- le rate limiting actuel protège seulement `login` et `register` en production.

### Rate limiting auth

Les routes `POST /auth/login` et `POST /auth/register`, ainsi que leurs versions `/v1` et `/v2`, passent par `express-rate-limit`.

Configuration:

| Variable                    |   Défaut | Usage                                  |
| --------------------------- | -------: | -------------------------------------- |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `900000` | fenêtre de calcul, 15 minutes          |
| `AUTH_RATE_LIMIT_MAX`       |     `10` | nombre maximum de requêtes par fenêtre |

Le limiter est désactivé hors production (`NODE_ENV !== 'production'`) pour ne pas gêner les tests et le développement local.

## 4. Frontières de confiance

| Frontière                                | Hypothèse actuelle                     | Risque                                 |
| ---------------------------------------- | -------------------------------------- | -------------------------------------- |
| Navigateur -> `gateway`                  | trafic local ou environnement contrôlé | pas de TLS géré par l'application      |
| `gateway` -> services                    | réseau interne de confiance            | le gateway ne fait pas d'autorisation  |
| services -> MySQL/Redis/SMTP             | infra locale ou Docker network         | dépendances exposées par ports locaux  |
| frontend -> SSE                          | `userId` fourni par le client          | usurpation possible si un id est connu |
| GitHub Actions -> dépendances npm/Docker | environnement CI éphémère              | supply chain à surveiller              |
| GitHub Actions -> VM de déploiement      | SSH + secrets GitHub                   | accès à protéger par environnements    |

## 5. Stockage côté navigateur

Le frontend utilise `localStorage` pour:

- `auth_token`;
- `username_cache`;
- `notifications_<userId>`;
- `notifications_unread_<userId>`.

Avantage:

- simple à implémenter;
- persiste après rechargement de page;
- pratique pour un projet de développement.

Risque:

- en cas de XSS, le token peut être lu par du JavaScript malveillant;
- les notifications peuvent être modifiées côté client;
- le compteur non lu n'a pas de valeur de sécurité.

Recommandation:

- migrer vers des cookies `HttpOnly`, `Secure`, `SameSite`;
- ou utiliser un modèle access token court + refresh token protégé;
- ajouter une Content Security Policy stricte;
- auditer les composants UI qui affichent des données utilisateur.

## 6. Sécurité du flux SSE

### État actuel

Le frontend ouvre:

```http
GET /api/v1/notifications/events?userId=<user-id>
```

Le service vérifie seulement que `userId` est présent. Il ne valide pas le JWT dans `notification-service`.

### Risque

Un utilisateur qui connaît ou devine un `userId` pourrait tenter de s'abonner au flux d'un autre utilisateur.

### Corrections recommandées

Options possibles:

- vérifier un JWT côté `notification-service`;
- faire passer l'identité via un token court dédié au SSE;
- créer un endpoint HTTP authentifié qui délivre un token SSE à usage limité;
- supprimer la confiance dans `userId` fourni par la query string;
- journaliser les ouvertures/fermetures de connexions SSE.

## 7. Secrets et configuration

Le dépôt contient des fichiers `.env`, `.env.docker`, `.env.test` avec des valeurs de développement. Ils permettent de lancer le projet rapidement, mais ne doivent pas être réutilisés dans un environnement partagé.

Secrets et valeurs sensibles:

| Variable              | Risque si réutilisée         |
| --------------------- | ---------------------------- |
| `JWT_SECRET`          | falsification de tokens      |
| `MYSQL_ROOT_PASSWORD` | accès base de données        |
| `MYSQL_PASSWORD`      | accès conteneur MySQL        |
| `SMTP_*`              | envoi d'e-mails non contrôlé |

Recommandations:

- générer des secrets par environnement;
- ne pas exposer Redis/MySQL/SMTP hors des besoins locaux;
- remplacer les valeurs de démonstration avant toute mise en ligne;
- utiliser des secrets Docker/GitHub/plateforme plutôt que des fichiers versionnés pour la production;
- privilégier `MYSQL_PASSWORD` avec un utilisateur applicatif à privilèges limités;
- garder `MYSQL_ROOT_PASSWORD` seulement comme fallback historique ou secret d'administration.

## 8. Surface réseau

Ports exposés par défaut:

|   Port | Composant            | Exposition                           |
| -----: | -------------------- | ------------------------------------ |
|   `80` | client Nginx         | public local                         |
| `3000` | gateway              | public local                         |
| `3001` | auth-service         | exposé en local si lancé hors Docker |
| `3002` | project-service      | exposé en local si lancé hors Docker |
| `3003` | task-service         | exposé en local si lancé hors Docker |
| `3004` | notification-service | exposé en local si lancé hors Docker |
| `3306` | MySQL                | exposé par Compose local             |
| `6379` | Redis                | exposé par Compose local             |
| `1025` | SMTP Mailpit         | local                                |
| `8025` | Mailpit Web UI       | local                                |

Pour un environnement plus strict, limiter l'exposition directe aux seuls ports `80` et/ou `3000`, et garder MySQL/Redis/SMTP sur un réseau interne.

## 9. Autorisation métier

Les contrôles métier principaux sont:

- un projet appartient à un `ownerId`;
- `project-service` vérifie que `req.currentUser.userId` est propriétaire du projet;
- les commandes de tâche sont refusées sur un projet fermé;
- `task-service` revérifie `userId` et `projectId` sur toggle/delete.

Limites:

- certaines erreurs d'autorisation sont encapsulées en `500` dans certains chemins;
- la suppression de compte ne décrit pas encore le traitement des projets/tâches associés;
- la suppression de projet ne documente pas de cascade vers `task-service`.

## 10. E-mails

`notification-service` utilise Nodemailer.

Mesures existantes:

- `NOTIFY_DRY_RUN=1` désactive l'envoi réel et journalise l'e-mail;
- Mailpit est utilisé en développement/test;
- `NOTIFY_FALLBACK_TO` évite un destinataire vide.

Risques:

- en environnement partagé, `NOTIFY_DRY_RUN=0` peut envoyer des e-mails accidentels;
- pas de validation forte des destinataires;
- pas de journal d'audit persistant.

## 11. CI et contrôles automatiques

Le dépôt contient plusieurs workflows GitHub Actions liés à la qualité, la sécurité et la livraison:

| Workflow                 | Rôle                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `pr_main.yml`            | orchestration des validations Pull Request, dont backend, frontend, Docker, manifests, CodeQL et Gitleaks        |
| `pre_push_main.yml`      | après merge dans `main`, vérification des images candidates, push GHCR puis mise à jour integration par manifest |
| `deploy-integration.yml` | déploiement integration par manifest et Docker Compose sur VM                                                    |
| `release.yml`            | déploiement production manuel ou après succès integration                                                        |
| `nightly.yml`            | CodeQL planifié, audit npm et scan Trivy des digests production                                                  |

Le détail opérationnel est dans [CI/CD](ci-cd.md). Ces contrôles aident, mais ils ne remplacent pas les corrections applicatives sur JWT, SSE, secrets et erreurs HTTP.

## 12. Priorités de durcissement

Ordre recommandé:

1. sécuriser le SSE par JWT ou token court;
2. remplacer les secrets de développement dans tout environnement partagé;
3. migrer le stockage d'authentification vers une stratégie moins exposée que `localStorage`;
4. compléter le rate limiting par journalisation et throttling progressif sur `login` et `register`;
5. uniformiser le mapping d'erreurs HTTP;
6. isoler MySQL/Redis/SMTP dans un réseau interne non public;
7. introduire une persistance serveur des notifications;
8. formaliser une politique de mots de passe.
