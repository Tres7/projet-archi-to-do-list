import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import type { MessageBus } from '../../../../../common/messaging/MessageBus.ts';
import { ProjectService } from '../../../src/application/ProjectService.ts';
import type { ProjectRepository } from '../../../src/domain/repositories/ProjectRepository.ts';
import { EVENT_NAMES } from '../../../../../common/contracts/events/event-names.ts';
import { Project } from '../../../src/domain/entities/Project.ts';
import { NotFoundError } from '../../../../../common/errors/NotFoundError.ts';
import { UnauthorizedError } from '../../../../../common/errors/UnauthorizedError.ts';

const repoMock: jest.Mocked<ProjectRepository> = {
    findById: jest.fn(),
    findByOwnerId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
};

const publish = jest.fn<(...args: any[]) => Promise<void>>();
const request = jest.fn<(...args: any[]) => Promise<any>>();

const bus = {
    publish,
    request,
} as unknown as MessageBus;

let service: ProjectService;

beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectService(repoMock, bus);
});

describe('ProjectService', () => {
    it('should create a project and publish event', async () => {
        await service.createProject({
            ownerId: 'user-1',
            ownerEmail: 'user-1@example.com',
            name: 'New Project',
            description: 'Project Description',
        });

        expect(repoMock.save).toHaveBeenCalledTimes(1);

        expect(bus.publish).toHaveBeenCalledWith(
            'notification-service',
            EVENT_NAMES.PROJECT_CREATED,
            expect.objectContaining({
                operationId: expect.any(String),
                ownerEmail: 'user-1@example.com',
                ownerId: 'user-1',
                name: 'New Project',
                description: 'Project Description',
                projectId: expect.any(String),
                status: 'OPEN',
                openTaskCount: 0,
            }),
        );
    });

    it('should handle errors during project creation', async () => {
        repoMock.save.mockRejectedValueOnce(new Error('DB error'));

        await expect(
            service.createProject({
                ownerId: 'user-1',
                ownerEmail: 'user-1@example.com',
                name: 'New Project',
                description: 'Project Description',
            }),
        ).rejects.toThrow('Failed to create project');
    });

    it('should close a project and publish event', async () => {
        const project = Project.create({
            id: 'project-1',
            ownerId: 'user-1',
            name: 'Existing Project',
            description: 'Existing Description',
        });

        repoMock.findById.mockResolvedValueOnce(project);

        await service.closeProject({
            projectId: 'project-1',
            ownerId: 'user-1',
            ownerEmail: 'user-1@example.com',
        });
        expect(repoMock.save).toHaveBeenCalledTimes(1);

        expect(bus.publish).toHaveBeenCalledWith(
            'notification-service',
            EVENT_NAMES.PROJECT_CLOSED,
            expect.objectContaining({
                operationId: expect.any(String),
                projectId: 'project-1',
                ownerId: 'user-1',
                ownerEmail: 'user-1@example.com',
            }),
        );
    });

    it('should handle errors during project closing', async () => {
        repoMock.findById.mockResolvedValueOnce(null);

        await expect(
            service.closeProject({
                projectId: 'project-1',
                ownerId: 'user-1',
                ownerEmail: 'user-1@example.com',
            }),
        ).rejects.toThrow('Project not found');

        const project = Project.create({
            id: 'project-1',
            ownerId: 'user-1',
            name: 'Existing Project',
            description: 'Existing Description',
        });
        project.increaseOpenTaskCount();
        repoMock.findById.mockResolvedValueOnce(project);

        await expect(
            service.closeProject({
                projectId: 'project-1',
                ownerId: 'user-1',
                ownerEmail: 'user-1@example.com',
            }),
        ).rejects.toThrow('Failed to close project');
    });

    it('should delete a project and publish event', async () => {
        const project = Project.create({
            id: 'project-1',
            ownerId: 'user-1',
            name: 'Existing Project',
            description: 'Existing Description',
        });

        repoMock.findById.mockResolvedValueOnce(project);

        await service.deleteProject('project-1', 'user-1');

        expect(repoMock.delete).toHaveBeenCalledWith('project-1');
        expect(bus.publish).toHaveBeenCalledWith(
            'notification-service',
            EVENT_NAMES.PROJECT_DELETED,
            expect.objectContaining({
                operationId: expect.any(String),
                ownerId: 'user-1',
                projectId: 'project-1',
            }),
        );
    });

    it('should handle errors during project deletion', async () => {
        repoMock.findById.mockResolvedValueOnce(null);

        await expect(
            service.deleteProject('project-1', 'user-1'),
        ).rejects.toThrow('Resource not found');

        const project = Project.create({
            id: 'project-1',
            ownerId: 'user-1',
            name: 'Existing Project',
            description: 'Existing Description',
        });
        repoMock.findById.mockResolvedValueOnce(project);
        repoMock.delete.mockRejectedValueOnce(new Error('DB error'));

        await expect(
            service.deleteProject('project-1', 'user-1'),
        ).rejects.toThrow('Failed to delete project');
    });

    it('should not allow deleting a project by non-owner', async () => {
        const project = Project.create({
            id: 'project-1',
            ownerId: 'user-1',
            name: 'Existing Project',
            description: 'Existing Description',
        });

        repoMock.findById.mockResolvedValueOnce(project);

        await expect(
            service.deleteProject('project-1', 'user-2'),
        ).rejects.toThrow('Unauthorized access');
    });

    it('get projects should return list of projects for owner', async () => {
        const emptyProjects: Project[] = [];
        repoMock.findByOwnerId.mockResolvedValueOnce(emptyProjects);

        const result = await service.getProjects('user-1');
        expect(repoMock.findByOwnerId).toHaveBeenCalledWith('user-1');
        expect(result).toEqual(emptyProjects);

        const projects: Project[] = [
            Project.create({
                id: 'project-1',
                ownerId: 'user-1',
                name: 'Project 1',
                description: 'Description 1',
            }),
        ];
        repoMock.findByOwnerId.mockResolvedValueOnce(projects);

        const result2 = await service.getProjects('user-1');

        expect(repoMock.findByOwnerId).toHaveBeenCalledWith('user-1');
        expect(result2).toEqual(projects.map((p) => p.toPrimitives()));
    });

    it('should return project details with tasks', async () => {
        const project = Project.create({
            id: 'project-1',
            ownerId: 'user-1',
            name: 'Existing Project',
            description: 'Existing Description',
        });

        repoMock.findById.mockResolvedValueOnce(project);

        request.mockResolvedValueOnce({
            ok: true,
            projectId: 'project-1',
            tasks: [
                {
                    id: 'task-1',
                    projectId: 'project-1',
                    name: 'Task 1',
                    description: 'Task 1 description',
                    status: 'OPEN',
                },
                {
                    id: 'task-2',
                    projectId: 'project-1',
                    name: 'Task 2',
                    description: 'Task 2 description',
                    status: 'CLOSED',
                },
            ],
        });

        const result = await service.getProjectDetails('project-1', 'user-1');

        expect(repoMock.findById).toHaveBeenCalledWith('project-1');

        expect(request).toHaveBeenCalledWith(
            'task-service',
            EVENT_NAMES.TASK_LIST_REQUESTED,
            EVENT_NAMES.TASK_LIST_REPLIED,
            {
                projectId: 'project-1',
                userId: 'user-1',
            },
        );

        expect(result).toEqual({
            id: 'project-1',
            ownerId: 'user-1',
            name: 'Existing Project',
            description: 'Existing Description',
            status: 'OPEN',
            openTaskCount: 0,
            tasks: [
                {
                    id: 'task-1',
                    projectId: 'project-1',
                    name: 'Task 1',
                    description: 'Task 1 description',
                    status: 'OPEN',
                },
                {
                    id: 'task-2',
                    projectId: 'project-1',
                    name: 'Task 2',
                    description: 'Task 2 description',
                    status: 'CLOSED',
                },
            ],
        });
    });

    it('should throw not found when project does not exist in getProjectDetails', async () => {
        repoMock.findById.mockResolvedValueOnce(null);

        await expect(
            service.getProjectDetails('project-1', 'user-1'),
        ).rejects.toBeInstanceOf(NotFoundError);

        expect(request).not.toHaveBeenCalled();
    });

    it('should not return project details to non-owner', async () => {
        const project = Project.create({
            id: 'project-1',
            ownerId: 'user-1',
            name: 'Existing Project',
            description: 'Existing Description',
        });

        repoMock.findById.mockResolvedValueOnce(project);

        await expect(
            service.getProjectDetails('project-1', 'user-2'),
        ).rejects.toBeInstanceOf(UnauthorizedError);

        expect(request).not.toHaveBeenCalled();
    });
});
