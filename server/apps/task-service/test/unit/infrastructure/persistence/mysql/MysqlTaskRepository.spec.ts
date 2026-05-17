import { describe, expect, test } from '@jest/globals';
import { Task } from '../../../../../src/domain/entities/Task.ts';
import type { TaskStatus } from '../../../../../src/domain/value-objects/task-status.vo.ts';
import type { MysqlConnection } from '../../../../../src/infrastructure/persistence/mysql/MysqlConnection.ts';
import { MysqlTaskRepository } from '../../../../../src/infrastructure/persistence/mysql/MysqlTaskRepository.ts';

class MysqlConnectionStub {
    readonly queryCalls: Array<{ sql: string; params: unknown[] }> = [];
    queryResults: unknown[][] = [];

    async query(sql: string, params: unknown[] = []): Promise<unknown[]> {
        this.queryCalls.push({ sql, params });
        return this.queryResults.shift() ?? [];
    }
}

const row = {
    id: 'task-1',
    user_id: 'user-1',
    project_id: 'project-1',
    name: 'Task',
    description: null,
    status: 'OPEN' as TaskStatus,
    created_at: '2024-01-01T10:00:00.000Z',
};

describe('MysqlTaskRepository', () => {
    test('maps rows to tasks and returns null when not found', async () => {
        const connection = new MysqlConnectionStub();
        connection.queryResults = [[row], []];
        const repository = new MysqlTaskRepository(
            connection as unknown as MysqlConnection,
        );

        await expect(
            repository.findById('task-1').then((task) => task?.toPrimitives()),
        ).resolves.toEqual({
            id: 'task-1',
            userId: 'user-1',
            projectId: 'project-1',
            createdAt: new Date('2024-01-01T10:00:00.000Z'),
            name: 'Task',
            description: '',
            status: 'OPEN',
        });
        await expect(repository.findById('missing')).resolves.toBeNull();
    });

    test('executes expected sql for project lookup, save, and delete', async () => {
        const connection = new MysqlConnectionStub();
        connection.queryResults = [[row]];
        const repository = new MysqlTaskRepository(
            connection as unknown as MysqlConnection,
        );
        const task = Task.create({
            id: 'task-1',
            userId: 'user-1',
            projectId: 'project-1',
            name: 'Task',
            description: '',
            createdAt: new Date('2024-01-01T10:00:00.000Z'),
        });

        await expect(
            repository.findByProjectId('project-1'),
        ).resolves.toHaveLength(1);
        await repository.save(task);
        await repository.delete('task-1');

        expect(connection.queryCalls[0].params).toEqual(['project-1']);
        expect(connection.queryCalls).toEqual([
            {
                sql: expect.stringContaining('SELECT id, name'),
                params: ['project-1'],
            },
            {
                sql: expect.stringContaining('INSERT INTO tasks'),
                params: [
                    'task-1',
                    'Task',
                    '',
                    'OPEN',
                    new Date('2024-01-01T10:00:00.000Z'),
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
