# ADR-007 Choix du canal de notification utilisateur — SSE + email

**Date :** 2026-03-19
**Statut :** Accepted

## Contexte

Le projet doit informer l'utilisateur :

- en temps réel dans l'interface web lors des changements sur ses projets et tâches ;
- de manière asynchrone pour certains événements importants même hors de l'interface.

Les notifications sont aujourd'hui déclenchées à partir des événements du domaine et consommées par `notification-service`.

## Options

### 1. Polling HTTP

Description :

- le client interroge périodiquement une route HTTP pour récupérer les nouveautés.

Avantages :

- mise en œuvre simple ;
- infrastructure minimale ;
- aucun canal temps réel persistant à maintenir.

Inconvénients :

- latence artificielle ;
- trafic inutile en l'absence d'événement ;
- expérience utilisateur moins réactive.

### 2. WebSocket

Description :

- ouvrir un canal bidirectionnel persistant entre le navigateur et le backend.

Avantages :

- très flexible ;
- adapté à des interactions temps réel riches ;
- bidirectionnalité native.

Inconvénients :

- plus complexe à opérer et à maintenir ;
- surdimensionné pour un flux essentiellement serveur vers client ;
- demande davantage de gestion d'état de connexion.

### 3. SSE pour le temps réel + email pour les notifications différées

Description :

- utiliser Server-Sent Events pour pousser les événements vers le navigateur ;
- compléter par l'envoi d'emails pour certains cas ciblés.

Avantages :

- très adapté à un flux unidirectionnel serveur vers client ;
- plus simple que WebSocket pour le besoin actuel ;
- facile à intégrer côté navigateur ;
- l'email couvre les notifications hors session active.

Inconvénients :

- pas de bidirectionnalité ;
- canal temps réel limité au navigateur connecté ;
- la sécurisation du flux SSE doit être traitée avec attention ;
- l'email ajoute une dépendance technique SMTP.

## Choix

Le choix retenu est **SSE pour le temps réel et email pour certains événements importants (option 3)**.

Pourquoi ce choix :

- le besoin temps réel est unidirectionnel : le serveur informe le client ;
- SSE est plus simple à implémenter et à opérer que WebSocket dans ce contexte ;
- l'email complète naturellement le dispositif pour certains événements utiles hors interface ;
- ce choix reste cohérent avec la simplicité visée par le projet.

## Conséquences

Positives :

- le frontend peut réagir rapidement aux événements de projet et de tâche ;
- `notification-service` reste le point unique de traduction entre événements backend et événements client ;
- l'historique local des notifications et le compteur non lus peuvent rester gérés côté client ;
- certains événements peuvent en plus déclencher un email sans complexifier les autres services.

Négatives / limites :

- le canal SSE actuel est volontairement simple et doit encore être renforcé sur l'authentification ;
- l'expérience hors ligne complète n'est pas couverte uniquement par SSE ;
- il faut maintenir deux canaux de sortie différents : navigateur et email.

Impact sur les évolutions futures :

- si des interactions bidirectionnelles riches apparaissent, WebSocket pourra être réévalué ;
- si le besoin d'historisation côté serveur devient important, un stockage dédié des notifications pourra être ajouté ;
- le modèle actuel est suffisant pour le périmètre présent tout en restant extensible.
