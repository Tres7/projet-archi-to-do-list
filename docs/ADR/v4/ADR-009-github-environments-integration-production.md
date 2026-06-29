# GitHub Environments pour isoler secrets et permissions par environnement cible

**Status:** Accepté

## Contexte

Le projet doit déployer vers deux environnements cibles distincts (Intégration, Production), chacun avec sa propre VM, ses propres identifiants SSH, et des exigences de contrôle différentes (l'Intégration peut être automatique, la Production doit pouvoir être contrôlée).

## Options

### Option 1 - Un seul jeu de secrets partagé pour tous les environnements

Stocker un unique ensemble de secrets de déploiement au niveau du dépôt, réutilisé par tous les workflows quel que soit l'environnement cible.

### Option 2 - Un GitHub Environment par environnement cible

Déclarer deux GitHub Environments (`integration`, `production`), chacun avec son propre jeu de secrets (`VM_HOST_*`, `VM_USER_*`, `SSH_PRIVATE_KEY_*`). Le workflow réutilisable `_deploy-compose.yml` reçoit `environment_name` en paramètre et déclare `environment: ${{ inputs.environment_name }}` au niveau du job, ce qui active les règles et l'audit propres à chaque environment.

## Décision

L'option 2 est retenue : chaque déploiement est exécuté dans le contexte du GitHub Environment correspondant, avec ses propres secrets et ses propres règles de protection.

## Conséquences

### Positives (Bénéfices)

- Isolation des identifiants : une fuite ou une mauvaise configuration sur l'Intégration ne donne pas accès à la Production.
- GitHub fournit nativement l'audit des déploiements par environnement et la possibilité d'ajouter des règles de protection (reviewers requis, restriction de branche) sans outillage supplémentaire.

### Négatives (Inconvénients)

- Duplique la configuration de secrets entre les deux environnements (deux jeux de `VM_HOST`/`VM_USER`/`SSH_PRIVATE_KEY` à maintenir).
- Le paramétrage des règles de protection (ex. reviewers obligatoires sur `production`) est une configuration GitHub externe au code, non versionnée dans le dépôt.

### Impact futur

L'ajout d'un environnement supplémentaire (ex. préproduction, mentionnée comme optionnelle par le cours) suivra le même schéma : un nouveau GitHub Environment avec ses propres secrets, sans modification du workflow `_deploy-compose.yml`.
