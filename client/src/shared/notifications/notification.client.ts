import {
    CLIENT_NOTIFICATION_EVENT_NAMES,
    type ClientNotificationEvent,
    type ClientNotificationEventName,
} from './notification.types';

type NotificationHandler = (event: ClientNotificationEvent) => void;

type HandlerMap = Map<ClientNotificationEventName, Set<NotificationHandler>>;

class NotificationClient {
    private source: EventSource | null = null;
    private userId: string | null = null;
    private handlers: HandlerMap = new Map();

    connect(userId: string) {
        if (this.source && this.userId === userId) {
            return;
        }

        this.disconnect();

        this.userId = userId;
        this.source = new EventSource(
            `/api/notifications/events?userId=${userId}`,
        );

        for (const eventName of Object.values(
            CLIENT_NOTIFICATION_EVENT_NAMES,
        )) {
            this.source.addEventListener(eventName, (event) => {
                const messageEvent = event as MessageEvent<string>;
                const data = JSON.parse(
                    messageEvent.data,
                ) as ClientNotificationEvent;

                const listeners = this.handlers.get(eventName);
                if (!listeners) return;

                for (const handler of listeners) {
                    handler(data);
                }
            });
        }

        this.source.onerror = (error) => {
            console.error('[notifications] SSE error', error);
        };
    }

    disconnect() {
        if (this.source) {
            this.source.close();
            this.source = null;
        }

        this.userId = null;
    }

    subscribe(
        eventName: ClientNotificationEventName,
        handler: NotificationHandler,
    ): () => void {
        const existing =
            this.handlers.get(eventName) ?? new Set<NotificationHandler>();
        existing.add(handler);
        this.handlers.set(eventName, existing);

        return () => {
            const listeners = this.handlers.get(eventName);
            if (!listeners) return;

            listeners.delete(handler);

            if (listeners.size === 0) {
                this.handlers.delete(eventName);
            }
        };
    }
}

export const notificationClient = new NotificationClient();
