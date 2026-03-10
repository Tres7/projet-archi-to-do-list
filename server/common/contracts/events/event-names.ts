export const EVENT_NAMES = {
    PROJECT_CREATED: 'project.created',
    PROJECT_CLOSED: 'project.closed',
    PROJECT_DELETED: 'project.deleted',

    TASK_CREATION_REQUESTED: 'task.creation.requested',
    TASK_CREATED: 'task.created',
    TASK_CREATION_REJECTED: 'task.creation.rejected',

    TASK_STATUS_TOGGLE_REQUESTED: 'task.status-toggle.requested',
    TASK_CLOSED: 'task.closed',
    TASK_REOPENED: 'task.reopened',
    TASK_STATUS_TOGGLE_REJECTED: 'task.status-toggle.rejected',

    TASK_DELETION_REQUESTED: 'task.deletion.requested',
    TASK_DELETED: 'task.deleted',
    TASK_DELETION_REJECTED: 'task.deletion.rejected',

    TASK_LIST_REQUESTED: 'task.list.requested',
    TASK_LIST_REPLIED: 'task.list.replied',
} as const;

export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];
