import type { EventEnvelope } from '../contracts/events/event-envelope.ts';
import type { EventPayloadMap } from '../contracts/events/event-map.ts';
import type { EventName } from '../contracts/events/event-names.ts';

export type EventHandler<TName extends EventName> = (
    event: EventEnvelope<TName, EventPayloadMap[TName]>,
) => Promise<void>;

export type RequestHandler<TReq extends EventName, TRes extends EventName> = (
    event: EventEnvelope<TReq, EventPayloadMap[TReq]>,
) => Promise<EventPayloadMap[TRes]>;

export interface MessageBus {
    publish<TName extends EventName>(
        target: string,
        name: TName,
        payload: EventPayloadMap[TName],
    ): Promise<void>;

    request<TReq extends EventName, TRes extends EventName>(
        target: string,
        requestName: TReq,
        responseName: TRes,
        payload: EventPayloadMap[TReq],
        timeoutMs?: number,
    ): Promise<EventPayloadMap[TRes]>;

    subscribe<TName extends EventName>(
        queue: string,
        name: TName,
        handler: EventHandler<TName>,
    ): void;

    respond<TReq extends EventName, TRes extends EventName>(
        queue: string,
        requestName: TReq,
        responseName: TRes,
        handler: RequestHandler<TReq, TRes>,
    ): void;

    start(queue: string): Promise<void>;
    stop(queue: string): Promise<void>;
    close(): Promise<void>;
}
