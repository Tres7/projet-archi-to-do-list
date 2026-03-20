# ADR-004 Choix du langage pour les services — TypeScript / Node

**Date :** 2026-03-19
**Statut :** Accepted

## Contexte

Le backend est désormais composé de plusieurs services (`gateway`, `auth-service`, `project-service`, `task-service`, `notification-service`) qui partagent :
- des contrats TypeScript ;
- un outillage commun de build, tests et lint ;
- le même modèle d'architecture en couches (`domain`, `application`, `infrastructure`).

Il faut décider si tous les services restent sur le même langage et runtime ou si une approche polyglotte est préférable.

## Options

### 1. TypeScript / Node pour tous les services

Description :
- conserver TypeScript / Node sur l'ensemble des services ;
- mutualiser l'outillage, les conventions et les contrats de types.

Avantages :
- forte cohérence technique ;
- partage naturel des types et contrats dans `server/common` ;
- outillage unifié pour le build, les tests et le développement local ;
- onboarding plus simple sur n'importe quel service.

Inconvénients :
- les services partagent les mêmes contraintes du runtime Node ;
- certains gains spécifiques à d'autres langages ne sont pas exploités.

### 2. Approche polyglotte par service

Description :
- choisir le langage le plus adapté pour chaque service ;
- par exemple garder Node pour le gateway et utiliser un autre runtime pour d'autres services.

Avantages :
- flexibilité maximale ;
- possibilité d'optimiser ponctuellement les performances ou l'empreinte mémoire ;
- architecture microservices compatible avec cette liberté.

Inconvénients :
- coût de maintenance plus élevé ;
- multiplication des environnements, pipelines, conventions et compétences ;
- partage des contrats plus complexe ;
- surcoût non justifié pour un projet de cette taille.

## Choix

Le choix retenu est **TypeScript / Node pour tous les services (option 1)**.

Pourquoi ce choix :
- l'équipe maîtrise déjà ce stack et l'utilise sur le frontend comme sur le backend ;
- les services partagent des contrats et des conventions de code qui bénéficient d'un langage commun ;
- la cohérence de l'outillage accélère les itérations sur un projet encore en évolution rapide ;
- les besoins actuels ne justifient pas d'optimisation par langage spécialisé.

## Conséquences

Positives :
- tous les services restent homogènes en structure, build et pratiques de tests ;
- la réutilisation des contrats et types est simple ;
- les scripts de développement et d'intégration restent unifiés ;
- la maintenance quotidienne est plus prévisible.

Négatives / limites :
- l'architecture reste dépendante des caractéristiques de Node.js ;
- un besoin futur très spécifique pourrait rendre cette décision moins optimale pour un service particulier.

Impact sur les évolutions futures :
- un service pourra malgré tout être migré plus tard si une contrainte forte l'exige ;
- tant que le projet reste dans son périmètre actuel, le bénéfice de l'homogénéité dépasse largement celui d'une approche polyglotte ;
- la décision favorise la productivité et la lisibilité globale du système.
