import type { ProjectTaskItemDto } from '../queries/project-details.dto.ts';

export interface TaskCreationRequestedPayload {
    operationId: string;
    taskId: string;
    projectId: string;
    userId: string;
    userEmail: string;
    name: string;
    description: string;
}

export interface TaskCreatedPayload {
    operationId: string;
    taskId: string;
    projectId: string;
    userId: string;
    userEmail: string;
    name: string;
    description: string;
    status: 'OPEN';
    createdAt: string;
}

export interface TaskCreationRejectedPayload {
    operationId: string;
    taskId: string;
    projectId: string;
    userId: string;
    userEmail: string;
    reason: string;
}

export interface TaskStatusToggleRequestedPayload {
    operationId: string;
    taskId: string;
    projectId: string;
    userId: string;
    userEmail: string;
}

export interface TaskClosedPayload {
    operationId: string;
    taskId: string;
    projectId: string;
    userId: string;
    userEmail: string;
}

export interface TaskReopenedPayload {
    operationId: string;
    taskId: string;
    projectId: string;
    userId: string;
    userEmail: string;
}

export interface TaskStatusToggleRejectedPayload {
    operationId: string;
    taskId: string;
    projectId: string;
    userId: string;
    userEmail: string;
    reason: string;
}

export interface TaskDeletionRequestedPayload {
    operationId: string;
    taskId: string;
    projectId: string;
    userId: string;
    userEmail: string;
}

export interface TaskDeletedPayload {
    operationId: string;
    taskId: string;
    projectId: string;
    userId: string;
    userEmail: string;
    previousStatus: 'OPEN' | 'DONE';
}

export interface TaskDeletionRejectedPayload {
    operationId: string;
    taskId: string;
    projectId: string;
    userId: string;
    userEmail: string;
    reason: string;
}

export interface TaskListRequestedPayload {
    projectId: string;
    userId: string;
}

export interface TaskListRepliedPayload {
    ok: true;
    projectId: string;
    tasks: ProjectTaskItemDto[];
}
