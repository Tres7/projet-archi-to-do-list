import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import { EVENT_NAMES } from '../../../../../common/contracts/events/event-names.ts';
import {
    publishTaskClosed,
    publishTaskCreated,
    publishTaskCreationRejected,
    publishTaskDeleted,
    publishTaskDeletionRejected,
    publishTaskReopened,
    publishTaskToggleRejected,
} from '../../../src/application/task-event-publisher.ts';

import type {
    TaskClosedPayload,
    TaskCreationRejectedPayload,
    TaskDeletedPayload,
    TaskDeletionRejectedPayload,
    TaskReopenedPayload,
    TaskStatusToggleRejectedPayload,
} from '../../../../../common/contracts/events/task.events.ts';
import type { MessageBus } from '../../../../../common/messaging/MessageBus.ts';
import type { Task } from '../../../src/domain/entities/Task.ts';

describe('task-event-publisher', () => {
    const publish = jest.fn<(...args: any[]) => Promise<void>>();

    const bus = {
        publish,
    } as unknown as MessageBus;

    const target = 'project-service';

    beforeEach(() => {
        jest.clearAllMocks();
        publish.mockResolvedValue(undefined);
    });

    it('publishTaskCreated publishes TASK_CREATED with normalized payload', async () => {
        const createdAt = new Date('2026-03-11T10:00:00.000Z');

        const task = {
            toPrimitives: () => ({
                id: 'task-1',
                userId: 'user-1',
                projectId: 'project-1',
                name: 'Test task',
                description: 'Test description',
                status: 'DONE',
                createdAt,
            }),
        } as unknown as Task;

        await publishTaskCreated(bus, target, {
            operationId: 'op-1',
            userEmail: 'anton@example.com',
            task,
        });

        expect(publish).toHaveBeenCalledTimes(1);
        expect(publish).toHaveBeenCalledWith(target, EVENT_NAMES.TASK_CREATED, {
            operationId: 'op-1',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'anton@example.com',
            name: 'Test task',
            description: 'Test description',
            status: 'OPEN',
            createdAt: createdAt.toISOString(),
        });
    });

    it('publishTaskCreationRejected publishes TASK_CREATION_REJECTED', async () => {
        const payload: TaskCreationRejectedPayload = {
            operationId: 'op-2',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'anton@example.com',
            reason: 'Project is closed',
        };

        await publishTaskCreationRejected(bus, target, payload);

        expect(publish).toHaveBeenCalledTimes(1);
        expect(publish).toHaveBeenCalledWith(
            target,
            EVENT_NAMES.TASK_CREATION_REJECTED,
            payload,
        );
    });

    it('publishTaskClosed publishes TASK_CLOSED', async () => {
        const payload: TaskClosedPayload = {
            operationId: 'op-3',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'anton@example.com',
        };

        await publishTaskClosed(bus, target, payload);

        expect(publish).toHaveBeenCalledTimes(1);
        expect(publish).toHaveBeenCalledWith(
            target,
            EVENT_NAMES.TASK_CLOSED,
            payload,
        );
    });

    it('publishTaskReopened publishes TASK_REOPENED', async () => {
        const payload: TaskReopenedPayload = {
            operationId: 'op-4',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'anton@example.com',
        };

        await publishTaskReopened(bus, target, payload);

        expect(publish).toHaveBeenCalledTimes(1);
        expect(publish).toHaveBeenCalledWith(
            target,
            EVENT_NAMES.TASK_REOPENED,
            payload,
        );
    });

    it('publishTaskToggleRejected publishes TASK_STATUS_TOGGLE_REJECTED', async () => {
        const payload: TaskStatusToggleRejectedPayload = {
            operationId: 'op-5',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'anton@example.com',
            reason: 'Project is closed',
        };

        await publishTaskToggleRejected(bus, target, payload);

        expect(publish).toHaveBeenCalledTimes(1);
        expect(publish).toHaveBeenCalledWith(
            target,
            EVENT_NAMES.TASK_STATUS_TOGGLE_REJECTED,
            payload,
        );
    });

    it('publishTaskDeleted publishes TASK_DELETED', async () => {
        const payload: TaskDeletedPayload = {
            operationId: 'op-6',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'anton@example.com',
            previousStatus: 'OPEN',
        };

        await publishTaskDeleted(bus, target, payload);

        expect(publish).toHaveBeenCalledTimes(1);
        expect(publish).toHaveBeenCalledWith(
            target,
            EVENT_NAMES.TASK_DELETED,
            payload,
        );
    });

    it('publishTaskDeletionRejected publishes TASK_DELETION_REJECTED', async () => {
        const payload: TaskDeletionRejectedPayload = {
            operationId: 'op-7',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'anton@example.com',
            reason: 'Task not found',
        };

        await publishTaskDeletionRejected(bus, target, payload);

        expect(publish).toHaveBeenCalledTimes(1);
        expect(publish).toHaveBeenCalledWith(
            target,
            EVENT_NAMES.TASK_DELETION_REJECTED,
            payload,
        );
    });
});
