export type EventName =
    | 'task.created'
    | 'task.deleted'
    | 'task.status-changed'
    | 'project.closed';

export type EventEnvelope<
    TName extends EventName = EventName,
    TPayload = unknown,
> = {
    id: string;
    name: TName;
    version: 1;
    occurredAt: string;
    payload: TPayload;
};
