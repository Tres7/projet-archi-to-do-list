# Scan Trivy nightly sur :latest pour la visibilité GitHub Security

**Status:** Accepté

## Contexte

GitHub Security (onglet Code scanning) n'indexe les rapports SARIF que pour les workflows déclenchés depuis une branche (branche par défaut ou Pull Request). Le scan Trivy de release ([[ADR-002-trivy-scan-deux-etapes-table-sarif]]) est déclenché par la publication d'un tag Git (`release: published`), une référence qui n'est pas une branche. Les rapports SARIF uploadés depuis ce contexte sont donc acceptés par l'API mais n'apparaissent jamais dans GitHub Security.

## Options

### Option 1 - Se contenter du SARIF généré à la release

Le rapport SARIF est généré et uploadé à chaque release, mais reste invisible dans GitHub Security à cause de la limitation sur les déclencheurs de type tag.

### Option 2 - Ajouter un scan nightly sur la branche par défaut

Un workflow planifié (`schedule`), donc rattaché à la branche par défaut, scanne périodiquement les images `:latest` de chaque service et upload leurs rapports SARIF.

## Décision

L'option 2 est retenue. `trivy-nightly.yml` s'exécute chaque semaine sur la branche par défaut, scanne l'image `:latest` de chacun des 6 services et upload les SARIF résultants vers GitHub Security. Le tag `:latest` est ajouté aux images poussées lors de chaque release pour que ce scan cible toujours la dernière version publiée.

## Conséquences

### Positives (Bénéfices)

- Les résultats Trivy apparaissent dans GitHub Security, consultables par l'équipe et lors d'audits.
- Le scan nightly détecte également les nouvelles CVE découvertes après une release, sans attendre une nouvelle publication.

### Négatives (Inconvénients)

- Délai entre la release et l'apparition des résultats dans GitHub Security (jusqu'à une semaine selon le planning du nightly).
- Duplication partielle : la même image est scannée à la fois à la release et lors du nightly suivant.

### Impact futur

Si GitHub Security supporte un jour l'indexation des SARIF issus de workflows déclenchés par un tag, le scan nightly pourra être simplifié ou retiré.
