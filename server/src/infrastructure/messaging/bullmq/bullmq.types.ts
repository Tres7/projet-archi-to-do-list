import type {
    EventEnvelope,
    EventName,
} from '../../../common/messaging/events.ts';

export type Routes = Record<EventName, string[]>;

export type BrokerConfig = {
    redis: { host: string; port: number };
    inboxPrefix?: string;
};

export type PublisherConfig = {
    routes: Routes;
};

export type Handler<TPayload = unknown> = (
    event: EventEnvelope<EventName, TPayload>,
) => Promise<void> | void;

export interface EventPublisher {
    publish<TPayload>(
        name: EventName,
        payload: TPayload,
    ): Promise<EventEnvelope<EventName, TPayload>>;
}

export interface EventSubscriber {
    on<TPayload>(name: EventName, handler: Handler<TPayload>): void;
    start(): Promise<void>;
    stop(): Promise<void>;
}
