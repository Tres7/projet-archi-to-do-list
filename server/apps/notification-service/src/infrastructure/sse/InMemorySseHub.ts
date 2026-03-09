import { randomUUID } from 'node:crypto';
import type { Response } from 'express';

import type { SsePublisher } from '../../domain/ports/SsePublisher.ts';
import {
    CLIENT_NOTIFICATION_EVENT_NAMES,
    type ClientNotificationEventName,
} from '../../domain/types/ClientNotificationEvent.ts';

type ClientConnection = {
    id: string;
    res: Response;
    heartbeat: NodeJS.Timeout;
};

export class InMemorySseHub implements SsePublisher {
    private readonly clientsByUserId = new Map<
        string,
        Map<string, ClientConnection>
    >();

    subscribe(userId: string, res: Response): () => void {
        const connectionId = randomUUID();

        const heartbeat = setInterval(() => {
            res.write(`: ping ${Date.now()}\n\n`);
        }, 25_000);

        const connection: ClientConnection = {
            id: connectionId,
            res,
            heartbeat,
        };

        const existing =
            this.clientsByUserId.get(userId) ??
            new Map<string, ClientConnection>();

        existing.set(connectionId, connection);
        this.clientsByUserId.set(userId, existing);

        this.publishToUser(userId, CLIENT_NOTIFICATION_EVENT_NAMES.CONNECTED, {
            type: CLIENT_NOTIFICATION_EVENT_NAMES.CONNECTED,
            refresh: [],
            message: 'SSE connection established',
        });

        return () => {
            const userConnections = this.clientsByUserId.get(userId);
            if (!userConnections) return;

            const current = userConnections.get(connectionId);
            if (!current) return;

            clearInterval(current.heartbeat);
            userConnections.delete(connectionId);

            if (userConnections.size === 0) {
                this.clientsByUserId.delete(userId);
            }
        };
    }

    publishToUser(
        userId: string,
        eventName: ClientNotificationEventName,
        data: unknown,
    ): void {
        const userConnections = this.clientsByUserId.get(userId);
        if (!userConnections || userConnections.size === 0) return;

        const payload = JSON.stringify(data);

        for (const connection of userConnections.values()) {
            connection.res.write(`event: ${eventName}\n`);
            connection.res.write(`data: ${payload}\n\n`);
        }
    }
}
