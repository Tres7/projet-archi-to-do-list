# ADR-009 Choix du déclenchement des tests d'intégration et e2e — sur PR plutôt qu'en nightly

**Date :** 2026-06-10
**Statut :** Accepted

## Contexte

Les tests d'intégration et e2e valident des comportements qui dépassent les unités isolées :
- persistance et repositories ;
- routes HTTP ;
- interaction entre services ;
- parcours utilisateur côté frontend.

Ces tests sont plus coûteux que les tests unitaires, mais ils détectent des régressions importantes avant le merge.

Il faut choisir entre un feedback immédiat sur les pull requests et un feedback différé via un workflow planifié.

## Options

### 1. Exécuter les tests d'intégration et e2e uniquement en nightly

Description :
- lancer les tests longs une fois par nuit ;
- ne garder que les tests plus rapides dans les pull requests.

Avantages :
- pull requests plus rapides ;
- consommation CI réduite pendant la journée ;
- exécution planifiée facile à suivre.

Inconvénients :
- feedback trop tardif pour le développeur ;
- régressions découvertes après le merge ;
- plusieurs changements peuvent être mélangés dans un même échec nightly ;
- correction plus coûteuse car le contexte de développement est déjà perdu.

### 2. Exécuter les tests après merge sur `main`

Description :
- laisser le merge se faire après les tests rapides ;
- lancer intégration et e2e uniquement sur la branche principale.

Avantages :
- PR plus rapides ;
- validation sur le code réellement intégré ;
- configuration simple.

Inconvénients :
- `main` peut devenir rouge après un merge ;
- rollback ou fix-forward nécessaire ;
- responsabilité de l'échec parfois moins claire.

### 3. Exécuter les tests d'intégration et e2e sur les PR vers `main`

Description :
- lancer les tests d'intégration backend et e2e sur chaque pull request ;
- publier les rapports et artefacts directement dans le contexte de la PR.

Avantages :
- feedback immédiat avant merge ;
- régressions attribuées à une PR précise ;
- meilleure confiance dans `main` ;
- résultats visibles au même endroit que la review.

Inconvénients :
- pull requests plus coûteuses en temps CI ;
- tests e2e potentiellement plus sensibles à l'environnement ;
- nécessite de maintenir une infrastructure de test fiable.

## Choix

Le choix retenu est d'exécuter **les tests d'intégration et e2e sur les pull requests vers `main` (option 3)**.

Pourquoi ce choix :
- le projet privilégie un retour rapide au moment où le développeur peut encore corriger facilement ;
- les régressions d'intégration sont trop importantes pour attendre la nuit ;
- le coût CI est acceptable au regard du risque de merger un comportement cassé ;
- les artefacts de PR facilitent le diagnostic immédiat.

## Conséquences

Positives :
- les erreurs d'intégration sont détectées avant le merge ;
- `main` reste plus stable ;
- chaque échec est associé à une pull request précise ;
- les développeurs disposent des rapports au moment de la review.

Négatives / limites :
- les PR peuvent prendre plus de temps à valider ;
- les tests doivent rester suffisamment stables pour ne pas bloquer inutilement les merges ;
- l'infrastructure de test doit être entretenue avec le même soin que le code applicatif.

Impact sur les évolutions futures :
- si le temps CI devient trop élevé, les tests pourront être optimisés ou mieux parallélisés ;
- un nightly pourra être ajouté en complément pour des scénarios plus longs, sans remplacer le feedback PR ;
- les checks obligatoires devront refléter les workflows réellement critiques.
