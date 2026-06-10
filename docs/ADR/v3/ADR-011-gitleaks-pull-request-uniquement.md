# Gitleaks exécuté uniquement sur les Pull Requests vers main

**Status:** Accepté

## Contexte

Comme pour Trivy ([[ADR-010-trivy-nightly-github-security]]), GitHub Security n'indexe les rapports SARIF que pour les workflows déclenchés sur la branche par défaut ou sur une Pull Request vers celle-ci. Exécuter Gitleaks à chaque push sur une branche `feat/*` produirait des rapports non visibles dans GitHub Security, et redondants avec le scan effectué à l'ouverture de la Pull Request correspondante.

## Options

### Option 1 - Exécuter Gitleaks sur chaque push, toutes branches confondues

Gitleaks scanne l'historique à chaque push, y compris sur les branches `feat/*`/`fix/*`.

### Option 2 - Exécuter Gitleaks uniquement sur les Pull Requests vers main

Gitleaks ne se déclenche que lorsqu'une Pull Request est ouverte ou mise à jour vers `main`.

## Décision

L'option 2 est retenue. `gitleaks.yml` se déclenche uniquement sur l'événement `pull_request` vers `main`. Un secret introduit dans une branche `feat/*` est détecté au plus tard à l'ouverture de la Pull Request, avant toute fusion dans `main`.

## Conséquences

### Positives (Bénéfices)

- Les résultats sont visibles dans GitHub Security (contexte Pull Request vers `main`).
- Pas de scan redondant à chaque push sur une branche de travail.
- Le secret est détecté avant d'atteindre `main`, qui est le moment critique pour ce contrôle.

### Négatives (Inconvénients)

- Un secret commité puis retiré avant l'ouverture de la Pull Request n'est pas détecté par ce workflow, bien qu'il reste présent dans l'historique local de la branche.

### Impact futur

Cette stratégie reste valable tant que la limitation de GitHub Security sur l'indexation des SARIF issus de branches autres que `main`/Pull Request persiste.
