import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { MessageBus } from '../../../../../common/messaging/MessageBus.ts';
import type { TaskRepository } from '../../../src/domain/repositories/TaskRepository.ts';
import { Task } from '../../../src/domain/entities/Task.ts';

const publishTaskCreated = jest.fn();
const publishTaskCreationRejected = jest.fn();
const publishTaskClosed = jest.fn();
const publishTaskReopened = jest.fn();
const publishTaskToggleRejected = jest.fn();
const publishTaskDeleted = jest.fn();
const publishTaskDeletionRejected = jest.fn();

jest.unstable_mockModule(
    '../../../src/application/task-event-publisher.ts',
    () => ({
        publishTaskCreated,
        publishTaskCreationRejected,
        publishTaskClosed,
        publishTaskReopened,
        publishTaskToggleRejected,
        publishTaskDeleted,
        publishTaskDeletionRejected,
    }),
);

const { TaskEventHandler } =
    await import('../../../src/application/TaskEventHandler.ts');

type RepoMock = {
    save: ReturnType<typeof jest.fn>;
    findById: ReturnType<typeof jest.fn>;
    delete: ReturnType<typeof jest.fn>;
};

describe('TaskEventHandler', () => {
    let taskRepository: RepoMock;
    let bus: MessageBus;
    let handler: InstanceType<typeof TaskEventHandler>;

    beforeEach(() => {
        jest.clearAllMocks();

        taskRepository = {
            save: jest.fn(),
            findById: jest.fn(),
            delete: jest.fn(),
        };

        bus = {} as MessageBus;

        handler = new TaskEventHandler(
            taskRepository as unknown as TaskRepository,
            bus,
        );
    });

    it('creates task and publishes task.created', async () => {
        const event = {
            operationId: 'op-1',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'user@test.com',
            name: 'Learn tests',
            description: 'Write unit tests',
        };

        await handler.onTaskCreationRequested(event);

        expect(taskRepository.save).toHaveBeenCalledTimes(1);

        const savedTask = taskRepository.save.mock.calls[0][0] as Task;
        expect(savedTask.toPrimitives()).toMatchObject({
            id: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            name: 'Learn tests',
            description: 'Write unit tests',
        });

        expect(publishTaskCreated).toHaveBeenCalledWith(
            bus,
            'project-service',
            expect.objectContaining({
                operationId: 'op-1',
                userEmail: 'user@test.com',
                task: expect.any(Task),
            }),
        );

        expect(publishTaskCreationRejected).not.toHaveBeenCalled();
    });

    it('publishes task creation rejected when repository.save fails', async () => {
        taskRepository.save.mockRejectedValue(new Error('DB error'));

        const event = {
            operationId: 'op-1',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'user@test.com',
            name: 'Learn tests',
            description: 'Write unit tests',
        };

        await handler.onTaskCreationRequested(event);

        expect(publishTaskCreationRejected).toHaveBeenCalledWith(
            bus,
            'notification-service',
            expect.objectContaining({
                operationId: 'op-1',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@test.com',
                reason: 'DB error',
            }),
        );

        expect(publishTaskCreated).not.toHaveBeenCalled();
    });

    it('closes an OPEN task and publishes task.closed', async () => {
        const task = Task.create({
            id: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            name: 'Task',
            description: 'Desc',
        });

        taskRepository.findById.mockResolvedValue(task);

        const event = {
            operationId: 'op-2',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'user@test.com',
        };

        await handler.onTaskStatusToggleRequested(event);

        expect(taskRepository.findById).toHaveBeenCalledWith('task-1');
        expect(taskRepository.save).toHaveBeenCalledWith(task);
        expect(task.toPrimitives().status).toBe('DONE');

        expect(publishTaskClosed).toHaveBeenCalledWith(
            bus,
            'project-service',
            expect.objectContaining({
                operationId: 'op-2',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@test.com',
            }),
        );

        expect(publishTaskReopened).not.toHaveBeenCalled();
        expect(publishTaskToggleRejected).not.toHaveBeenCalled();
    });

    it('reopens a DONE task and publishes task.reopened', async () => {
        const task = Task.create({
            id: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            name: 'Task',
            description: 'Desc',
        });
        task.toggleStatus(); // DONE

        taskRepository.findById.mockResolvedValue(task);

        const event = {
            operationId: 'op-3',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'user@test.com',
        };

        await handler.onTaskStatusToggleRequested(event);

        expect(taskRepository.save).toHaveBeenCalledWith(task);
        expect(task.toPrimitives().status).toBe('OPEN');

        expect(publishTaskReopened).toHaveBeenCalledWith(
            bus,
            'project-service',
            expect.objectContaining({
                operationId: 'op-3',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@test.com',
            }),
        );

        expect(publishTaskClosed).not.toHaveBeenCalled();
    });

    it('publishes task toggle rejected when task does not exist', async () => {
        taskRepository.findById.mockResolvedValue(undefined);

        const event = {
            operationId: 'op-4',
            taskId: 'missing-task',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'user@test.com',
        };

        await handler.onTaskStatusToggleRequested(event);

        expect(taskRepository.save).not.toHaveBeenCalled();

        expect(publishTaskToggleRejected).toHaveBeenCalledWith(
            bus,
            'notification-service',
            expect.objectContaining({
                operationId: 'op-4',
                taskId: 'missing-task',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@test.com',
                reason: 'Task not found',
            }),
        );
    });

    it('publishes task toggle rejected when task belongs to another user', async () => {
        const task = Task.create({
            id: 'task-1',
            projectId: 'project-1',
            userId: 'another-user',
            name: 'Task',
            description: 'Desc',
        });

        taskRepository.findById.mockResolvedValue(task);

        const event = {
            operationId: 'op-5',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'user@test.com',
        };

        await handler.onTaskStatusToggleRequested(event);

        expect(taskRepository.save).not.toHaveBeenCalled();

        expect(publishTaskToggleRejected).toHaveBeenCalledWith(
            bus,
            'notification-service',
            expect.objectContaining({
                reason: 'Forbidden',
            }),
        );
    });

    it('deletes task and publishes task.deleted', async () => {
        const task = Task.create({
            id: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            name: 'Task',
            description: 'Desc',
        });

        taskRepository.findById.mockResolvedValue(task);

        const event = {
            operationId: 'op-6',
            taskId: 'task-1',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'user@test.com',
        };

        await handler.onTaskDeletionRequested(event);

        expect(taskRepository.delete).toHaveBeenCalledWith('task-1');

        expect(publishTaskDeleted).toHaveBeenCalledWith(
            bus,
            'project-service',
            expect.objectContaining({
                operationId: 'op-6',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@test.com',
                previousStatus: 'OPEN',
            }),
        );

        expect(publishTaskDeletionRejected).not.toHaveBeenCalled();
    });

    it('publishes task deletion rejected when task does not exist', async () => {
        taskRepository.findById.mockResolvedValue(undefined);

        const event = {
            operationId: 'op-7',
            taskId: 'missing-task',
            projectId: 'project-1',
            userId: 'user-1',
            userEmail: 'user@test.com',
        };

        await handler.onTaskDeletionRequested(event);

        expect(taskRepository.delete).not.toHaveBeenCalled();

        expect(publishTaskDeletionRejected).toHaveBeenCalledWith(
            bus,
            'notification-service',
            expect.objectContaining({
                operationId: 'op-7',
                taskId: 'missing-task',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user@test.com',
                reason: 'Task not found',
            }),
        );
    });
});
