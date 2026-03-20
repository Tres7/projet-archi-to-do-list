# ADR-002 Choix des événements métier et d'intégration — catalogue mixte

**Date :** 2026-03-19
**Statut :** Accepted

## Contexte

L'architecture actuelle repose sur plusieurs flux inter-services :
- des changements d'état métier significatifs (`project.created`, `task.closed`, etc.) ;
- des demandes de traitement asynchrones (`task.creation.requested`, `task.deletion.requested`) ;
- des rejets explicites quand une commande ne peut pas aboutir ;
- une requête inter-service pour composer les détails d'un projet avec sa liste de tâches.

Il faut donc définir un catalogue d'événements cohérent, explicite et stable.

## Options

### 1. Événements CRUD génériques

Description :
- réduire le catalogue à des événements techniques du type `created`, `updated`, `deleted` ;
- laisser l'interprétation métier aux consommateurs.

Avantages :
- catalogue réduit ;
- mise en place rapide ;
- faible coût initial de documentation.

Inconvénients :
- événements trop vagues pour refléter l'intention métier ;
- peu adaptés aux rejets explicites et aux commandes asynchrones ;
- risque de couplage implicite dans les consommateurs.

### 2. Événements strictement métier minimaux

Description :
- ne publier que les faits métier principaux comme `project.created`, `project.closed`, `task.created`, `task.closed`, `task.reopened`, `task.deleted`.

Avantages :
- très bonne lisibilité métier ;
- faible bruit dans le catalogue ;
- bonne base pour des abonnés orientés domaine.

Inconvénients :
- insuffisant pour modéliser le cycle complet des commandes asynchrones ;
- ne couvre pas les cas de rejet ;
- ne couvre pas les besoins de request/reply pour les lectures composées.

### 3. Catalogue mixte d'événements métier et d'intégration

Description :
- combiner des événements métier, des commandes asynchrones, des événements de rejet et des messages de request/reply ;
- utiliser un nommage explicite en minuscules séparées par des points.

Avantages :
- couvre le fonctionnement réel du projet ;
- explicite les flux de commande, de succès, d'échec et de lecture composée ;
- permet d'ajouter des consommateurs sans modifier les services producteurs.

Inconvénients :
- catalogue plus large à maintenir ;
- discipline de nommage et de versionning nécessaire ;
- plus de contrats de payload à garder synchronisés.

## Choix

Le choix retenu est le **catalogue mixte d'événements métier et d'intégration (option 3)**.

Pourquoi ce choix :
- le projet ne se limite pas à des faits métier finaux : il transporte aussi des commandes et des réponses ;
- `project-service` et `task-service` orchestrent des opérations asynchrones qui doivent rendre visibles les cas de rejet ;
- `project-service` doit également récupérer la liste des tâches via un mécanisme request/reply pour construire `ProjectDetailsDto`.

Les événements retenus sont :

| Événement | Émetteur | Consommateurs | Déclencheur |
|---|---|---|---|
| `project.created` | `project-service` | `notification-service` | Un projet est créé |
| `project.closed` | `project-service` | `notification-service` | Un projet est fermé |
| `project.deleted` | `project-service` | `notification-service` | Un projet est supprimé |
| `task.creation.requested` | `project-service` | `task-service` | Une demande de création de tâche est envoyée |
| `task.created` | `task-service` | `project-service`, puis `notification-service` | Une tâche est créée |
| `task.creation.rejected` | `task-service` | `notification-service` | Une création de tâche échoue |
| `task.status-toggle.requested` | `project-service` | `task-service` | Une demande de changement de statut est envoyée |
| `task.closed` | `task-service` | `project-service`, puis `notification-service` | Une tâche passe à `DONE` |
| `task.reopened` | `task-service` | `project-service`, puis `notification-service` | Une tâche repasse à `OPEN` |
| `task.status-toggle.rejected` | `task-service` | `notification-service` | Un changement de statut échoue |
| `task.deletion.requested` | `project-service` | `task-service` | Une demande de suppression de tâche est envoyée |
| `task.deleted` | `task-service` | `project-service`, puis `notification-service` | Une tâche est supprimée |
| `task.deletion.rejected` | `task-service` | `notification-service` | Une suppression de tâche échoue |
| `task.list.requested` | `project-service` | `task-service` | Les détails d'un projet doivent être composés |
| `task.list.replied` | `task-service` | `project-service` | Réponse à la demande de liste des tâches |

## Conséquences

Positives :
- le catalogue décrit précisément les flux réellement utilisés par le projet ;
- les échecs des opérations asynchrones sont modélisés explicitement ;
- la construction des vues composées entre services reste découplée ;
- les payloads peuvent être typés et partagés dans `server/common/contracts/events`.

Négatives / limites :
- le nombre d'événements est plus élevé qu'avec un catalogue strictement métier ;
- les équipes doivent maintenir une convention de nommage cohérente ;
- les consommateurs doivent être conçus pour supporter la duplication et l'ordre non garanti.

Impact sur les évolutions futures :
- un nouveau service d'audit, de reporting ou de monitoring pourra s'abonner aux événements existants ;
- de nouveaux événements pourront être ajoutés sans casser les contrats déjà publiés si la convention de version est respectée ;
- ce choix prépare le terrain pour des flux plus riches sans imposer un couplage HTTP direct.
