# Matrice de compatibilité d'API entre services, gateway et clients

**Status:** Accepté

## Contexte

Chaque microservice évolue avec sa propre version SemVer et peut exposer plusieurs versions d'API en parallèle (ex. `/v1` et `/v2` sur `auth-service` lors de l'ajout obligatoire du champ `birthDate`). L'API Gateway et le client front dépendent de versions précises de ces API. Il faut empêcher qu'un déploiement combine des versions de service, de gateway et de client incompatibles entre elles.

## Options

### Option 1 - Pas de vérification formelle, documentation manuelle

S'appuyer sur le changelog et la communication d'équipe pour s'assurer que les versions déployées ensemble sont compatibles.

### Option 2 - Matrice de compatibilité déclarative validée automatiquement

Déclarer dans `deploy/compatibility.yaml` les plages de versions supportées par chaque rôle (`providers` pour les services, `gateways`, `consumers` pour le client) pour chaque contrat d'API (ex. `authApi`), et faire valider cette matrice par `.github/scripts/compatibility.mjs` contre le manifeste de déploiement avant chaque publication ou déploiement.

## Décision

L'option 2 est retenue : `deploy/compatibility.yaml` définit, par plage de version SemVer, les versions d'API supportées par les providers, la gateway et les consumers ; `compatibility.mjs validate` vérifie que les versions du manifeste de déploiement satisfont ce contrat avant publication du manifeste et avant chaque déploiement.

## Conséquences

### Positives (Bénéfices)

- Les breaking changes (comme `birthDate` obligatoire) sont déclarés explicitement et vérifiés automatiquement plutôt que de reposer sur une vigilance manuelle.
- Le pipeline échoue tôt (à la publication du manifeste ou au déploiement) si une combinaison de versions incompatible est tentée, plutôt qu'en production.

### Négatives (Inconvénients)

- La matrice doit être maintenue à jour à chaque évolution d'API ; un oubli de mise à jour bloque silencieusement les déploiements valides ou laisse passer des combinaisons invalides si la plage déclarée est trop large.
- Ajoute un fichier de configuration supplémentaire à comprendre et à faire évoluer en parallèle du code des services.

### Impact futur

Si le nombre de contrats d'API croît significativement, la matrice pourrait être complétée par du Contract Testing automatisé (Pact) pour valider les contrats au niveau du code et non plus seulement au niveau des plages de versions déclarées.
