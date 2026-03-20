# ADR-005 Choix de la stratégie de persistance — multi-driver `memory` / `sqlite` / `mysql`

**Date :** 2026-03-19
**Statut :** Accepted

## Contexte

Le projet doit couvrir plusieurs usages :

- des tests rapides et isolés ;
- du développement local léger ;
- une exécution Docker proche d'un environnement plus réaliste ;
- des services qui partagent des contrats de repository mais pas forcément le même contexte d'exécution.

Il faut choisir une stratégie de persistance compatible avec ces contraintes.

## Options

### 1. MySQL unique pour tous les contextes

Description :

- utiliser MySQL comme seule implémentation de persistance ;
- faire tourner les tests et le développement local sur cette même base.

Avantages :

- un seul comportement de persistance à maintenir ;
- écarts réduits entre développement et exécution Docker ;
- bonne cohérence de schéma.

Inconvénients :

- coût plus élevé pour lancer les tests ;
- dépendance forte à une base externe, même pour des scénarios simples ;
- boucle de développement plus lourde.

### 2. SQLite local, MySQL ailleurs

Description :

- utiliser SQLite en local et MySQL dans l'environnement Docker ;
- éviter un driver purement mémoire.

Avantages :

- développement local plus simple ;
- moins d'implémentations qu'une stratégie à trois drivers ;
- persistance locale sans dépendre immédiatement d'un conteneur MySQL.

Inconvénients :

- les tests restent moins rapides qu'avec une implémentation mémoire ;
- les différences SQLite / MySQL doivent quand même être maîtrisées ;
- les scénarios unitaires et certains tests d'intégration restent plus coûteux.

### 3. Multi-driver `memory` / `sqlite` / `mysql`

Description :

- exposer un contrat de persistance unique ;
- choisir le driver via l'environnement selon le contexte d'exécution.

Avantages :

- tests rapides avec `memory` ;
- développement local possible avec `sqlite` sans dépendance MySQL ;
- mode Docker et mode principal réaliste avec `mysql` ;
- séparation claire entre le métier et la technologie de stockage.

Inconvénients :

- plusieurs implémentations de repository à maintenir ;
- besoin de tests de contrat plus rigoureux ;
- risque d'écarts subtils entre drivers.

## Choix

Le choix retenu est la **stratégie multi-driver `memory` / `sqlite` / `mysql` (option 3)**.

Pourquoi ce choix :

- le projet combine à la fois besoin de rapidité en test, souplesse en local et exécution réaliste en Docker ;
- les services utilisent déjà des factories de persistance qui rendent ce choix naturel ;
- le coût de maintenance supplémentaire est acceptable au regard du confort de développement et de test apporté.

## Conséquences

Positives :

- la persistance est découplée du métier via des interfaces de repository ;
- l'environnement choisit le bon compromis entre vitesse et réalisme ;
- les tests peuvent rester rapides sans base externe ;
- les services gardent la même structure quel que soit le driver sélectionné.

Négatives / limites :

- il faut maintenir et tester plusieurs implémentations ;
- des divergences de comportement peuvent apparaître entre drivers si la couverture de test est insuffisante ;
- la complexité de la couche infrastructure est plus élevée.

Impact sur les évolutions futures :

- un nouveau driver pourrait être ajouté sans toucher au domaine ni à l'application ;
- si un driver devient inutile, il pourra être retiré sans modifier les use cases ;
- cette stratégie favorise la testabilité au prix d'une discipline supplémentaire sur la validation croisée des implémentations.
