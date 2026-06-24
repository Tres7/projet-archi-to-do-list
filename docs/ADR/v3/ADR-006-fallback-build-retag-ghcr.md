# ADR-006 Choix du mécanisme de secours de release — fallback build si le retag est impossible

> Mise à jour: le workflow de retag a été retiré du CI/CD actif. Le release flow actuel build uniquement les services dont la version a augmenté; les services inchangés ne reçoivent ni retag ni fallback build.

**Date :** 2026-06-10
**Statut :** Accepted

## Contexte

La stratégie de release retag les images des services inchangés depuis la release précédente.

Cette stratégie suppose que l'image source existe encore dans GHCR avec le tag précédent. Cette hypothèse peut être fausse dans plusieurs cas :
- première release exploitable sans historique complet ;
- image supprimée manuellement ;
- ancienne release partiellement publiée ;
- incident temporaire pendant une publication précédente.

Il faut donc décider quoi faire quand le workflow ne peut pas retagger une image attendue.

## Options

### 1. Faire échouer immédiatement la release

Description :
- si l'image précédente n'existe pas, arrêter le workflow ;
- demander une correction manuelle avant de relancer.

Avantages :
- comportement strict ;
- aucune image n'est publiée sans validation explicite ;
- l'anomalie est visible immédiatement.

Inconvénients :
- une release peut être bloquée pour un problème réparable automatiquement ;
- intervention manuelle nécessaire ;
- mauvaise résilience face aux pertes d'artefacts anciens.

### 2. Ignorer l'image manquante

Description :
- continuer la release même si le retag ne produit pas d'image ;
- laisser le service sans tag de release correspondant.

Avantages :
- workflow simple ;
- aucune étape de secours à maintenir ;
- la release peut continuer pour les autres services.

Inconvénients :
- risque de release incomplète ;
- échec silencieux possible côté déploiement ;
- perte de confiance dans le tag de release.

### 3. Déclencher un build complet en fallback

Description :
- détecter les retags impossibles ;
- collecter les services concernés ;
- lancer `_build-ghcr-image.yml` pour reconstruire uniquement ces images.

Avantages :
- la release reste complète ;
- l'incident est visible dans le résumé du workflow ;
- aucune intervention manuelle n'est nécessaire dans le cas nominal ;
- la stratégie retag reste optimisée sans sacrifier la résilience.

Inconvénients :
- ajoute un chemin d'exécution supplémentaire ;
- le workflow de release devient plus long dans les cas de fallback ;
- la collecte des résultats de retag doit être fiable.

## Choix

Le choix retenu est de **déclencher un fallback build quand une image à retagger n'existe pas dans GHCR (option 3)**.

Pourquoi ce choix :
- une release ne doit pas se terminer avec des images manquantes ;
- l'absence d'une image précédente est un problème récupérable ;
- reconstruire seulement les services concernés limite le coût du secours ;
- le workflow conserve la promesse d'un tag complet pour tous les services.

## Conséquences

Positives :
- la release est plus robuste face aux artefacts manquants ;
- les services sans image précédente sont reconstruits automatiquement ;
- les erreurs silencieuses sont évitées ;
- le résumé CI indique clairement les services passés en fallback.

Négatives / limites :
- la release peut prendre plus de temps que prévu si plusieurs fallbacks sont nécessaires ;
- le mécanisme dépend des artefacts produits par `_retag-ghcr-image.yml` ;
- un fallback build ne corrige pas une erreur de configuration du Dockerfile ou du registry.

Impact sur les évolutions futures :
- les nouveaux services devront être ajoutés à la configuration de fallback ;
- des métriques de fréquence de fallback pourront indiquer un problème de rétention ou de publication GHCR ;
- si GHCR devient indisponible, un registry secondaire devra être envisagé séparément.
