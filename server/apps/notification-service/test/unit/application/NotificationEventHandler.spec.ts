import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from '@jest/globals';

import { EVENT_NAMES } from '../../../../../common/contracts/events/event-names.ts';
import type { EmailSender } from '../../../src/domain/ports/EmailSender.ts';
import type { SsePublisher } from '../../../src/domain/ports/SsePublisher.ts';
import { CLIENT_NOTIFICATION_EVENT_NAMES } from '../../../src/domain/types/ClientNotificationEvent.ts';
import { NotificationEventHandler } from '../../../src/application/NotificationEventHandler.ts';

describe('NotificationEventHandler', () => {
    const fallbackTo = 'fallback@test.com';

    const send = jest.fn<EmailSender['send']>().mockResolvedValue(undefined);
    const publishToUser = jest.fn<SsePublisher['publishToUser']>();

    let handler: NotificationEventHandler;
    let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        handler = new NotificationEventHandler(
            { send },
            { publishToUser },
            fallbackTo,
        );
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    it('publishes project.created notification to project owner', async () => {
        await handler.handle({
            name: EVENT_NAMES.PROJECT_CREATED,
            payload: {
                operationId: 'op-1',
                projectId: 'project-1',
                ownerId: 'user-1',
                ownerEmail: 'owner@test.com',
                name: 'Project',
                description: 'Description',
                status: 'OPEN',
                openTaskCount: 0,
            },
        });

        expect(publishToUser).toHaveBeenCalledTimes(1);
        expect(publishToUser).toHaveBeenCalledWith(
            'user-1',
            CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_CREATED,
            {
                type: CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_CREATED,
                projectId: 'project-1',
                refresh: ['projects'],
                message: 'Project created',
            },
        );
        expect(send).not.toHaveBeenCalled();
    });

    it('publishes project.closed notification and sends email', async () => {
        await handler.handle({
            name: EVENT_NAMES.PROJECT_CLOSED,
            payload: {
                operationId: 'op-2',
                projectId: 'project-1',
                ownerId: 'user-1',
                ownerEmail: 'owner@test.com',
            },
        });

        expect(publishToUser).toHaveBeenCalledWith(
            'user-1',
            CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_CLOSED,
            {
                type: CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_CLOSED,
                projectId: 'project-1',
                refresh: ['projects', 'project-details'],
                message: 'Project closed',
            },
        );

        expect(send).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledWith({
            to: 'owner@test.com',
            subject: 'Project closed',
            text: 'Project project-1 has been closed.',
            html: '<b>Project closed</b><br/>Project ID: project-1',
        });
    });

    it('uses fallback email when project.closed payload has no ownerEmail', async () => {
        await handler.handle({
            name: EVENT_NAMES.PROJECT_CLOSED,
            payload: {
                operationId: 'op-2',
                projectId: 'project-1',
                ownerId: 'user-1',
                ownerEmail: '',
            },
        });

        expect(send).toHaveBeenCalledWith(
            expect.objectContaining({ to: fallbackTo }),
        );
    });

    it('publishes task.created notification to task user', async () => {
        await handler.handle({
            name: EVENT_NAMES.TASK_CREATED,
            payload: {
                operationId: 'op-3',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@test.com',
                name: 'Task',
                description: 'Description',
                status: 'OPEN',
                createdAt: '2026-05-17T10:00:00.000Z',
            },
        });

        expect(publishToUser).toHaveBeenCalledWith(
            'user-1',
            CLIENT_NOTIFICATION_EVENT_NAMES.TASK_CREATED,
            {
                type: CLIENT_NOTIFICATION_EVENT_NAMES.TASK_CREATED,
                projectId: 'project-1',
                taskId: 'task-1',
                refresh: ['project-details'],
                message: 'Task created',
            },
        );
        expect(send).not.toHaveBeenCalled();
    });

    it('publishes task.updated without email when task is closed', async () => {
        await handler.handle({
            name: EVENT_NAMES.TASK_CLOSED,
            payload: {
                operationId: 'op-4',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@test.com',
            },
        });

        expect(publishToUser).toHaveBeenCalledWith(
            'user-1',
            CLIENT_NOTIFICATION_EVENT_NAMES.TASK_UPDATED,
            {
                type: CLIENT_NOTIFICATION_EVENT_NAMES.TASK_UPDATED,
                projectId: 'project-1',
                taskId: 'task-1',
                refresh: ['project-details'],
                message: 'Task updated',
            },
        );
        expect(send).not.toHaveBeenCalled();
    });

    it('publishes task.updated and sends email when task is reopened', async () => {
        await handler.handle({
            name: EVENT_NAMES.TASK_REOPENED,
            payload: {
                operationId: 'op-5',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@test.com',
            },
        });

        expect(publishToUser).toHaveBeenCalledWith(
            'user-1',
            CLIENT_NOTIFICATION_EVENT_NAMES.TASK_UPDATED,
            expect.objectContaining({
                type: CLIENT_NOTIFICATION_EVENT_NAMES.TASK_UPDATED,
                projectId: 'project-1',
                taskId: 'task-1',
            }),
        );
        expect(send).toHaveBeenCalledWith({
            to: 'user@test.com',
            subject: 'Task reopened',
            text: 'Task task-1 was reopened in project project-1.',
            html: '<b>Task reopened</b><br/>Task ID: task-1<br/>Project ID: project-1',
        });
    });

    it('uses fallback email when task.reopened payload has no userEmail', async () => {
        await handler.handle({
            name: EVENT_NAMES.TASK_REOPENED,
            payload: {
                operationId: 'op-5',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: '',
            },
        });

        expect(send).toHaveBeenCalledWith(
            expect.objectContaining({ to: fallbackTo }),
        );
    });

    it('publishes task.deleted notification', async () => {
        await handler.handle({
            name: EVENT_NAMES.TASK_DELETED,
            payload: {
                operationId: 'op-6',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@test.com',
                previousStatus: 'OPEN',
            },
        });

        expect(publishToUser).toHaveBeenCalledWith(
            'user-1',
            CLIENT_NOTIFICATION_EVENT_NAMES.TASK_DELETED,
            {
                type: CLIENT_NOTIFICATION_EVENT_NAMES.TASK_DELETED,
                projectId: 'project-1',
                taskId: 'task-1',
                refresh: ['project-details'],
                message: 'Task deleted',
            },
        );
    });

    it('publishes operation.rejected notification', async () => {
        await handler.handle({
            name: EVENT_NAMES.TASK_STATUS_TOGGLE_REJECTED,
            payload: {
                operationId: 'op-7',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@test.com',
                reason: 'Task not found',
            },
        });

        expect(publishToUser).toHaveBeenCalledWith(
            'user-1',
            CLIENT_NOTIFICATION_EVENT_NAMES.OPERATION_REJECTED,
            {
                type: CLIENT_NOTIFICATION_EVENT_NAMES.OPERATION_REJECTED,
                reason: 'Task not found',
                projectId: 'project-1',
                taskId: 'task-1',
                refresh: [],
                message: 'Operation rejected',
            },
        );
        expect(send).not.toHaveBeenCalled();
    });

    it('ignores request and reply events', async () => {
        await handler.handle({
            name: EVENT_NAMES.TASK_LIST_REQUESTED,
            payload: {
                projectId: 'project-1',
                userId: 'user-1',
            },
        });

        await handler.handle({
            name: EVENT_NAMES.TASK_LIST_REPLIED,
            payload: {
                ok: true,
                projectId: 'project-1',
                tasks: [],
            },
        });

        expect(publishToUser).not.toHaveBeenCalled();
        expect(send).not.toHaveBeenCalled();
    });
});
