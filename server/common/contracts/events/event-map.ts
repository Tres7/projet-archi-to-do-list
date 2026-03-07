import { EVENT_NAMES } from './event-names.ts';
import type {
    ProjectClosedPayload,
    ProjectClosureRejectedPayload,
    ProjectClosureRequestedPayload,
    ProjectCreatedPayload,
    ProjectCreationRejectedPayload,
    ProjectCreationRequestedPayload,
} from './project.events.ts';
import type {
    TaskClosedPayload,
    TaskCreatedPayload,
    TaskCreationRejectedPayload,
    TaskCreationRequestedPayload,
    TaskDeletedPayload,
    TaskDeletionRejectedPayload,
    TaskDeletionRequestedPayload,
    TaskListRepliedPayload,
    TaskListRequestedPayload,
    TaskReopenedPayload,
    TaskStatusToggleRejectedPayload,
    TaskStatusToggleRequestedPayload,
} from './task.events.ts';

export type EventPayloadMap = {
    [EVENT_NAMES.PROJECT_CREATION_REQUESTED]: ProjectCreationRequestedPayload;
    [EVENT_NAMES.PROJECT_CREATED]: ProjectCreatedPayload;
    [EVENT_NAMES.PROJECT_CREATION_REJECTED]: ProjectCreationRejectedPayload;

    [EVENT_NAMES.PROJECT_CLOSURE_REQUESTED]: ProjectClosureRequestedPayload;
    [EVENT_NAMES.PROJECT_CLOSED]: ProjectClosedPayload;
    [EVENT_NAMES.PROJECT_CLOSURE_REJECTED]: ProjectClosureRejectedPayload;

    [EVENT_NAMES.TASK_CREATION_REQUESTED]: TaskCreationRequestedPayload;
    [EVENT_NAMES.TASK_CREATED]: TaskCreatedPayload;
    [EVENT_NAMES.TASK_CREATION_REJECTED]: TaskCreationRejectedPayload;

    [EVENT_NAMES.TASK_STATUS_TOGGLE_REQUESTED]: TaskStatusToggleRequestedPayload;
    [EVENT_NAMES.TASK_CLOSED]: TaskClosedPayload;
    [EVENT_NAMES.TASK_REOPENED]: TaskReopenedPayload;
    [EVENT_NAMES.TASK_STATUS_TOGGLE_REJECTED]: TaskStatusToggleRejectedPayload;

    [EVENT_NAMES.TASK_DELETION_REQUESTED]: TaskDeletionRequestedPayload;
    [EVENT_NAMES.TASK_DELETED]: TaskDeletedPayload;
    [EVENT_NAMES.TASK_DELETION_REJECTED]: TaskDeletionRejectedPayload;

    [EVENT_NAMES.TASK_LIST_REQUESTED]: TaskListRequestedPayload;
    [EVENT_NAMES.TASK_LIST_REPLIED]: TaskListRepliedPayload;
};
