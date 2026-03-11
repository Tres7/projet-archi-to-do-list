import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import type { MessageBus } from '../../../../../common/messaging/MessageBus.ts';
import type { ProjectRepository } from '../../../src/domain/repositories/ProjectRepository.ts';
import { ProjectTaskService } from '../../../src/application/ProjectTaskService.ts';
import { Project } from '../../../src/domain/entities/Project.ts';
import { EVENT_NAMES } from '../../../../../common/contracts/events/event-names.ts';
import { NotFoundError } from '../../../../../common/errors/NotFoundError.ts';
import { UnauthorizedError } from '../../../../../common/errors/UnauthorizedError.ts';

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

let service: ProjectTaskService;

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
    service = new ProjectTaskService(repoMock, bus);
});

describe('ProjectTaskService', () => {
    describe('requestCreateTask', () => {
        it('should publish task creation requested event and return accepted response', async () => {
            const project = createProject();
            repoMock.findById.mockResolvedValueOnce(project);

            const result = await service.requestCreateTask({
                projectId: 'project-1',
                userId: 'user-1',
                userEmail: 'user-1@example.com',
                name: 'New Task',
                description: 'Task Description',
            });

            expect(repoMock.findById).toHaveBeenCalledWith('project-1');

            expect(bus.publish).toHaveBeenCalledWith(
                'task-service',
                EVENT_NAMES.TASK_CREATION_REQUESTED,
                expect.objectContaining({
                    operationId: expect.any(String),
                    taskId: expect.any(String),
                    projectId: 'project-1',
                    userId: 'user-1',
                    userEmail: 'user-1@example.com',
                    name: 'New Task',
                    description: 'Task Description',
                }),
            );

            expect(result).toEqual({
                accepted: true,
                operationId: expect.any(String),
                resourceId: expect.any(String),
            });
        });

        it('should throw NotFoundError when project does not exist', async () => {
            repoMock.findById.mockResolvedValueOnce(null);

            await expect(
                service.requestCreateTask({
                    projectId: 'project-1',
                    userId: 'user-1',
                    userEmail: 'user-1@example.com',
                    name: 'New Task',
                    description: 'Task Description',
                }),
            ).rejects.toBeInstanceOf(NotFoundError);

            expect(bus.publish).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedError when user is not owner', async () => {
            const project = createProject();
            repoMock.findById.mockResolvedValueOnce(project);

            await expect(
                service.requestCreateTask({
                    projectId: 'project-1',
                    userId: 'user-2',
                    userEmail: 'user-2@example.com',
                    name: 'New Task',
                    description: 'Task Description',
                }),
            ).rejects.toBeInstanceOf(UnauthorizedError);

            expect(bus.publish).not.toHaveBeenCalled();
        });

        it('should throw when project is closed', async () => {
            const project = createProject();
            project.close();
            repoMock.findById.mockResolvedValueOnce(project);

            await expect(
                service.requestCreateTask({
                    projectId: 'project-1',
                    userId: 'user-1',
                    userEmail: 'user-1@example.com',
                    name: 'New Task',
                    description: 'Task Description',
                }),
            ).rejects.toThrow();

            expect(bus.publish).not.toHaveBeenCalled();
        });
    });

    describe('requestToggleTaskStatus', () => {
        it('should publish task status toggle requested event and return accepted response', async () => {
            const project = createProject();
            repoMock.findById.mockResolvedValueOnce(project);

            const result = await service.requestToggleTaskStatus({
                projectId: 'project-1',
                taskId: 'task-1',
                userId: 'user-1',
                userEmail: 'user-1@example.com',
            });

            expect(repoMock.findById).toHaveBeenCalledWith('project-1');

            expect(bus.publish).toHaveBeenCalledWith(
                'task-service',
                EVENT_NAMES.TASK_STATUS_TOGGLE_REQUESTED,
                expect.objectContaining({
                    operationId: expect.any(String),
                    taskId: 'task-1',
                    projectId: 'project-1',
                    userId: 'user-1',
                    userEmail: 'user-1@example.com',
                }),
            );

            expect(result).toEqual({
                accepted: true,
                operationId: expect.any(String),
                resourceId: 'task-1',
            });
        });

        it('should throw NotFoundError when project does not exist', async () => {
            repoMock.findById.mockResolvedValueOnce(null);

            await expect(
                service.requestToggleTaskStatus({
                    projectId: 'project-1',
                    taskId: 'task-1',
                    userId: 'user-1',
                    userEmail: 'user-1@example.com',
                }),
            ).rejects.toBeInstanceOf(NotFoundError);

            expect(bus.publish).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedError when user is not owner', async () => {
            const project = createProject();
            repoMock.findById.mockResolvedValueOnce(project);

            await expect(
                service.requestToggleTaskStatus({
                    projectId: 'project-1',
                    taskId: 'task-1',
                    userId: 'user-2',
                    userEmail: 'user-2@example.com',
                }),
            ).rejects.toBeInstanceOf(UnauthorizedError);

            expect(bus.publish).not.toHaveBeenCalled();
        });

        it('should throw when project is closed', async () => {
            const project = createProject();
            project.close();
            repoMock.findById.mockResolvedValueOnce(project);

            await expect(
                service.requestToggleTaskStatus({
                    projectId: 'project-1',
                    taskId: 'task-1',
                    userId: 'user-1',
                    userEmail: 'user-1@example.com',
                }),
            ).rejects.toThrow();

            expect(bus.publish).not.toHaveBeenCalled();
        });
    });

    describe('requestDeleteTask', () => {
        it('should publish task deletion requested event and return accepted response', async () => {
            const project = createProject();
            repoMock.findById.mockResolvedValueOnce(project);

            const result = await service.requestDeleteTask({
                projectId: 'project-1',
                taskId: 'task-1',
                userId: 'user-1',
                userEmail: 'user-1@example.com',
            });

            expect(repoMock.findById).toHaveBeenCalledWith('project-1');

            expect(bus.publish).toHaveBeenCalledWith(
                'task-service',
                EVENT_NAMES.TASK_DELETION_REQUESTED,
                expect.objectContaining({
                    operationId: expect.any(String),
                    taskId: 'task-1',
                    projectId: 'project-1',
                    userId: 'user-1',
                    userEmail: 'user-1@example.com',
                }),
            );

            expect(result).toEqual({
                accepted: true,
                operationId: expect.any(String),
                resourceId: 'task-1',
            });
        });

        it('should throw NotFoundError when project does not exist', async () => {
            repoMock.findById.mockResolvedValueOnce(null);

            await expect(
                service.requestDeleteTask({
                    projectId: 'project-1',
                    taskId: 'task-1',
                    userId: 'user-1',
                    userEmail: 'user-1@example.com',
                }),
            ).rejects.toBeInstanceOf(NotFoundError);

            expect(bus.publish).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedError when user is not owner', async () => {
            const project = createProject();
            repoMock.findById.mockResolvedValueOnce(project);

            await expect(
                service.requestDeleteTask({
                    projectId: 'project-1',
                    taskId: 'task-1',
                    userId: 'user-2',
                    userEmail: 'user-2@example.com',
                }),
            ).rejects.toBeInstanceOf(UnauthorizedError);

            expect(bus.publish).not.toHaveBeenCalled();
        });

        it('should throw when project is closed', async () => {
            const project = createProject();
            project.close();
            repoMock.findById.mockResolvedValueOnce(project);

            await expect(
                service.requestDeleteTask({
                    projectId: 'project-1',
                    taskId: 'task-1',
                    userId: 'user-1',
                    userEmail: 'user-1@example.com',
                }),
            ).rejects.toThrow();

            expect(bus.publish).not.toHaveBeenCalled();
        });
    });
});
