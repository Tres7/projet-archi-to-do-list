import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import type { MessageBus } from '../../../../../common/messaging/MessageBus.ts';
import type { ProjectRepository } from '../../../src/domain/repositories/ProjectRepository.ts';
import { ProjectEventHandler } from '../../../src/application/ProjectEventHandler.ts';
import { Project } from '../../../src/domain/entities/Project.ts';
import { EVENT_NAMES } from '../../../../../common/contracts/events/event-names.ts';
import { ProjectStatusValues } from '../../../src/domain/value-objects/project-status.vo.ts';
import type {
    TaskClosedPayload,
    TaskCreatedPayload,
} from '../../../../../common/contracts/events/task.events.ts';

const repoMock: jest.Mocked<ProjectRepository> = {
    findById: jest.fn(),
    findByOwnerId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
};

const publish = jest.fn<(...args: any[]) => Promise<void>>();

const bus = {
    publish,
} as unknown as MessageBus;

let handler: ProjectEventHandler;

function createProject() {
    return Project.create({
        id: 'project-1',
        ownerId: 'user-1',
        name: 'Test Project',
        description: 'Test Description',
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    handler = new ProjectEventHandler(repoMock, bus);
});

describe('ProjectEventHandler', () => {
    describe('onTaskCreated', () => {
        it('should increase open task count, save project and publish event', async () => {
            const project = createProject();
            repoMock.findById.mockResolvedValueOnce(project);

            const event: TaskCreatedPayload = {
                operationId: 'op-1',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user-1@example.com',
                name: 'Task 1',
                description: 'Task description',
                status: 'OPEN',
                createdAt: new Date().toISOString(),
            };

            await handler.onTaskCreated(event);

            expect(repoMock.findById).toHaveBeenCalledWith('project-1');
            expect(project.toPrimitives().openTaskCount).toBe(1);
            expect(repoMock.save).toHaveBeenCalledWith(project);

            expect(bus.publish).toHaveBeenCalledWith(
                'notification-service',
                EVENT_NAMES.TASK_CREATED,
                event,
            );
        });

        it('should do nothing when project is not found', async () => {
            repoMock.findById.mockResolvedValueOnce(null);

            const event: TaskCreatedPayload = {
                operationId: 'op-1',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user-1@example.com',
                name: 'Task 1',
                description: 'Task description',
                status: 'OPEN',
                createdAt: new Date().toISOString(),
            };

            await handler.onTaskCreated(event);

            expect(repoMock.save).not.toHaveBeenCalled();
            expect(bus.publish).not.toHaveBeenCalled();
        });
    });

    describe('onTaskClosed', () => {
        it('should decrease open task count, save project and publish event', async () => {
            const project = createProject();
            project.increaseOpenTaskCount();
            repoMock.findById.mockResolvedValueOnce(project);

            const event: TaskClosedPayload = {
                operationId: 'op-1',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user-1@example.com',
            };

            await handler.onTaskClosed(event);

            expect(repoMock.findById).toHaveBeenCalledWith('project-1');
            expect(project.toPrimitives().openTaskCount).toBe(0);
            expect(repoMock.save).toHaveBeenCalledWith(project);

            expect(bus.publish).toHaveBeenCalledWith(
                'notification-service',
                EVENT_NAMES.TASK_CLOSED,
                event,
            );
        });

        it('should do nothing when project is not found', async () => {
            repoMock.findById.mockResolvedValueOnce(null);

            const event = {
                operationId: 'op-1',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user-1@example.com',
                status: 'CLOSED',
            };

            await handler.onTaskClosed(event);

            expect(repoMock.save).not.toHaveBeenCalled();
            expect(bus.publish).not.toHaveBeenCalled();
        });
    });

    describe('onTaskReopened', () => {
        it('should increase open task count, save project and publish event', async () => {
            const project = createProject();
            repoMock.findById.mockResolvedValueOnce(project);

            const event = {
                operationId: 'op-1',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user-1@example.com',
                status: 'OPEN',
            };

            await handler.onTaskReopened(event);

            expect(repoMock.findById).toHaveBeenCalledWith('project-1');
            expect(project.toPrimitives().openTaskCount).toBe(1);
            expect(repoMock.save).toHaveBeenCalledWith(project);

            expect(bus.publish).toHaveBeenCalledWith(
                'notification-service',
                EVENT_NAMES.TASK_REOPENED,
                event,
            );
        });

        it('should do nothing when project is not found', async () => {
            repoMock.findById.mockResolvedValueOnce(null);

            const event = {
                operationId: 'op-1',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user-1@example.com',
                status: 'OPEN',
            };

            await handler.onTaskReopened(event);

            expect(repoMock.save).not.toHaveBeenCalled();
            expect(bus.publish).not.toHaveBeenCalled();
        });
    });

    describe('onTaskDeleted', () => {
        it('should decrease open task count and publish event when deleted task was open', async () => {
            const project = createProject();
            project.increaseOpenTaskCount();
            repoMock.findById.mockResolvedValueOnce(project);

            const event = {
                operationId: 'op-1',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user-1@example.com',
                previousStatus: 'OPEN' as const,
            };

            await handler.onTaskDeleted(event);

            expect(repoMock.findById).toHaveBeenCalledWith('project-1');
            expect(project.toPrimitives().openTaskCount).toBe(0);
            expect(repoMock.save).toHaveBeenCalledWith(project);

            expect(bus.publish).toHaveBeenCalledWith(
                'notification-service',
                EVENT_NAMES.TASK_DELETED,
                event,
            );
        });

        it('should not save project when deleted task was already closed', async () => {
            const project = createProject();
            repoMock.findById.mockResolvedValueOnce(project);

            const event = {
                operationId: 'op-1',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user-1@example.com',
                previousStatus: 'DONE' as const,
            };

            await handler.onTaskDeleted(event);

            expect(repoMock.findById).toHaveBeenCalledWith('project-1');
            expect(project.toPrimitives().openTaskCount).toBe(0);
            expect(repoMock.save).not.toHaveBeenCalled();

            expect(bus.publish).toHaveBeenCalledWith(
                'notification-service',
                EVENT_NAMES.TASK_DELETED,
                event,
            );
        });

        it('should do nothing when project is not found', async () => {
            repoMock.findById.mockResolvedValueOnce(null);

            const event = {
                operationId: 'op-1',
                taskId: 'task-1',
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user-1@example.com',
                previousStatus: 'OPEN' as const,
            };

            await handler.onTaskDeleted(event);

            expect(repoMock.save).not.toHaveBeenCalled();
            expect(bus.publish).not.toHaveBeenCalled();
        });
    });
});
