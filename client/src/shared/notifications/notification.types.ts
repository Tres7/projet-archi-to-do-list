export const CLIENT_NOTIFICATION_EVENT_NAMES = {
    CONNECTED: 'connected',

    PROJECT_CREATED: 'project.created',
    PROJECT_CLOSED: 'project.closed',

    TASK_CREATED: 'task.created',
    TASK_UPDATED: 'task.updated',
    TASK_DELETED: 'task.deleted',

    OPERATION_REJECTED: 'operation.rejected',
} as const;

export type ClientNotificationEventName =
    (typeof CLIENT_NOTIFICATION_EVENT_NAMES)[keyof typeof CLIENT_NOTIFICATION_EVENT_NAMES];

export type RefreshTarget = 'projects' | 'project-details';

export type ClientNotificationEvent = {
    type: ClientNotificationEventName;
    projectId?: string;
    taskId?: string;
    reason?: string;
    refresh: RefreshTarget[];
    message?: string;
};
