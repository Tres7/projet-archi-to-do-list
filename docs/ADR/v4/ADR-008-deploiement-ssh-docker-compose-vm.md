# Déploiement par SSH et Docker Compose sur VM

**Status:** Accepté

## Contexte

Il faut déployer les images publiées vers deux environnements cibles (Intégration, Production). Le projet est pédagogique, l'équipe est petite, et l'infrastructure cible disponible est une VM Azure par environnement, sans cluster Kubernetes ni outillage GitOps existant.

## Options

### Option 1 - Orchestrateur dédié (Kubernetes, GitOps Flux/ArgoCD)

Déployer sur un cluster Kubernetes avec un contrôleur GitOps qui synchronise l'état désiré depuis le dépôt.

### Option 2 - SSH + Docker Compose sur VM, piloté par GitHub Actions

Le workflow réutilisable `_deploy-compose.yml` résout le manifeste de déploiement, le valide (schéma, compatibilité), génère un bundle (`compose.yml` rendu avec les images du manifeste, fichiers d'environnement, configuration nginx), le copie par SCP sur la VM cible, puis exécute via SSH (`appleboy/ssh-action`) un script distant qui se connecte à GHCR et lance `docker compose up`.

## Décision

L'option 2 est retenue : le déploiement reste un Docker Compose piloté à distance par SSH depuis GitHub Actions, sans introduire de cluster Kubernetes ni d'outil GitOps.

## Conséquences

### Positives (Bénéfices)

- Complexité d'infrastructure minimale, cohérente avec une VM simple par environnement et une équipe réduite : pas de cluster à administrer.
- Le bundle généré est dérivé directement et uniquement du manifeste validé, ce qui évite toute divergence entre ce qui est déclaré déployable et ce qui est réellement déployé.

### Négatives (Inconvénients)

- Pas de réconciliation continue de l'état désiré (contrairement à un contrôleur GitOps) : si l'état de la VM dérive manuellement entre deux déploiements, rien ne le détecte ni ne le corrige automatiquement.
- Le déploiement dépend de secrets SSH par environnement (`VM_HOST_*`, `VM_USER_*`, `SSH_PRIVATE_KEY_*`) dont la rotation et la sécurité reposent entièrement sur la configuration GitHub.

### Impact futur

Si le nombre de services ou la fréquence de déploiement augmentent significativement, cette approche pourra être remplacée par un orchestrateur dédié sans remettre en cause le manifeste de déploiement, qui resterait la même source de vérité.
