# ADR-004 Choix de workflows réutilisables pour les images GHCR — `_build-ghcr-image.yml` et `_retag-ghcr-image.yml`

> Mise à jour: `_retag-ghcr-image.yml` et `release-images.yml` ont été retirés du CI/CD actif. Les releases utilisent `_build-ghcr-image.yml` pour les services versionnés et les manifests pour transporter les digests vers integration puis production.

**Date :** 2026-06-10
**Statut :** Accepted

## Contexte

Le projet publie plusieurs images conteneur lors d'une release :
- `auth-service` ;
- `project-service` ;
- `task-service` ;
- `notification-service` ;
- `gateway` ;
- `client`.

Ces images suivent le même cycle technique : checkout du bon commit, connexion à GHCR, build ou retag, scan de sécurité, puis publication.

Il faut éviter que la même logique soit copiée dans plusieurs jobs, car toute évolution de sécurité ou de build devrait alors être répliquée pour chaque service.

## Options

### 1. Copier-coller les jobs de build dans `release-images.yml`

Description :
- définir un job complet par service directement dans le workflow de release ;
- adapter uniquement le contexte Docker, le Dockerfile et le nom d'image.

Avantages :
- lecture directe du workflow de release ;
- pas d'indirection vers un autre fichier ;
- mise en place initiale simple.

Inconvénients :
- forte duplication entre les services ;
- risque de divergence entre les images ;
- modification plus coûteuse si une étape commune change, par exemple Trivy, Buildx ou le cache.

### 2. Utiliser une action composite

Description :
- extraire les étapes communes dans une action composite locale ;
- appeler cette action depuis plusieurs jobs.

Avantages :
- réduit une partie de la duplication ;
- garde une interface commune ;
- utile pour factoriser des suites de steps simples.

Inconvénients :
- moins adaptée à la gestion complète des permissions, outputs et stratégies de matrix ;
- ne représente pas aussi clairement un job CI complet ;
- ajoute une abstraction différente des workflows GitHub Actions déjà utilisés.

### 3. Utiliser des workflows réutilisables

Description :
- créer un workflow `_build-ghcr-image.yml` pour construire, scanner et pousser une image ;
- créer un workflow `_retag-ghcr-image.yml` pour copier une image existante vers les tags de release ;
- appeler ces workflows depuis `release-images.yml` avec une matrix.

Avantages :
- un seul endroit à modifier pour le build et un seul pour le retag ;
- fonctionnement cohérent pour les six services ;
- permissions et outputs définis au niveau du workflow appelé ;
- bonne intégration avec les matrices de GitHub Actions.

Inconvénients :
- ajoute une indirection entre le workflow principal et l'exécution réelle ;
- demande de maintenir l'interface `workflow_call` ;
- les erreurs peuvent nécessiter d'ouvrir plusieurs fichiers pour suivre le flux complet.

## Choix

Le choix retenu est l'utilisation de **workflows réutilisables pour le build et le retag des images GHCR (option 3)**.

Pourquoi ce choix :
- les six services partagent une logique de build et de publication très proche ;
- la duplication rendrait les évolutions CI plus risquées ;
- les workflows réutilisables permettent de garder `release-images.yml` centré sur l'orchestration ;
- les détails techniques du build et du retag restent isolés dans des fichiers dédiés.

## Conséquences

Positives :
- les modifications communes se font dans `_build-ghcr-image.yml` ou `_retag-ghcr-image.yml` ;
- les services restent publiés de manière homogène ;
- la release peut construire ou retagger plusieurs images via une matrix sans répéter les steps ;
- les règles de sécurité appliquées au build sont plus faciles à maintenir.

Négatives / limites :
- le workflow de release est moins autoportant ;
- l'interface des workflows appelés doit rester stable ;
- une mauvaise modification du workflow réutilisable impacte tous les services.

Impact sur les évolutions futures :
- un nouveau service pourra être ajouté à la matrix sans recopier toute la logique CI ;
- une évolution du scan, du cache ou du registry pourra être appliquée en un seul endroit ;
- si les besoins de certains services divergent fortement, un workflow spécialisé pourra être introduit.
