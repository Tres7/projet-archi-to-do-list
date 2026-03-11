import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import { EVENT_NAMES } from '../../../../../../common/contracts/events/event-names.ts';
import type { MessageBus } from '../../../../../../common/messaging/MessageBus.ts';
import type { TaskEventHandler } from '../../../../src/application/TaskEventHandler.ts';
import type { ProjectTaskItemDto } from '../../../../../../common/contracts/queries/project-details.dto.ts';
import type { TaskService } from '../../../../src/application/TaskService.ts';
import { TaskEventConsumer } from '../../../../src/infrastructure/messaging/TaskEventConsumer.ts';

describe('TaskEventConsumer', () => {
    const subscribe = jest.fn();
    const respond = jest.fn();
    const start = jest.fn<(queue: string) => Promise<void>>();
    const stop = jest.fn<(queue: string) => Promise<void>>();

    const bus = {
        subscribe,
        respond,
        start,
        stop,
    } as unknown as MessageBus;

    const handler = {
        onTaskCreationRequested: jest.fn(),
        onTaskStatusToggleRequested: jest.fn(),
        onTaskDeletionRequested: jest.fn(),
    } as unknown as TaskEventHandler;

    const taskService = {
        getTasksByProject: jest.fn(),
    } as unknown as TaskService;

    let consumer: TaskEventConsumer;

    beforeEach(() => {
        jest.clearAllMocks();

        subscribe.mockReturnValue(undefined);
        respond.mockReturnValue(undefined);
        start.mockResolvedValue(undefined);
        stop.mockResolvedValue(undefined);

        (
            taskService.getTasksByProject as jest.MockedFunction<
                TaskService['getTasksByProject']
            >
        ).mockResolvedValue([]);

        consumer = new TaskEventConsumer(bus, handler, taskService);
    });

    it('registers subscriptions and request-reply handler', () => {
        consumer.register();

        expect(subscribe).toHaveBeenCalledTimes(3);
        expect(respond).toHaveBeenCalledTimes(1);

        expect(subscribe).toHaveBeenNthCalledWith(
            1,
            TaskEventConsumer.QUEUE,
            EVENT_NAMES.TASK_CREATION_REQUESTED,
            expect.any(Function),
        );

        expect(subscribe).toHaveBeenNthCalledWith(
            2,
            TaskEventConsumer.QUEUE,
            EVENT_NAMES.TASK_STATUS_TOGGLE_REQUESTED,
            expect.any(Function),
        );

        expect(subscribe).toHaveBeenNthCalledWith(
            3,
            TaskEventConsumer.QUEUE,
            EVENT_NAMES.TASK_DELETION_REQUESTED,
            expect.any(Function),
        );

        expect(respond).toHaveBeenCalledWith(
            TaskEventConsumer.QUEUE,
            EVENT_NAMES.TASK_LIST_REQUESTED,
            EVENT_NAMES.TASK_LIST_REPLIED,
            expect.any(Function),
        );
    });

    it('handles TASK_CREATION_REQUESTED', async () => {
        consumer.register();

        const creationCallback = subscribe.mock.calls[0][2] as (message: {
            payload: unknown;
        }) => Promise<void>;

        const payload = {
            operationId: 'op-1',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'anton@example.com',
            name: 'Task 1',
            description: 'Description 1',
        };

        await creationCallback({ payload });

        expect(handler.onTaskCreationRequested).toHaveBeenCalledTimes(1);
        expect(handler.onTaskCreationRequested).toHaveBeenCalledWith(payload);
    });

    it('handles TASK_STATUS_TOGGLE_REQUESTED', async () => {
        consumer.register();

        const toggleCallback = subscribe.mock.calls[1][2] as (message: {
            payload: unknown;
        }) => Promise<void>;

        const payload = {
            operationId: 'op-2',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'anton@example.com',
        };

        await toggleCallback({ payload });

        expect(handler.onTaskStatusToggleRequested).toHaveBeenCalledTimes(1);
        expect(handler.onTaskStatusToggleRequested).toHaveBeenCalledWith(
            payload,
        );
    });

    it('handles TASK_DELETION_REQUESTED', async () => {
        consumer.register();

        const deletionCallback = subscribe.mock.calls[2][2] as (message: {
            payload: unknown;
        }) => Promise<void>;

        const payload = {
            operationId: 'op-3',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'anton@example.com',
        };

        await deletionCallback({ payload });

        expect(handler.onTaskDeletionRequested).toHaveBeenCalledTimes(1);
        expect(handler.onTaskDeletionRequested).toHaveBeenCalledWith(payload);
    });

    it('handles TASK_LIST_REQUESTED and returns TASK_LIST_REPLIED payload', async () => {
        const tasks: ProjectTaskItemDto[] = [
            {
                id: 'task-1',
                name: 'Task 1',
                description: 'Description 1',
                status: 'OPEN',
                createdAt: '2026-03-11T09:13:00.000Z',
                userId: 'user-1',
                projectId: 'project-1',
            },
            {
                id: 'task-2',
                name: 'Task 2',
                description: 'Description 2',
                status: 'OPEN',
                createdAt: '2026-03-11T09:14:00.000Z',
                userId: 'user-1',
                projectId: 'project-1',
            },
        ];

        (
            taskService.getTasksByProject as jest.MockedFunction<
                TaskService['getTasksByProject']
            >
        ).mockResolvedValue(tasks);

        consumer.register();

        const replyCallback = respond.mock.calls[0][3] as (message: {
            payload: { projectId: string; userId: string };
        }) => Promise<unknown>;

        const payload = {
            projectId: 'project-1',
            userId: 'user-1',
        };

        const result = await replyCallback({ payload });

        expect(taskService.getTasksByProject).toHaveBeenCalledTimes(1);
        expect(taskService.getTasksByProject).toHaveBeenCalledWith(
            'project-1',
            'user-1',
        );

        expect(result).toEqual({
            ok: true,
            projectId: 'project-1',
            tasks,
        });
    });

    it('start calls bus.start with queue name', async () => {
        await consumer.start();

        expect(start).toHaveBeenCalledTimes(1);
        expect(start).toHaveBeenCalledWith(TaskEventConsumer.QUEUE);
    });

    it('stop calls bus.stop with queue name', async () => {
        await consumer.stop();

        expect(stop).toHaveBeenCalledTimes(1);
        expect(stop).toHaveBeenCalledWith(TaskEventConsumer.QUEUE);
    });
});
