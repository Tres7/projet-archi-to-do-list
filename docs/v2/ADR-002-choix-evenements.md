# ADR-002 Choix des événements métier

**Date :** 2026-02-27
**Statut :** Accepted

## Contexte

Dans une architecture microservices orientée événements, les services communiquent de manière asynchrone. Il faut donc définir quels événements métier seront émis et consommés entre les services.

Exigences clés :
- couvrir les changements d'état significatifs du domaine métier ;
- permettre aux services abonnés de réagir sans couplage direct avec l'émetteur ;
- garder un ensemble d'événements minimal et cohérent avec les use cases identifiés.

## Options

### 1. Communication synchrone uniquement

Description :
- les services s'appellent directement via HTTP pour toute interaction ;
- pas d'événements asynchrones.

Avantages :
- simplicité de mise en œuvre ;
- réponse immédiate et prévisible.

Inconvénients :
- fort couplage entre les services ;
- l'indisponibilité d'un service bloque les autres ;
- scalabilité limitée.

### 2. Communication asynchrone par événements

Description :
- les services publient des événements lors de changements d'état métier significatifs ;
- les services abonnés réagissent aux événements qui les concernent ;
- chaque service reste indépendant et découplé.

Avantages :
- découplage fort entre les services ;
- un service peut être indisponible sans bloquer les autres ;
- extensibilité : ajouter un abonné sans modifier l'émetteur.

Inconvénients :
- complexité accrue (gestion des événements, ordre, idempotence) ;
- cohérence éventuelle : les services ne sont pas synchronisés en temps réel.

## Choix

Le choix retenu est la **communication asynchrone par événements (option 2)**.

Les événements définis sont :

| Événement | Émetteur | Consommateurs | Déclencheur |
|---|---|---|---|
| `TaskCreated` | `task` | `project` | Une tâche est créée |
| `TaskDeleted` | `task` | `project` | Une tâche est supprimée |
| `TaskCompleted` | `task` | `project`, `notification` | Une tâche est marquée terminée |
| `TaskReopened` | `task` | `project`, `notification` | Une tâche terminée est réouverte |
| `ProjectCreated` | `project` | `notification` | Un projet est créé |
| `ProjectClosed` | `project` | `notification` | Toutes les tâches d'un projet sont terminées |

## Conséquences

Positives :
- `notification` peut réagir à n'importe quel événement sans modifier les autres services ;
- `project` suit l'état des tâches sans appel direct à `task` ;
- les événements constituent une trace naturelle de l'activité métier.

Négatives / limites :
- les services doivent gérer l'idempotence (un même événement reçu deux fois ne doit pas produire d'effet de bord) ;
- l'ordre des événements n'est pas garanti — à prendre en compte dans les cas limites.

Impact sur les évolutions futures :
- de nouveaux événements peuvent être ajoutés sans modifier les services existants ;
- un service d'audit ou de reporting pourra s'abonner aux événements existants sans aucune modification.
