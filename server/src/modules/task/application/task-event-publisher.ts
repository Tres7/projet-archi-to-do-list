import { EVENT_NAMES } from '../../../../common/contracts/events/event-names.ts';
import type {
    TaskClosedPayload,
    TaskCreationRejectedPayload,
    TaskDeletedPayload,
    TaskReopenedPayload,
    TaskStatusToggleRejectedPayload,
    TaskDeletionRejectedPayload,
} from '../../../../common/contracts/events/task.events.ts';
import type { MessageBus } from '../../../../common/messaging/MessageBus.ts';
import type { Task } from '../domain/entities/Task.ts';

export async function publishTaskCreated(
    bus: MessageBus,
    target: string,
    params: {
        operationId: string;
        userEmail: string;
        task: Task;
    },
) {
    const raw = params.task.toPrimitives();

    await bus.publish(target, EVENT_NAMES.TASK_CREATED, {
        operationId: params.operationId,
        taskId: raw.id,
        projectId: raw.projectId,
        userId: raw.userId,
        userEmail: params.userEmail,
        name: raw.name,
        description: raw.description,
        status: 'OPEN',
        createdAt: raw.createdAt.toISOString(),
    });
}

export async function publishTaskCreationRejected(
    bus: MessageBus,
    target: string,
    payload: TaskCreationRejectedPayload,
) {
    await bus.publish(target, EVENT_NAMES.TASK_CREATION_REJECTED, payload);
}

export async function publishTaskClosed(
    bus: MessageBus,
    target: string,
    payload: TaskClosedPayload,
) {
    await bus.publish(target, EVENT_NAMES.TASK_CLOSED, payload);
}

export async function publishTaskReopened(
    bus: MessageBus,
    target: string,
    payload: TaskReopenedPayload,
) {
    await bus.publish(target, EVENT_NAMES.TASK_REOPENED, payload);
}

export async function publishTaskToggleRejected(
    bus: MessageBus,
    target: string,
    payload: TaskStatusToggleRejectedPayload,
) {
    await bus.publish(target, EVENT_NAMES.TASK_STATUS_TOGGLE_REJECTED, payload);
}

export async function publishTaskDeleted(
    bus: MessageBus,
    target: string,
    payload: TaskDeletedPayload,
) {
    await bus.publish(target, EVENT_NAMES.TASK_DELETED, payload);
}

export async function publishTaskDeletionRejected(
    bus: MessageBus,
    target: string,
    payload: TaskDeletionRejectedPayload,
) {
    await bus.publish(target, EVENT_NAMES.TASK_DELETION_REJECTED, payload);
}
