import type { ClientNotificationEventName } from '../types/ClientNotificationEvent.ts';

export interface SsePublisher {
    publishToUser(
        userId: string,
        eventName: ClientNotificationEventName,
        data: unknown,
    ): void;
}
