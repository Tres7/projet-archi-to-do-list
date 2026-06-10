# ADR-013 Choix du registre d'images conteneur — GHCR plutôt que Docker Hub

**Date :** 2026-06-10
**Statut :** Accepted

## Contexte

Le projet construit et publie plusieurs images Docker depuis GitHub Actions.

Ces images sont liées au repository GitHub, aux releases GitHub et aux workflows CI qui les produisent. Le déploiement de production référence les images via `ghcr.io/<owner>/<repository>/<service>`.

Il faut choisir un registre d'images cohérent avec ce cycle de développement et limiter la gestion de credentials externes.

## Options

### 1. Docker Hub

Description :
- publier les images du projet dans un repository Docker Hub ;
- configurer GitHub Actions avec des credentials Docker Hub.

Avantages :
- registre très répandu ;
- bonne compatibilité avec les outils Docker ;
- familiarité élevée pour les utilisateurs.

Inconvénients :
- credentials séparés à gérer ;
- dépendance à un compte et à une organisation hors GitHub ;
- exposition aux limites et politiques propres à Docker Hub ;
- lien moins direct avec les releases du repository.

### 2. Registre auto-hébergé

Description :
- déployer et maintenir un registry Docker contrôlé par l'équipe ;
- pousser les images de release vers ce registry.

Avantages :
- contrôle complet de l'infrastructure ;
- règles de rétention et d'accès personnalisables ;
- indépendance vis-à-vis des registres publics.

Inconvénients :
- coût d'exploitation important ;
- supervision, sauvegarde et sécurité à maintenir ;
- complexité disproportionnée pour la taille actuelle du projet.

### 3. GitHub Container Registry

Description :
- publier les images dans GHCR sous le même périmètre que le repository ;
- utiliser les permissions GitHub Actions `packages: write` et le token GitHub.

Avantages :
- intégration native avec GitHub Actions ;
- pas de credentials Docker Hub séparés ;
- cohérent avec les releases et le repository ;
- permissions centralisées dans GitHub.

Inconvénients :
- dépendance plus forte à l'écosystème GitHub ;
- gestion des permissions packages à comprendre et maintenir ;
- visibilité publique ou privée à configurer correctement.

## Choix

Le choix retenu est d'utiliser **GHCR comme registre d'images conteneur du projet (option 3)**.

Pourquoi ce choix :
- les images sont produites par GitHub Actions à partir du repository GitHub ;
- GHCR évite de gérer des secrets Docker Hub supplémentaires ;
- le registre est cohérent avec les tags et releases GitHub ;
- la configuration de déploiement peut référencer directement `ghcr.io/${repository}`.

## Conséquences

Positives :
- la publication d'images est intégrée à la CI existante ;
- les credentials restent limités au périmètre GitHub ;
- les images, releases et workflows sont regroupés dans le même écosystème ;
- le chemin des images est stable et prévisible pour Compose.

Négatives / limites :
- une indisponibilité GitHub affecte à la fois le code, la CI et le registry ;
- les permissions GHCR doivent être correctement configurées pour les environnements de déploiement ;
- une migration future vers un autre registry demandera de modifier la CI et les manifests de déploiement.

Impact sur les évolutions futures :
- si le projet doit publier vers plusieurs environnements, des règles de packages GHCR pourront être ajoutées ;
- si une distribution hors GitHub devient nécessaire, un miroir vers Docker Hub ou un registry privé pourra être envisagé ;
- les workflows de build resteront centrés sur GHCR tant que GitHub reste la plateforme principale du projet.
