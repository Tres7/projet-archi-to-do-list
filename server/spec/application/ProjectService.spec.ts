import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import type { ProjectRepository } from '../../src/modules/project/domain/repositories/ProjectRepository';
import type { EventPublisher } from '../../src/infrastructure/messaging/bullmq/bullmq.types';
import { ProjectService } from '../../src/modules/project/application/ProjectService';
import { Project } from '../../src/modules/project/domain/entities/Project';

const repoMock: jest.Mocked<ProjectRepository> = {
    getProjects: jest.fn(),
    getProject: jest.fn(),
    storeProject: jest.fn(),
    updateProject: jest.fn(),
    removeProject: jest.fn(),
};

const eventsMock: jest.Mocked<EventPublisher> = {
    publish: jest.fn(),
};

const OWNER_ID = 'user-abc';
let service: ProjectService;

beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectService(repoMock, eventsMock);
});

describe('ProjectService', () => {
    describe('createProject', () => {
        it('stores the project and returns it', async () => {
            repoMock.storeProject.mockResolvedValue(undefined);

            const result = await service.createProject('Mon projet', 'Une description', OWNER_ID);

            expect(repoMock.storeProject).toHaveBeenCalledTimes(1);
            expect(repoMock.storeProject).toHaveBeenCalledWith(result);
            expect(result).toBeInstanceOf(Project);
        });

        it('creates the project with the correct name, description and owner', async () => {
            repoMock.storeProject.mockResolvedValue(undefined);

            const result = await service.createProject('Mon projet', 'Une description', OWNER_ID);

            expect(result.name).toBe('Mon projet');
            expect(result.description).toBe('Une description');
            expect(result.owner_id).toBe(OWNER_ID);
        });

        it('creates the project with status opened', async () => {
            repoMock.storeProject.mockResolvedValue(undefined);

            const result = await service.createProject('Mon projet', 'Une description', OWNER_ID);

            expect(result.status).toBe('opened');
        });

        it('creates the project with no tasks', async () => {
            repoMock.storeProject.mockResolvedValue(undefined);

            const result = await service.createProject('Mon projet', 'Une description', OWNER_ID);

            expect(result.uncompleteTaskCount).toBe(0);
            expect(result.tasks).toEqual([]);
        });

        it('assigns a unique id to the project', async () => {
            repoMock.storeProject.mockResolvedValue(undefined);

            const a = await service.createProject('Projet A', 'desc', OWNER_ID);
            const b = await service.createProject('Projet B', 'desc', OWNER_ID);

            expect(a.id).toBeDefined();
            expect(b.id).toBeDefined();
            expect(a.id).not.toBe(b.id);
        });
    });

    describe('handleTaskCreated', () => {
        it('increments uncompleteTaskCount on the project', async () => {
            repoMock.getProject.mockResolvedValue(
                new Project('p1', 'Mon projet', 'desc', 'opened', 1, [], OWNER_ID)
            );
            repoMock.updateProject.mockResolvedValue(undefined);

            await service.handleTaskCreated('p1');

            expect(repoMock.updateProject).toHaveBeenCalledWith('p1', expect.objectContaining({
                uncompleteTaskCount: 2,
            }));
        });

        it('throws if project not found', async () => {
            repoMock.getProject.mockResolvedValue(undefined);

            await expect(service.handleTaskCreated('nonexistent')).rejects.toThrow('Resource not found');
        });
    });

    describe('handleTaskClosed', () => {
        it('decrements uncompleteTaskCount', async () => {
            repoMock.getProject.mockResolvedValue(
                new Project('p1', 'Mon projet', 'desc', 'opened', 2, [], OWNER_ID)
            );
            repoMock.updateProject.mockResolvedValue(undefined);

            await service.handleTaskClosed('p1');

            expect(repoMock.updateProject).toHaveBeenCalledWith('p1', expect.objectContaining({
                uncompleteTaskCount: 1,
            }));
        });

        it('closes the project and publishes project.closed when uncompleteTaskCount reaches 0', async () => {
            repoMock.getProject.mockResolvedValue(
                new Project('p1', 'Mon projet', 'desc', 'opened', 1, [], OWNER_ID)
            );
            repoMock.updateProject.mockResolvedValue(undefined);
            eventsMock.publish.mockResolvedValue({} as any);

            await service.handleTaskClosed('p1');

            expect(repoMock.updateProject).toHaveBeenCalledWith('p1', expect.objectContaining({
                status: 'closed',
                uncompleteTaskCount: 0,
            }));
            expect(eventsMock.publish).toHaveBeenCalledWith('project.closed', expect.objectContaining({
                projectId: 'p1',
            }));
        });

        it('throws if project not found', async () => {
            repoMock.getProject.mockResolvedValue(undefined);

            await expect(service.handleTaskClosed('nonexistent')).rejects.toThrow('Resource not found');
        });
    });

    describe('handleTaskReopened', () => {
        it('increments uncompleteTaskCount', async () => {
            repoMock.getProject.mockResolvedValue(
                new Project('p1', 'Mon projet', 'desc', 'closed', 0, [], OWNER_ID)
            );
            repoMock.updateProject.mockResolvedValue(undefined);

            await service.handleTaskReopened('p1');

            expect(repoMock.updateProject).toHaveBeenCalledWith('p1', expect.objectContaining({
                uncompleteTaskCount: 1,
            }));
        });

        it('throws if project not found', async () => {
            repoMock.getProject.mockResolvedValue(undefined);

            await expect(service.handleTaskReopened('nonexistent')).rejects.toThrow('Resource not found');
        });
    });

    it('throws if user is unauthorized', async () => {
        repoMock.getProject.mockResolvedValue(
            new Project('p1', 'Mon projet', 'desc', 'opened', 1, [], OWNER_ID)
        );

        await expect(service.closeProject('p1', 'other-user')).rejects.toThrow('Unauthorized');
    });

    it('closes the project and publishes project.closed', async () => {
        repoMock.getProject.mockResolvedValue(
            new Project('p1', 'Mon projet', 'desc', 'opened', 1, [], OWNER_ID)
        );
        repoMock.updateProject.mockResolvedValue(undefined);
        eventsMock.publish.mockResolvedValue({} as any);

        await service.closeProject('p1', OWNER_ID);

        expect(repoMock.updateProject).toHaveBeenCalledWith('p1', expect.objectContaining({
            status: 'closed',
        }));
        expect(eventsMock.publish).toHaveBeenCalledWith('project.closed', expect.objectContaining({
            projectId: 'p1',
            userId: OWNER_ID,
        }));
    });

});
