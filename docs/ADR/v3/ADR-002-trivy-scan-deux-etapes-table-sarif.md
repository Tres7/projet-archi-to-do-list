# Scan Trivy en deux étapes (table + SARIF)

**Status:** Accepté

## Contexte

Trivy scanne les images Docker à la release et doit bloquer la publication en cas de vulnérabilité CRITICAL/HIGH corrigeable. Le format `sarif`, nécessaire pour l'upload vers GitHub Security, ignore le paramètre `severity` : il scanne et reporte toutes les sévérités, y compris LOW/MEDIUM, ce qui ferait échouer le job sur des vulnérabilités non pertinentes pour la décision de blocage.

## Options

### Option 1 - Un seul step, format SARIF avec exit-code: 1

Un unique scan Trivy au format `sarif`, avec `exit-code: 1` pour bloquer la release et upload du même fichier vers GitHub Security.

### Option 2 - Deux steps distincts (table puis SARIF)

Un premier scan au format `table`, filtré sur `severity: CRITICAL,HIGH` avec `exit-code: 1` pour bloquer la release. Un second scan au format `sarif`, avec `exit-code: 0` et `if: always()`, dédié uniquement à la génération du rapport pour GitHub Security.

## Décision

L'option 2 est retenue. Le workflow réutilisable `_build-ghcr-image.yml` exécute deux scans Trivy successifs sur la même image : le premier (`format: table`, `severity: CRITICAL,HIGH`, `exit-code: 1`) bloque la release en cas de vulnérabilité critique corrigeable ; le second (`format: sarif`, `exit-code: 0`, `if: always()`) génère systématiquement un rapport SARIF uploadé vers GitHub Security, que le premier step ait échoué ou non.

## Conséquences

### Positives (Bénéfices)

- La release est bloquée uniquement sur les vulnérabilités CRITICAL/HIGH pertinentes pour l'équipe.
- Le rapport SARIF complet reste généré et disponible dans GitHub Security pour audit, même si le premier step échoue.

### Négatives (Inconvénients)

- L'image est scannée deux fois, ce qui rallonge légèrement la durée du job de build.
- Deux steps à maintenir en cohérence (mêmes paramètres `image-ref`, `severity`, `ignore-unfixed`).

### Impact futur

Si Trivy fait évoluer son comportement pour appliquer le filtre `severity` également au format SARIF, les deux steps pourront être fusionnés en un seul.
