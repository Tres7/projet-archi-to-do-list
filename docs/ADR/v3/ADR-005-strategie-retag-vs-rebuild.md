# ADR-005 Choix de la stratégie de publication des images — retag plutôt que rebuild systématique

**Date :** 2026-06-10
**Statut :** Accepted

## Contexte

Lors d'une release, le projet doit publier une image versionnée pour chaque service exécutable.

Tous les services ne changent pas forcément entre deux releases. Par exemple, une évolution du client ne nécessite pas de reconstruire `auth-service`, et une évolution d'un service backend ne nécessite pas forcément de reconstruire le client.

Le workflow `release-images.yml` détecte les chemins modifiés depuis la release précédente et sépare les services à reconstruire des services inchangés.

## Options

### 1. Reconstruire toutes les images à chaque release

Description :
- lancer un build complet pour les six images à chaque publication de release ;
- ignorer les différences réelles entre la release précédente et la release courante.

Avantages :
- comportement simple à comprendre ;
- toutes les images sont produites par le même run de release ;
- pas de dépendance directe à l'existence des images précédentes.

Inconvénients :
- temps CI plus long ;
- consommation inutile de ressources ;
- exposition plus forte aux limites de téléchargement d'images de base ;
- bruit opérationnel quand aucun code runtime n'a changé pour certains services.

### 2. Publier uniquement les images des services modifiés

Description :
- ne construire que les services dont le code a changé ;
- ne pas produire de nouveau tag de release pour les services inchangés.

Avantages :
- temps de CI réduit ;
- logique de build minimale ;
- pas besoin de copier les images existantes.

Inconvénients :
- une release ne contient pas un ensemble complet d'images taggées ;
- le déploiement doit mélanger plusieurs tags de release ;
- traçabilité plus difficile pour reproduire exactement une version.

### 3. Retagger les images inchangées

Description :
- reconstruire uniquement les services modifiés ;
- copier l'image de la release précédente vers le nouveau tag pour les services inchangés.

Avantages :
- chaque release expose un tag complet pour tous les services ;
- les services inchangés conservent le même contenu d'image ;
- réduction du temps et des ressources CI ;
- déploiement plus simple avec un tag de release unique.

Inconvénients :
- nécessite que l'image de la release précédente existe dans GHCR ;
- dépend de la qualité de la détection des changements ;
- ajoute une étape de retag dans le workflow de release.

## Choix

Le choix retenu est de **retagger les images des services inchangés plutôt que de les reconstruire systématiquement (option 3)**.

Pourquoi ce choix :
- le projet publie plusieurs images mais les changements sont souvent localisés ;
- reconstruire une image inchangée n'apporte pas de valeur fonctionnelle ;
- un tag de release complet reste nécessaire pour simplifier le déploiement ;
- le retag donne un bon compromis entre traçabilité et économie de CI.

## Conséquences

Positives :
- les releases sont plus rapides lorsque peu de services changent ;
- les ressources GitHub Actions sont moins sollicitées ;
- chaque release reste déployable avec un seul tag commun ;
- les images inchangées restent identiques à celles déjà validées.

Négatives / limites :
- la stratégie dépend de la disponibilité des images précédentes ;
- une erreur dans les filtres de chemins peut conduire à retagger une image qui aurait dû être reconstruite ;
- le workflow de release devient plus complexe qu'un rebuild complet.

Impact sur les évolutions futures :
- les filtres de changements devront être mis à jour à chaque ajout ou déplacement de code runtime ;
- un mécanisme de fallback build reste nécessaire si l'image précédente est absente ;
- si le coût CI devient secondaire, la stratégie pourra être réévaluée au profit d'un rebuild systématique.
