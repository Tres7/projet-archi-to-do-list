import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { EVENT_NAMES } from '../../../../../../common/contracts/events/event-names.ts';
import type { MessageBus } from '../../../../../../common/messaging/MessageBus.ts';
import type { NotificationEventHandler } from '../../../../src/application/NotificationEventHandler.ts';
import { NotificationBusRegistrar } from '../../../../src/infrastructure/messaging/NotificationBusRegistrar.ts';

type BusMessage<TPayload> = {
    payload: TPayload;
};

type SubscribeHandler<TPayload = unknown> = (
    message: BusMessage<TPayload>,
) => Promise<void>;

describe('NotificationBusRegistrar', () => {
    const subscribe =
        jest.fn<
            (
                queue: string,
                eventName: string,
                handler: SubscribeHandler,
            ) => void
        >();

    const bus = {
        subscribe,
    } as unknown as MessageBus;

    const handle = jest.fn<NotificationEventHandler['handle']>();

    const handler = {
        handle,
    } as unknown as NotificationEventHandler;

    let registrar: NotificationBusRegistrar;

    beforeEach(() => {
        jest.clearAllMocks();
        handle.mockResolvedValue(undefined);
        registrar = new NotificationBusRegistrar(bus, handler);
    });

    function getCallback<TPayload>(index: number): SubscribeHandler<TPayload> {
        return subscribe.mock.calls[index]?.[2] as SubscribeHandler<TPayload>;
    }

    it('subscribes notification queue to supported events', () => {
        registrar.register();

        const expectedEvents = [
            EVENT_NAMES.PROJECT_CREATED,
            EVENT_NAMES.PROJECT_CLOSED,
            EVENT_NAMES.PROJECT_DELETED,
            EVENT_NAMES.TASK_CREATED,
            EVENT_NAMES.TASK_CLOSED,
            EVENT_NAMES.TASK_REOPENED,
            EVENT_NAMES.TASK_DELETED,
            EVENT_NAMES.TASK_CREATION_REJECTED,
            EVENT_NAMES.TASK_STATUS_TOGGLE_REJECTED,
            EVENT_NAMES.TASK_DELETION_REJECTED,
        ];

        expect(subscribe).toHaveBeenCalledTimes(expectedEvents.length);

        expectedEvents.forEach((eventName, index) => {
            expect(subscribe).toHaveBeenNthCalledWith(
                index + 1,
                NotificationBusRegistrar.QUEUE,
                eventName,
                expect.any(Function),
            );
        });
    });

    it('passes subscribed payloads to notification handler with event name', async () => {
        registrar.register();

        const payload = {
            operationId: 'op-1',
            projectId: 'project-1',
            ownerId: 'user-1',
            ownerEmail: 'owner@test.com',
            name: 'Project',
            description: 'Description',
            status: 'OPEN',
            openTaskCount: 0,
        };

        await getCallback<typeof payload>(0)({ payload });

        expect(handle).toHaveBeenCalledTimes(1);
        expect(handle.mock.calls[0]?.[0]).toEqual({
            name: EVENT_NAMES.PROJECT_CREATED,
            payload,
        });
    });

    it('passes task rejection payloads to notification handler', async () => {
        registrar.register();

        const payload = {
            operationId: 'op-2',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'user@test.com',
            reason: 'Task not found',
        };

        await getCallback<typeof payload>(8)({ payload });

        expect(handle.mock.calls[0]?.[0]).toEqual({
            name: EVENT_NAMES.TASK_STATUS_TOGGLE_REJECTED,
            payload,
        });
    });
});
