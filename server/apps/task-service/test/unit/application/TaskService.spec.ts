import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import type { TaskRepository } from '../../../src/domain/repositories/TaskRepository.ts';
import { TaskService } from '../../../src/application/TaskService.ts';
import { Task } from '../../../src/domain/entities/Task.ts';

const repoMock: jest.Mocked<TaskRepository> = {
    findById: jest.fn(),
    findByProjectId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
};

const tasks = [
    Task.create({
        id: 'task-1',
        userId: 'user-1',
        projectId: 'project-1',
        name: 'Task 1',
        description: 'Description 1',
        createdAt: new Date('2024-01-01T00:00:00Z'),
    }),
    Task.create({
        id: 'task-2',
        userId: 'user-2',
        projectId: 'project-1',
        name: 'Task 2',
        description: 'Description 2',
        createdAt: new Date('2024-01-02T00:00:00Z'),
    }),
];

let service: TaskService;

beforeEach(() => {
    jest.clearAllMocks();
    service = new TaskService(repoMock);
});

describe('TaskService', () => {
    it('should return tasks for a given project', async () => {
        repoMock.findByProjectId.mockResolvedValue(tasks);

        const result = await service.getTasksByProject('project-1', 'user-1');

        expect(repoMock.findByProjectId).toHaveBeenCalledWith('project-1');
        expect(result).toEqual([
            {
                id: 'task-1',
                name: 'Task 1',
                description: 'Description 1',
                status: 'OPEN',
                createdAt: '2024-01-01T00:00:00.000Z',
                userId: 'user-1',
                projectId: 'project-1',
            },
            {
                id: 'task-2',
                name: 'Task 2',
                description: 'Description 2',
                status: 'OPEN',
                createdAt: '2024-01-02T00:00:00.000Z',
                userId: 'user-2',
                projectId: 'project-1',
            },
        ]);
    });
});
