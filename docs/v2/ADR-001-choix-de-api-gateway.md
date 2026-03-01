# ADR-001 Choix entre API Gateway et BFF — API Gateway

**Date :** 2026-02-27
**Statut :** Accepted

## Contexte

Dans une architecture microservices, le client frontend ne peut pas appeler directement chaque service. Il faut un point d'entrée unique qui centralise les appels, gère le routage et protège les services internes.

Exigences clés :
- fournir un point d'entrée unique pour le client frontend ;
- masquer la complexité de l'architecture microservices au client ;
- simplicité de configuration et de maintenance.

## Options

### 1. API Gateway

Description :
- point d'entrée unique et générique pour tous les clients ;
- responsable du routage vers les services appropriés selon la route appelée ;
- implémenté via nginx dans notre cas.

Avantages :
- un seul point d'entrée à maintenir ;
- les services internes ne sont jamais exposés directement ;
- solution légère et performante avec nginx.

Inconvénients :
- configuration générique, non adaptée aux besoins spécifiques d'un client particulier ;
- peut devenir un goulot d'étranglement si la charge est très élevée.

### 2. BFF (Backend For Frontend)

Description :
- un backend dédié par type de client (web, mobile, etc.) ;
- chaque BFF agrège et transforme les données selon les besoins de son client ;
- peut combiner plusieurs appels de services en une seule réponse.

Avantages :
- réponses adaptées précisément aux besoins de chaque client ;
- réduction des allers-retours réseau côté client ;
- flexibilité pour faire évoluer chaque BFF indépendamment.

Inconvénients :
- complexité accrue : un service supplémentaire à développer et maintenir par client ;
- duplication potentielle de logique entre les différents BFFs ;
- surcharge injustifiée pour un projet avec un seul type de client.

## Choix

Le choix retenu est l'**API Gateway (option 1)** implémenté via nginx :
- le projet ne comporte qu'un seul client frontend (React) ce qui fait qu'un BFF n'est pas justifié ;
- nginx est déjà présent dans l'architecture pour servir le frontend ;
- la simplicité de configuration est prioritaire à cette échelle.

## Conséquences

Positives :
- un seul point de configuration pour le routage de toute l'application ;
- les services internes sont totalement protégés de l'accès direct extérieur ;
- évolution facile des routes sans modifier les services.

Négatives / limites :
- point unique de défaillance : si le gateway tombe, toute l'application est inaccessible ;
- la configuration nginx doit être mise à jour à chaque ajout ou modification de service.

Impact sur les évolutions futures :
- si un client mobile est ajouté, un BFF dédié pourra être introduit derrière le gateway sans changer l'architecture existante ;
- des fonctionnalités avancées (rate limiting, cache) pourront être ajoutées au niveau du gateway sans impacter les services.
