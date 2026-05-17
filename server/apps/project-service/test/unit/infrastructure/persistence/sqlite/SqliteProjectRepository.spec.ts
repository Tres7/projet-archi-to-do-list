import { describe, expect, test } from '@jest/globals';
import { Project } from '../../../../../src/domain/entities/Project.ts';
import type { ProjectStatus } from '../../../../../src/domain/value-objects/project-status.vo.ts';
import type { SqliteConnection } from '../../../../../src/infrastructure/persistence/sqlite/SqliteConnection.ts';
import { SqliteProjectRepository } from '../../../../../src/infrastructure/persistence/sqlite/SqliteProjectRepository.ts';

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
    id: 'project-1',
    owner_id: 'user-1',
    name: 'Project',
    description: 'Description',
    status: 'OPEN' as ProjectStatus,
    uncomplete_task_count: 2,
};

describe('SqliteProjectRepository', () => {
    test('maps rows to projects and returns null when not found', async () => {
        const connection = new SqliteConnectionStub();
        connection.allResults = [[row], []];
        const repository = new SqliteProjectRepository(
            connection as unknown as SqliteConnection,
        );

        await expect(
            repository
                .findById('project-1')
                .then((project) => project?.toPrimitives()),
        ).resolves.toEqual({
            id: 'project-1',
            ownerId: 'user-1',
            name: 'Project',
            description: 'Description',
            status: 'OPEN',
            openTaskCount: 2,
        });
        await expect(repository.findById('missing')).resolves.toBeNull();
    });

    test('executes expected sql for owner lookup, save, and delete', async () => {
        const connection = new SqliteConnectionStub();
        connection.allResults = [[row]];
        const repository = new SqliteProjectRepository(
            connection as unknown as SqliteConnection,
        );
        const project = Project.create({
            id: 'project-1',
            ownerId: 'user-1',
            name: 'Project',
            description: 'Description',
        });

        await expect(repository.findByOwnerId('user-1')).resolves.toHaveLength(
            1,
        );
        await repository.save(project);
        await repository.delete('project-1');

        expect(connection.allCalls[0].params).toEqual(['user-1']);
        expect(connection.runCalls).toEqual([
            {
                sql: expect.stringContaining('INSERT INTO projects'),
                params: [
                    'project-1',
                    'Project',
                    'Description',
                    'OPEN',
                    0,
                    'user-1',
                ],
            },
            {
                sql: expect.stringContaining('DELETE FROM projects'),
                params: ['project-1'],
            },
        ]);
    });
});
