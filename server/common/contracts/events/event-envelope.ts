import type { EventName } from './event-names.ts';

export type EventMeta = {
    correlationId?: string;
    replyTo?: string;
};

export type EventEnvelope<TName extends EventName, TPayload> = {
    id: string;
    name: TName;
    version: 1;
    occurredAt: string;
    meta?: EventMeta;
    payload: TPayload;
};
