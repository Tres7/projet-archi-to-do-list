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
});
