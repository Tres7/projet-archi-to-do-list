# ADR-003 Choix du message broker — Redis

**Date :** 2026-02-27
**Statut :** Accepted

## Contexte

Suite à la décision d'adopter une communication asynchrone par événements (ADR-003), il faut choisir le message broker qui acheminera les événements entre les services.

Exigences clés :
- supporter la communication pub/sub entre les services ;
- s'intégrer facilement dans un environnement Node.js / TypeScript ;
- être simple à déployer via Docker Compose ;
- être suffisant pour le volume d'événements du projet.

## Options

### 1. Redis

Description :
- système de stockage clé-valeur en mémoire avec fonctionnalité pub/sub native ;
- les services publient sur des canaux, les abonnés reçoivent les messages en temps réel ;
- Redis Streams disponible pour un historique de messages plus durable.

Avantages :
- très léger et simple à configurer dans Docker Compose ;
- client Node.js mature (`ioredis`) ;
- polyvalent : peut également servir de cache si nécessaire ;
- faible courbe d'apprentissage pour l'équipe.

Inconvénients :
- pas de persistance des messages par défaut en mode pub/sub ;
- pas d'accusé de réception natif ni de dead letter queue ;
- si un service est hors ligne au moment de la publication, il manque le message.

### 2. RabbitMQ

Description :
- message broker dédié basé sur le protocole AMQP ;
- système d'exchanges, queues et bindings pour un routage avancé des messages ;
- persistance native des messages et accusés de réception.

Avantages :
- persistance garantie des messages ;
- gestion fine du routage (fanout, direct, topic) ;
- dead letter queue pour gérer les messages en échec ;
- adapté à des architectures à forte volumétrie.

Inconvénients :
- plus lourd à configurer et à maintenir ;
- complexité accrue pour les besoins actuels du projet ;
- courbe d'apprentissage plus élevée.

## Choix

Le choix retenu est **Redis (option 1)** :
- les événements du projet sont simples et en faible volumétrie ;
- la simplicité de configuration dans Docker Compose correspond aux contraintes du projet ;
- l'intégration avec Node.js est directe via `ioredis` ;
- Redis Streams peut être adopté si une durabilité des messages devient nécessaire.

## Conséquences

Positives :
- configuration rapide d'un conteneur Redis dans `compose.yaml` ;
- intégration simple dans chaque service via `ioredis` ;
- faible surcharge opérationnelle pour l'équipe.

Négatives / limites :
- un service hors ligne au moment d'un événement ne le recevra pas ;
- pas d'accusé de réception natif : un échec de traitement peut entraîner une perte silencieuse ;
- pas de dead letter queue sans configuration supplémentaire.

Impact sur les évolutions futures :
- si la fiabilité devient critique, migrer vers Redis Streams ou RabbitMQ sans changer l'interface des services grâce à l'abstraction de l'EventBus ;
- l'abstraction du broker dans une couche dédiée (`IEventBus`) facilitera ce remplacement éventuel.
