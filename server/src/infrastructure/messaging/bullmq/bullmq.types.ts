import type {
    EventEnvelope,
    EventName,
    EventPayloadMap,
} from '../../../common/messaging/events.ts';

export type Routes = Record<EventName, string[]>;

export type BrokerConfig = {
    redis: { host: string; port: number };
    inboxPrefix?: string;
};

export type PublisherConfig = {
    routes: Routes;
};

export type Handler<TName extends EventName> = (
    event: EventEnvelope<TName>,
) => Promise<void> | void;

export interface EventPublisher {
    publish<TName extends EventName>(
        name: TName,
        payload: EventPayloadMap[TName],
    ): Promise<EventEnvelope<TName>>;
}

export interface EventSubscriber {
    on<TName extends EventName>(name: TName, handler: Handler<TName>): void;
    start(): Promise<void>;
    stop(): Promise<void>;
}
