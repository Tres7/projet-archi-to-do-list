# ADR-006 Choix du modèle de traitement des opérations sur les tâches — commandes asynchrones et lecture composée

**Date :** 2026-03-19
**Statut :** Accepted

## Contexte

Les opérations publiques sur les tâches doivent respecter plusieurs contraintes :
- vérifier que l'utilisateur agit bien sur son projet ;
- vérifier que le projet est encore ouvert ;
- laisser `task-service` propriétaire du stockage et des transitions d'état des tâches ;
- maintenir `openTaskCount` dans `project-service` ;
- notifier l'interface utilisateur sans couplage fort entre services ;
- reconstruire les détails d'un projet avec sa liste de tâches.

Il faut donc choisir un modèle de traitement cohérent pour les écritures et pour la lecture agrégée.

## Options

### 1. Exposer directement les endpoints de tâche dans `task-service`

Description :
- le frontend appelle `task-service` pour créer, modifier ou supprimer une tâche ;
- `task-service` appelle ensuite `project-service` si nécessaire pour vérifier le contexte projet.

Avantages :
- la responsabilité HTTP suit la responsabilité de stockage ;
- modèle intuitif au premier abord ;
- réponse synchrone immédiate.

Inconvénients :
- validation du projet déplacée ou dupliquée hors de `project-service` ;
- couplage HTTP direct entre services ;
- logique de propriété et d'ouverture du projet moins bien centralisée.

### 2. Orchestration synchrone depuis `project-service`

Description :
- le frontend appelle `project-service` ;
- `project-service` valide le projet puis appelle `task-service` en HTTP synchrone.

Avantages :
- garde la validation de projet au bon endroit ;
- résultat immédiat côté HTTP ;
- flux plus simple à suivre qu'un asynchrone complet.

Inconvénients :
- couplage fort entre `project-service` et `task-service` ;
- dépendance directe à la disponibilité du service appelé ;
- notifications et mise à jour du compteur restent des responsabilités supplémentaires à orchestrer.

### 3. Commandes asynchrones + lecture composée

Description :
- le frontend appelle `project-service` pour les opérations publiques sur les tâches ;
- `project-service` valide le projet puis publie une commande asynchrone ;
- `task-service` exécute la commande, publie le fait métier correspondant et `project-service` met à jour son agrégat ;
- pour les détails d'un projet, `project-service` compose la réponse via un request/reply vers `task-service`.

Avantages :
- responsabilités mieux séparées ;
- validation métier du projet centralisée dans `project-service` ;
- stockage et transitions d'état des tâches centralisés dans `task-service` ;
- notifications et rafraîchissement UI s'intègrent naturellement dans le flux événementiel ;
- lecture composée possible sans exposer directement `task-service` au frontend.

Inconvénients :
- cohérence éventuelle entre l'acceptation HTTP et l'état final ;
- gestion plus riche des événements, rejets et corrélations ;
- besoin de relire l'état côté client après certains événements.

## Choix

Le choix retenu est le **modèle de commandes asynchrones avec lecture composée (option 3)**.

Pourquoi ce choix :
- il conserve les règles de propriété et d'ouverture du projet dans `project-service` ;
- il laisse `task-service` maître de la persistance et des transitions des tâches ;
- il permet à `project-service` de maintenir son compteur `openTaskCount` à partir des faits métier ;
- il s'intègre naturellement avec le système de notifications déjà basé sur les événements.

Concrètement :
- les écritures sur les tâches renvoient une réponse d'acceptation et non le résultat final complet ;
- les échecs métier côté `task-service` remontent sous forme d'événements de rejet ;
- la lecture `GET /projects/:id/details` utilise un request/reply pour récupérer les tâches avant de composer `ProjectDetailsDto`.

## Conséquences

Positives :
- chaque service garde une responsabilité métier claire ;
- le frontend passe toujours par un point d'entrée cohérent pour les opérations liées au projet ;
- l'état projet peut être enrichi à partir des faits métier publiés ;
- la lecture des détails d'un projet reste découplée du stockage des tâches.

Négatives / limites :
- l'interface HTTP n'offre pas toujours un résultat final immédiat ;
- il faut gérer la cohérence éventuelle et les rafraîchissements côté client ;
- les scénarios de test doivent couvrir plusieurs services et plusieurs temps du flux.

Impact sur les évolutions futures :
- ce modèle facilite l'ajout d'autres abonnés aux événements de tâche ;
- il sera possible de faire évoluer le read model sans exposer directement `task-service` ;
- si le besoin d'immédiateté devenait prioritaire sur certains cas, des chemins synchrones ciblés pourraient être ajoutés sans remettre en cause le principe général.
