# ADR-004 Choix du langage pour les services — TypeScript / Node

**Date :** 2026-02-27
**Statut :** Accepted

## Contexte

Le passage à une architecture microservices implique de définir le langage et le runtime utilisés pour implémenter chaque service. L'un des avantages des microservices est de pouvoir choisir un langage différent par service. Il faut néanmoins décider si cette flexibilité est pertinente dans le cadre de ce projet.

## Options

### 1. TypeScript / Node (continuité)

Description :
- tous les services sont implémentés en TypeScript / Node ;
- même outillage que l'existant ;
- même structure de projet et conventions pour tous les services.

Avantages :
- cohérence totale avec le backend existant ;
- aucune courbe d'apprentissage supplémentaire pour l'équipe ;
- partage facile des conventions, types et outils entre les services ;
- un seul écosystème à maintenir.

Inconvénients :
- pas de bénéfice des spécificités d'autres langages (ex: performances Go, typage fort Java) ;


### 2. Langages différents par service

Description :
- chaque service peut utiliser le langage le plus adapté à son besoin ;
- tire parti des avantages propres à chaque langage et runtime.

Avantages :
- flexibilité technique maximale ;
- possibilité d'optimiser les performances service par service.

Inconvénients :
- complexité accrue : multiple environnements, outils et conventions à gérer ;
- courbe d'apprentissage élevée pour l'équipe ;
- surcharge injustifiée pour l'échelle et la durée du projet.

## Choix

Le choix retenu est **TypeScript sur Node (option 1)** pour tous les services :
- l'équipe maîtrise déjà ce stack depuis le début du projet ;
- la cohérence entre les services facilite la collaboration et la maintenance ;
- les besoins fonctionnels du projet ne justifient pas l'introduction d'un autre langage.

## Conséquences

Positives :
- structure identique pour tous les services (domain → application → infrastructure) ;
- outillage partagé : Jest, Express, TypeScript, ESLint, etc. ;
- onboarding simplifié sur n'importe quel service.

Négatives / limites :
- tous les services partagent les mêmes contraintes du runtime Node (ex: gestion de la concurrence) ;
- une évolution vers un autre langage pour un service spécifique sera plus difficile à justifier après cette décision.

Impact sur les évolutions futures :
- si un service nécessite des performances critiques, un langage et un runtime plus adaptés pourront être introduits ponctuellement sans remettre en cause l'ensemble de l'architecture ;
- la séparation claire entre les services facilite ce type de migration ciblée.
