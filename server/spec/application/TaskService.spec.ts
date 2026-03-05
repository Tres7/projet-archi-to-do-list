import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import type { TaskRepository } from '../../src/modules/task/domain/repositories/TaskRepository';
import type { EventPublisher } from '../../src/infrastructure/messaging/bullmq/bullmq.types';
import { TaskService } from '../../src/modules/task/application/TaskService';
import { Task } from '../../src/modules/task/domain/entities/Task';

const repoMock: jest.Mocked<TaskRepository> = {
    getItems: jest.fn(),
    getItem: jest.fn(),
    storeItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
};

const eventsMock: jest.Mocked<EventPublisher> = {
    publish: jest.fn(),
};

const USER_ID = 'user-abc';
const PROJECT_ID = 'project-xyz';
let service: TaskService;

beforeEach(() => {
    jest.clearAllMocks();
    service = new TaskService(repoMock, eventsMock);
});

describe('TaskService', () => {
    describe('createTask', () => {
        it('stores the task and returns it', async () => {
            repoMock.storeItem.mockResolvedValue(undefined);

            const result = await service.createTask('Ma tâche', 'Une description', USER_ID, PROJECT_ID);

            expect(repoMock.storeItem).toHaveBeenCalledTimes(1);
            expect(repoMock.storeItem).toHaveBeenCalledWith(result);
            expect(result).toBeInstanceOf(Task);
        });

        it('creates the task with the correct name, description, userId and projectId', async () => {
            repoMock.storeItem.mockResolvedValue(undefined);

            const result = await service.createTask('Ma tâche', 'Une description', USER_ID, PROJECT_ID);

            expect(result.name).toBe('Ma tâche');
            expect(result.description).toBe('Une description');
            expect(result.userId).toBe(USER_ID);
            expect(result.projectId).toBe(PROJECT_ID);
        });

        it('creates the task with status opened', async () => {
            repoMock.storeItem.mockResolvedValue(undefined);

            const result = await service.createTask('Ma tâche', 'Une description', USER_ID, PROJECT_ID);

            expect(result.status).toBe('opened');
        });

        it('assigns a unique id to the task', async () => {
            repoMock.storeItem.mockResolvedValue(undefined);

            const a = await service.createTask('Tâche A', 'desc', USER_ID, PROJECT_ID);
            const b = await service.createTask('Tâche B', 'desc', USER_ID, PROJECT_ID);

            expect(a.id).toBeDefined();
            expect(b.id).toBeDefined();
            expect(a.id).not.toBe(b.id);
        });

        it('publishes a task.created event', async () => {
            repoMock.storeItem.mockResolvedValue(undefined);
            eventsMock.publish.mockResolvedValue({} as any);

            const result = await service.createTask('Ma tâche', 'Une description', USER_ID, PROJECT_ID);

            expect(eventsMock.publish).toHaveBeenCalledTimes(1);
            expect(eventsMock.publish).toHaveBeenCalledWith('task.created', expect.objectContaining({
                taskId: result.id,
                name: result.name,
                userId: USER_ID,
            }));
        });
    });

    describe('updateTask', () => {
        it('throws if task not found', async () => {
            repoMock.getItem.mockResolvedValue(undefined);

            await expect(
                service.updateTask('nonexistent', USER_ID, undefined, undefined, 'closed')
            ).rejects.toThrow('Resource not found');
        });

        it('throws if user is unauthorized', async () => {
            repoMock.getItem.mockResolvedValue(
                new Task('t1', 'Ma tâche', 'desc', 'opened', new Date(), 'other-user', PROJECT_ID)
            );

            await expect(
                service.updateTask('t1', USER_ID, undefined, undefined, 'closed')
            ).rejects.toThrow('Unauthorized');
        });

        it('publishes task.closed when status changes to closed', async () => {
            repoMock.getItem.mockResolvedValue(
                new Task('t1', 'Ma tâche', 'desc', 'opened', new Date(), USER_ID, PROJECT_ID)
            );
            repoMock.updateItem.mockResolvedValue(undefined);
            repoMock.getItem.mockResolvedValueOnce(
                new Task('t1', 'Ma tâche', 'desc', 'opened', new Date(), USER_ID, PROJECT_ID)
            ).mockResolvedValueOnce(
                new Task('t1', 'Ma tâche', 'desc', 'closed', new Date(), USER_ID, PROJECT_ID)
            );
            eventsMock.publish.mockResolvedValue({} as any);

            await service.updateTask('t1', USER_ID, undefined, undefined, 'closed');

            expect(eventsMock.publish).toHaveBeenCalledWith('task.closed', expect.objectContaining({
                taskId: 't1',
                userId: USER_ID,
            }));
        });

        it('publishes task.reopened when status changes to reopened', async () => {
            repoMock.getItem.mockResolvedValueOnce(
                new Task('t1', 'Ma tâche', 'desc', 'closed', new Date(), USER_ID, PROJECT_ID)
            ).mockResolvedValueOnce(
                new Task('t1', 'Ma tâche', 'desc', 'reopened', new Date(), USER_ID, PROJECT_ID)
            );
            repoMock.updateItem.mockResolvedValue(undefined);
            eventsMock.publish.mockResolvedValue({} as any);

            await service.updateTask('t1', USER_ID, undefined, undefined, 'reopened');

            expect(eventsMock.publish).toHaveBeenCalledWith('task.reopened', expect.objectContaining({
                taskId: 't1',
                userId: USER_ID,
            }));
        });
    });

});
