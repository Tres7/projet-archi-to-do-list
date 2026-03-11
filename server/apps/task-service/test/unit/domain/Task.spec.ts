import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Task } from '../../../src/domain/entities/Task.ts';

describe('Task entity', () => {
    const taskParams = {
        id: 'task-1',
        userId: 'user-1',
        projectId: 'project-1',
        name: 'Test Task',
        description: 'This is a test task',
    };
    it('should create a task with valid properties', () => {
        const task = Task.create(taskParams);

        expect(task).toBeInstanceOf(Task);

        const primitives = task.toPrimitives();
        expect(primitives).toMatchObject({
            id: 'task-1',
            userId: 'user-1',
            projectId: 'project-1',
            name: 'Test Task',
            description: 'This is a test task',
            status: 'OPEN',
        });
    });

    it('should create a task with default values', () => {
        const task = Task.create({
            id: 'task-2',
            userId: 'user-2',
            projectId: 'project-2',
            name: 'Another Task',
        });

        expect(task).toBeInstanceOf(Task);

        const primitives = task.toPrimitives();
        expect(primitives).toMatchObject({
            id: 'task-2',
            userId: 'user-2',
            projectId: 'project-2',
            name: 'Another Task',
            description: '',
            status: 'OPEN',
        });
    });

    it('should throw an error if name is empty or longer than 120 characters', () => {
        expect(() =>
            Task.create({
                id: 'task-3',
                userId: 'user-3',
                projectId: 'project-3',
                name: '',
            }),
        ).toThrow('Task name is required');

        const longName = 'a'.repeat(121);
        expect(() =>
            Task.create({
                id: 'task-4',
                userId: 'user-4',
                projectId: 'project-4',
                name: longName,
            }),
        ).toThrow('Task name is too long');
    });

    it('should toggle task status correctly', () => {
        const task = Task.create(taskParams);
        task.toggleStatus();
        const primitives = task.toPrimitives();
        expect(primitives.status).toBe('DONE');

        task.toggleStatus();
        const primitives2 = task.toPrimitives();
        expect(primitives2.status).toBe('OPEN');
    });
});
