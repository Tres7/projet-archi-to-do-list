# ADR-007 Choix du miroir Docker Hub pour les builds CI — `mirror.gcr.io`

**Date :** 2026-06-10
**Statut :** Accepted

## Contexte

Les workflows GitHub Actions construisent plusieurs images Docker et téléchargent des images de base depuis Docker Hub.

Les runners GitHub Actions peuvent être soumis aux limites de taux de Docker Hub, en particulier lors de builds multiples ou de relances rapprochées.

Le workflow `_build-ghcr-image.yml` configure Docker et BuildKit pour utiliser `mirror.gcr.io` comme miroir de `docker.io`.

## Options

### 1. Utiliser Docker Hub directement sans authentification

Description :
- laisser Docker et BuildKit télécharger les images depuis Docker Hub ;
- ne pas configurer de miroir ni de credentials.

Avantages :
- configuration minimale ;
- comportement Docker standard ;
- aucun service intermédiaire.

Inconvénients :
- exposition aux rate limits Docker Hub ;
- builds CI plus fragiles lors de périodes de forte activité ;
- relances de release plus risquées.

### 2. Authentifier les pulls Docker Hub

Description :
- ajouter des credentials Docker Hub dans GitHub Actions ;
- utiliser un compte dédié pour augmenter les limites de pulls.

Avantages :
- réduit le risque de rate limit ;
- conserve Docker Hub comme source directe ;
- adapté aux images privées Docker Hub.

Inconvénients :
- nécessite de gérer des secrets supplémentaires ;
- ajoute une dépendance à un compte externe ;
- complexifie la maintenance de la CI.

### 3. Utiliser le miroir public `mirror.gcr.io`

Description :
- configurer Docker et BuildKit pour résoudre `docker.io` via `mirror.gcr.io` ;
- éviter l'ajout de credentials Docker Hub.

Avantages :
- contourne une partie des rate limits Docker Hub ;
- aucun secret supplémentaire ;
- intégration simple dans les runners GitHub Actions ;
- compatible avec les builds actuels du projet.

Inconvénients :
- le miroir ne couvre pas forcément toutes les images immédiatement ;
- dépend d'un service externe supplémentaire ;
- ne remplace pas une stratégie de cache complète.

## Choix

Le choix retenu est d'utiliser **`mirror.gcr.io` comme miroir Docker Hub pour les builds CI (option 3)**.

Pourquoi ce choix :
- les builds de release peuvent télécharger plusieurs images de base dans un même run ;
- les rate limits Docker Hub peuvent provoquer des échecs non liés au code ;
- le miroir GCR réduit ce risque sans credentials supplémentaires ;
- la solution reste simple et cohérente avec des images publiques.

## Conséquences

Positives :
- les builds sont moins sensibles aux limites anonymes de Docker Hub ;
- aucun secret Docker Hub n'est nécessaire ;
- la configuration est centralisée dans le workflow de build réutilisable ;
- les relances CI sont plus fiables.

Négatives / limites :
- le miroir peut ne pas avoir une image très récente ;
- certains échecs réseau restent possibles ;
- cette décision ne couvre pas les images privées Docker Hub.

Impact sur les évolutions futures :
- si des images privées Docker Hub sont introduites, une authentification dédiée sera nécessaire ;
- si le miroir devient insuffisant, un cache registry contrôlé par l'équipe pourra être étudié ;
- la configuration du miroir devra rester synchronisée entre Docker et BuildKit.
