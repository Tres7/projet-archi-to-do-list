import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { EVENT_NAMES } from '../../../../../../common/contracts/events/event-names.ts';
import type {
    TaskClosedPayload,
    TaskCreatedPayload,
    TaskDeletedPayload,
    TaskReopenedPayload,
} from '../../../../../../common/contracts/events/task.events.ts';
import type { MessageBus } from '../../../../../../common/messaging/MessageBus.ts';
import type { ProjectEventHandler } from '../../../../src/application/ProjectEventHandler.ts';
import { ProjectEventConsumer } from '../../../../src/infrastructure/messaging/ProjectEventConsumer.ts';

type BusMessage<TPayload> = {
    payload: TPayload;
};

type SubscribeHandler<TPayload = unknown> = (
    message: BusMessage<TPayload>,
) => Promise<void>;

describe('ProjectEventConsumer', () => {
    const subscribe =
        jest.fn<
            (
                queue: string,
                eventName: string,
                handler: SubscribeHandler,
            ) => void
        >();

    const start = jest
        .fn<(queue: string) => Promise<void>>()
        .mockResolvedValue(undefined);

    const stop = jest
        .fn<(queue: string) => Promise<void>>()
        .mockResolvedValue(undefined);

    const bus = {
        subscribe,
        start,
        stop,
    } as unknown as MessageBus;

    const handler = {
        onTaskCreated: jest
            .fn<(payload: TaskCreatedPayload) => Promise<void>>()
            .mockResolvedValue(undefined),

        onTaskClosed: jest
            .fn<(payload: TaskClosedPayload) => Promise<void>>()
            .mockResolvedValue(undefined),

        onTaskReopened: jest
            .fn<(payload: TaskReopenedPayload) => Promise<void>>()
            .mockResolvedValue(undefined),

        onTaskDeleted: jest
            .fn<(payload: TaskDeletedPayload) => Promise<void>>()
            .mockResolvedValue(undefined),
    } as unknown as ProjectEventHandler;

    let consumer: ProjectEventConsumer;

    beforeEach(() => {
        jest.clearAllMocks();
        consumer = new ProjectEventConsumer(bus, handler);
    });

    function getCallback<TPayload>(index: number): SubscribeHandler<TPayload> {
        return subscribe.mock.calls[index]?.[2] as SubscribeHandler<TPayload>;
    }

    describe('register', () => {
        it('should subscribe to all task events', () => {
            consumer.register();

            expect(subscribe).toHaveBeenCalledTimes(4);

            expect(subscribe).toHaveBeenNthCalledWith(
                1,
                ProjectEventConsumer.QUEUE,
                EVENT_NAMES.TASK_CREATED,
                expect.any(Function),
            );

            expect(subscribe).toHaveBeenNthCalledWith(
                2,
                ProjectEventConsumer.QUEUE,
                EVENT_NAMES.TASK_CLOSED,
                expect.any(Function),
            );

            expect(subscribe).toHaveBeenNthCalledWith(
                3,
                ProjectEventConsumer.QUEUE,
                EVENT_NAMES.TASK_REOPENED,
                expect.any(Function),
            );

            expect(subscribe).toHaveBeenNthCalledWith(
                4,
                ProjectEventConsumer.QUEUE,
                EVENT_NAMES.TASK_DELETED,
                expect.any(Function),
            );
        });

        it('should call handler.onTaskCreated with payload', async () => {
            consumer.register();

            const callback = getCallback<TaskCreatedPayload>(0);

            const payload: TaskCreatedPayload = {
                operationId: 'op-1',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@example.com',
                name: 'Task 1',
                description: 'Description 1',
                status: 'OPEN',
                createdAt: new Date().toISOString(),
            };

            await callback({ payload });

            expect(handler.onTaskCreated).toHaveBeenCalledTimes(1);
            expect(handler.onTaskCreated).toHaveBeenCalledWith(payload);
        });

        it('should call handler.onTaskClosed with payload', async () => {
            consumer.register();

            const callback = getCallback<TaskClosedPayload>(1);

            const payload: TaskClosedPayload = {
                operationId: 'op-2',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@example.com',
            };

            await callback({ payload });

            expect(handler.onTaskClosed).toHaveBeenCalledTimes(1);
            expect(handler.onTaskClosed).toHaveBeenCalledWith(payload);
        });

        it('should call handler.onTaskReopened with payload', async () => {
            consumer.register();

            const callback = getCallback<TaskReopenedPayload>(2);

            const payload: TaskReopenedPayload = {
                operationId: 'op-3',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@example.com',
            };

            await callback({ payload });

            expect(handler.onTaskReopened).toHaveBeenCalledTimes(1);
            expect(handler.onTaskReopened).toHaveBeenCalledWith(payload);
        });

        it('should call handler.onTaskDeleted with payload', async () => {
            consumer.register();

            const callback = getCallback<TaskDeletedPayload>(3);

            const payload: TaskDeletedPayload = {
                operationId: 'op-4',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@example.com',
                previousStatus: 'OPEN',
            };

            await callback({ payload });

            expect(handler.onTaskDeleted).toHaveBeenCalledTimes(1);
            expect(handler.onTaskDeleted).toHaveBeenCalledWith(payload);
        });
    });

    describe('start', () => {
        it('should start bus with project queue', async () => {
            await consumer.start();

            expect(start).toHaveBeenCalledTimes(1);
            expect(start).toHaveBeenCalledWith(ProjectEventConsumer.QUEUE);
        });
    });

    describe('stop', () => {
        it('should stop bus with project queue', async () => {
            await consumer.stop();

            expect(stop).toHaveBeenCalledTimes(1);
            expect(stop).toHaveBeenCalledWith(ProjectEventConsumer.QUEUE);
        });
    });
});
