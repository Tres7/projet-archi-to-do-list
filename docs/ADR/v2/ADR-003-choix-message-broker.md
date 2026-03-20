# ADR-003 Choix de la technologie de messaging — BullMQ sur Redis

**Date :** 2026-03-19
**Statut :** Accepted

## Contexte

Suite au choix d'un catalogue d'événements mixte (ADR-002), il faut une solution de messaging capable de :
- transporter les commandes et événements entre services ;
- gérer des workers dédiés par service ;
- supporter des retries et un backoff simple ;
- permettre un mécanisme de request/reply pour certaines lectures composées ;
- rester simple à déployer dans Docker Compose.

## Options

### 1. Redis Pub/Sub natif

Description :
- utiliser Redis directement avec des canaux pub/sub ;
- chaque service écoute les canaux qui le concernent.

Avantages :
- mise en œuvre très légère ;
- coût d'infrastructure minimal ;
- excellent point d'entrée pour un prototype.

Inconvénients :
- pas de gestion native des retries ;
- pas de file de messages durable par consommateur ;
- request/reply plus difficile à construire proprement ;
- un consommateur hors ligne peut rater un message.

### 2. BullMQ sur Redis

Description :
- utiliser Redis comme support et BullMQ comme abstraction de queues et workers ;
- modéliser une queue principale par service et des reply queues temporaires quand nécessaire.

Avantages :
- bonne intégration avec Node.js / TypeScript ;
- retries et backoff intégrés ;
- modèle queue/worker adapté aux traitements asynchrones du projet ;
- request/reply réalisable sans ajouter un second broker ;
- déploiement simple dans l'infrastructure déjà présente.

Inconvénients :
- ajoute une couche d'abstraction supplémentaire au-dessus de Redis ;
- routage moins riche qu'un broker AMQP complet ;
- demande une discipline d'implémentation autour des payloads, des handlers et des erreurs.

### 3. RabbitMQ

Description :
- utiliser un broker AMQP dédié avec exchanges, queues, bindings et accusés de réception.

Avantages :
- fonctionnalités de messaging très complètes ;
- routage puissant ;
- meilleure base pour des scénarios à forte volumétrie et des politiques avancées.

Inconvénients :
- coût opérationnel plus élevé ;
- complexité supplémentaire pour le niveau actuel du projet ;
- surdimensionné pour le volume et le nombre de flux actuels.

## Choix

Le choix retenu est **BullMQ sur Redis (option 2)**.

Pourquoi ce choix :
- le projet a besoin de plus qu'un simple pub/sub, notamment des retries, un modèle de workers et du request/reply ;
- BullMQ reste simple à intégrer dans un backend Node.js existant ;
- Redis est déjà présent dans l'infrastructure Docker Compose ;
- RabbitMQ apporterait plus de puissance mais pour un coût opérationnel qui n'est pas justifié à cette échelle.

## Conséquences

Positives :
- chaque service consomme sa propre queue applicative ;
- les handlers peuvent bénéficier d'une politique simple de retry et de backoff ;
- les requêtes inter-services ponctuelles peuvent utiliser des reply queues dédiées ;
- une abstraction `MessageBus` permet de ne pas coupler le code métier à BullMQ directement.

Négatives / limites :
- la solution reste plus complexe qu'un appel HTTP synchrone ;
- il faut gérer explicitement les cas de duplication, d'ordre et d'idempotence ;
- les fonctionnalités avancées de broker d'entreprise ne sont pas couvertes nativement.

Impact sur les évolutions futures :
- si la fiabilité ou le routage deviennent plus exigeants, l'abstraction `MessageBus` permettra de faire évoluer l'implémentation ;
- Redis pourra continuer à être réutilisé pour d'autres besoins techniques si nécessaire ;
- la structure actuelle prépare correctement une montée progressive en sophistication sans changer les contrats métiers.
