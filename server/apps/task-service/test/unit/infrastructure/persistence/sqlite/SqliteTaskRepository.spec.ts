import { describe, expect, test } from '@jest/globals';
import { Task } from '../../../../../src/domain/entities/Task.ts';
import type { TaskStatus } from '../../../../../src/domain/value-objects/task-status.vo.ts';
import type { SqliteConnection } from '../../../../../src/infrastructure/persistence/sqlite/SqliteConnection.ts';
import { SqliteTaskRepository } from '../../../../../src/infrastructure/persistence/sqlite/SqliteTaskRepository.ts';

class SqliteConnectionStub {
    readonly allCalls: Array<{ sql: string; params: unknown[] }> = [];
    readonly runCalls: Array<{ sql: string; params: unknown[] }> = [];
    allResults: unknown[][] = [];

    async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
        this.allCalls.push({ sql, params });
        return (this.allResults.shift() ?? []) as T[];
    }

    async run(sql: string, params: unknown[] = []): Promise<void> {
        this.runCalls.push({ sql, params });
    }
}

const row = {
    id: 'task-1',
    user_id: 'user-1',
    project_id: 'project-1',
    name: 'Task',
    description: 'Description',
    status: 'OPEN' as TaskStatus,
    created_at: '2024-01-01T10:00:00.000Z',
};

describe('SqliteTaskRepository', () => {
    test('maps rows to tasks and returns null when not found', async () => {
        const connection = new SqliteConnectionStub();
        connection.allResults = [[row], []];
        const repository = new SqliteTaskRepository(
            connection as unknown as SqliteConnection,
        );

        await expect(
            repository.findById('task-1').then((task) => task?.toPrimitives()),
        ).resolves.toEqual({
            id: 'task-1',
            userId: 'user-1',
            projectId: 'project-1',
            createdAt: new Date('2024-01-01T10:00:00.000Z'),
            name: 'Task',
            description: 'Description',
            status: 'OPEN',
        });
        await expect(repository.findById('missing')).resolves.toBeNull();
    });

    test('executes expected sql for project lookup, save, and delete', async () => {
        const connection = new SqliteConnectionStub();
        connection.allResults = [[row]];
        const repository = new SqliteTaskRepository(
            connection as unknown as SqliteConnection,
        );
        const task = Task.create({
            id: 'task-1',
            userId: 'user-1',
            projectId: 'project-1',
            name: 'Task',
            description: 'Description',
            createdAt: new Date('2024-01-01T10:00:00.000Z'),
        });

        await expect(
            repository.findByProjectId('project-1'),
        ).resolves.toHaveLength(1);
        await repository.save(task);
        await repository.delete('task-1');

        expect(connection.allCalls[0].params).toEqual(['project-1']);
        expect(connection.runCalls).toEqual([
            {
                sql: expect.stringContaining('INSERT INTO tasks'),
                params: [
                    'task-1',
                    'Task',
                    'Description',
                    'OPEN',
                    '2024-01-01T10:00:00.000Z',
                    'user-1',
                    'project-1',
                ],
            },
            {
                sql: 'DELETE FROM tasks WHERE id = ?',
                params: ['task-1'],
            },
        ]);
    });
});
