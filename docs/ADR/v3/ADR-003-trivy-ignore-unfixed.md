# Trivy : bloquer uniquement les vulnérabilités corrigeables (ignore-unfixed)

**Status:** Accepté

## Contexte

Le step Trivy bloquant ([[ADR-002-trivy-scan-deux-etapes-table-sarif]], `exit-code: 1`, `severity: CRITICAL,HIGH`) peut échouer sur des CVE pour lesquelles aucun correctif n'est disponible dans le dépôt de paquets de l'image de base. L'équipe ne peut pas corriger ces vulnérabilités elle-même : sans ajustement, elles bloqueraient indéfiniment toutes les releases tant qu'aucun correctif upstream n'est publié.

## Options

### Option 1 - Bloquer sur toute CVE CRITICAL/HIGH, corrigeable ou non

`exit-code: 1` sans filtre supplémentaire : toute vulnérabilité CRITICAL/HIGH détectée bloque la release, même en l'absence de correctif disponible.

### Option 2 - Bloquer uniquement sur les CVE CRITICAL/HIGH avec correctif disponible

Ajout de `ignore-unfixed: true` : Trivy ignore les vulnérabilités CRITICAL/HIGH pour lesquelles aucun correctif n'existe encore, et ne bloque que sur celles qui peuvent être corrigées immédiatement.

## Décision

L'option 2 est retenue. `ignore-unfixed: true` est ajouté aux deux steps Trivy ([[ADR-002-trivy-scan-deux-etapes-table-sarif]]). Seules les vulnérabilités CRITICAL/HIGH disposant d'un correctif disponible (mise à jour de paquet système via `apk upgrade`, mise à jour de dépendance npm, etc.) bloquent la release.

## Conséquences

### Positives (Bénéfices)

- La release n'est jamais bloquée par une vulnérabilité hors du contrôle de l'équipe.
- Toute vulnérabilité bloquante dispose d'une action corrective claire et immédiate (mise à jour de paquet).

### Négatives (Inconvénients)

- Des vulnérabilités CRITICAL/HIGH sans correctif peuvent rester présentes dans l'image sans bloquer le pipeline.
- Nécessite un suivi régulier (via le rapport SARIF nightly) pour détecter quand un correctif devient disponible pour une vulnérabilité jusque-là ignorée.

### Impact futur

Le scan nightly sur les digests du dernier manifest versionné ([[ADR-010-trivy-nightly-github-security]]) permet de détecter dès qu'un correctif devient disponible pour une vulnérabilité jusque-là ignorée, et de déclencher une nouvelle release pour l'appliquer.
