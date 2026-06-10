# ADR-008 Choix de la séparation des workflows de tests PR — unit, intégration et e2e

**Date :** 2026-06-10
**Statut :** Accepted

## Contexte

Le projet exécute plusieurs familles de tests avec des coûts et objectifs différents :
- tests unitaires backend ;
- tests d'intégration backend ;
- tests e2e backend ;
- tests e2e frontend Playwright.

Ces tests sont exécutés sur les pull requests vers `main` via des workflows spécialisés, notamment `pr-unit-tests.yml`, `pr-backend-integration.yml` et `pr-frontend-e2e.yml`.

Il faut rendre le feedback lisible pour les développeurs tout en évitant qu'une famille de tests masque inutilement les résultats des autres.

## Options

### 1. Un seul workflow avec un seul job global

Description :
- installer toutes les dépendances ;
- exécuter unit, intégration et e2e dans un même job séquentiel.

Avantages :
- configuration courte ;
- un seul statut GitHub à consulter ;
- ordre d'exécution très explicite.

Inconvénients :
- un échec précoce empêche de voir les résultats suivants ;
- temps de feedback moins lisible ;
- difficile d'identifier rapidement quelle famille de tests échoue ;
- artefacts et rapports mélangés.

### 2. Un seul workflow avec plusieurs jobs

Description :
- conserver un workflow unique ;
- créer plusieurs jobs pour séparer unit, intégration et e2e.

Avantages :
- séparation technique des jobs ;
- centralisation dans un seul fichier ;
- possibilité de paralléliser certaines familles de tests.

Inconvénients :
- le workflow devient volumineux ;
- les responsabilités restent moins visibles dans la liste des checks ;
- les évolutions d'une famille de tests peuvent rendre le fichier plus difficile à maintenir.

### 3. Des workflows spécialisés par famille de feedback

Description :
- garder un workflow dédié aux tests unitaires ;
- garder un workflow dédié aux tests d'intégration et e2e backend ;
- garder un workflow dédié aux e2e frontend.

Avantages :
- résultats plus lisibles dans les checks de pull request ;
- un échec unit n'empêche pas les workflows e2e indépendants de s'exécuter ;
- artefacts séparés par famille de tests ;
- maintenance plus simple par périmètre.

Inconvénients :
- plus de fichiers GitHub Actions à maintenir ;
- certaines étapes comme le checkout ou l'installation peuvent être répétées ;
- la vue d'ensemble demande de connaître plusieurs workflows.

## Choix

Le choix retenu est de **séparer les tests de PR en workflows spécialisés (option 3)**.

Pourquoi ce choix :
- les tests unitaires, d'intégration et e2e ne répondent pas au même besoin ;
- les développeurs doivent identifier rapidement le type de régression ;
- les e2e ne doivent pas disparaître du feedback uniquement parce qu'un contrôle unitaire échoue ;
- les artefacts et rapports sont plus faciles à exploiter quand ils sont séparés.

## Conséquences

Positives :
- les checks GitHub indiquent plus clairement la famille de tests en échec ;
- les rapports de coverage et les artefacts sont séparés ;
- les workflows peuvent évoluer indépendamment ;
- les relances ciblées sont plus simples.

Négatives / limites :
- la configuration CI est répartie sur plusieurs fichiers ;
- certaines étapes sont dupliquées entre workflows ;
- les dépendances entre tests backend doivent être explicites quand elles existent.

Impact sur les évolutions futures :
- une nouvelle famille de tests pourra être ajoutée dans un workflow dédié ;
- si la duplication devient trop importante, des workflows réutilisables ou actions composites pourront être introduits ;
- les règles de protection de branche devront référencer les checks pertinents.
