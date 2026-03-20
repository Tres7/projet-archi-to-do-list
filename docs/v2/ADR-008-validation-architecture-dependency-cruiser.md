# ADR-008 Choix du mécanisme de validation des règles d'architecture — dependency-cruiser

**Date :** 2026-03-19
**Statut :** Accepted

## Contexte

Le backend applique une architecture en couches dans plusieurs services et impose aussi des frontières entre composants, par exemple :
- `domain` ne doit pas dépendre de `application` ni de `infrastructure` ;
- `application` ne doit pas dépendre de `infrastructure` ;
- le `gateway` ne doit pas importer le code interne des autres services.

Ces règles doivent être contrôlées de manière répétable et non laissées uniquement à la vigilance humaine.

## Options

### 1. Discipline d'équipe et code review uniquement

Description :
- vérifier les violations d'architecture au moment des reviews ;
- s'appuyer sur la vigilance des développeurs.

Avantages :
- aucun outillage supplémentaire ;
- très faible coût technique ;
- bonne souplesse d'interprétation.

Inconvénients :
- contrôle irrégulier ;
- erreurs faciles à laisser passer ;
- faible traçabilité des règles réellement appliquées.

### 2. Tests ou scripts personnalisés maison

Description :
- écrire des scripts ad hoc pour détecter certaines dépendances interdites ;
- maintenir soi-même la logique de vérification.

Avantages :
- totalement adaptable au projet ;
- permet d'exprimer exactement les règles voulues.

Inconvénients :
- effort de maintenance élevé ;
- risque de réinventer un outil existant ;
- couverture parfois incomplète ou fragile.

### 3. dependency-cruiser

Description :
- définir les règles de dépendance dans un fichier de configuration ;
- exécuter un contrôle dédié via un script de validation d'architecture.

Avantages :
- outil spécialisé pour les dépendances de modules ;
- règles explicites, versionnées et rejouables ;
- feedback rapide dans le cycle de développement ;
- bon compromis entre expressivité et coût de maintenance.

Inconvénients :
- configuration à maintenir ;
- certaines règles peuvent nécessiter des ajustements au fil de l'évolution du code ;
- ne remplace pas complètement une revue d'architecture humaine.

## Choix

Le choix retenu est **dependency-cruiser (option 3)**.

Pourquoi ce choix :
- le projet a désormais assez de couches et de services pour que les violations d'architecture deviennent faciles à introduire ;
- dependency-cruiser permet d'exprimer précisément les dépendances interdites sans développer un outil maison ;
- le résultat est automatisable dans les scripts du projet et suffisamment lisible pour l'équipe.

## Conséquences

Positives :
- les règles d'architecture deviennent du code exécutable ;
- les violations sont détectées plus tôt ;
- la structure en couches et les frontières inter-services sont mieux protégées ;
- la documentation architecturale et la validation technique restent alignées.

Négatives / limites :
- certaines évolutions structurelles imposeront de mettre à jour la configuration ;
- un outil statique ne garantit pas à lui seul la qualité du design ;
- des faux positifs ou faux négatifs restent possibles si la configuration devient obsolète.

Impact sur les évolutions futures :
- de nouvelles règles pourront être ajoutées à mesure que l'architecture se raffine ;
- l'équipe disposera d'un garde-fou concret pour éviter les dérives de dépendances ;
- cette décision renforce la crédibilité des ADR en les reliant à un mécanisme de vérification concret.
