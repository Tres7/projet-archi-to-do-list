export type TaskStatus = 'OPEN' | 'DONE';

export type EventPayloadMap = {
    'task.created': {
        taskId: string;
        name: string;
        userId: string;
        userEmail: string;
    };
    'task.deleted': {
        taskId: string;
        userId: string;
        userEmail: string;
    };

    'task.closed': {
        taskId: string;
        userId: string;
        userEmail: string;
    };

    'task.reopened': {
        taskId: string;
        userId: string;
        userEmail: string;
    };

    'project.closed': {
        projectId: string;
        userId: string;
        userEmail: string;
    };
};

export type EventName = keyof EventPayloadMap;

export type EventEnvelope<TName extends EventName = EventName> = {
    id: string;
    name: TName;
    version: 1;
    occurredAt: string;
    payload: EventPayloadMap[TName];
};
