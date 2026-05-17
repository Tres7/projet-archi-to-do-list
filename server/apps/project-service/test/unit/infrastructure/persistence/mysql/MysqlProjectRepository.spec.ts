import { describe, expect, test } from '@jest/globals';
import { Project } from '../../../../../src/domain/entities/Project.ts';
import type { ProjectStatus } from '../../../../../src/domain/value-objects/project-status.vo.ts';
import type { MysqlConnection } from '../../../../../src/infrastructure/persistence/mysql/MysqlConnection.ts';
import { MysqlProjectRepository } from '../../../../../src/infrastructure/persistence/mysql/MysqlProjectRepository.ts';

class MysqlConnectionStub {
    readonly queryCalls: Array<{ sql: string; params: unknown[] }> = [];
    queryResults: unknown[][] = [];

    async query(sql: string, params: unknown[] = []): Promise<unknown[]> {
        this.queryCalls.push({ sql, params });
        return this.queryResults.shift() ?? [];
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

describe('MysqlProjectRepository', () => {
    test('maps rows to projects and returns null when not found', async () => {
        const connection = new MysqlConnectionStub();
        connection.queryResults = [[row], []];
        const repository = new MysqlProjectRepository(
            connection as unknown as MysqlConnection,
        );

        const project = await repository.findById('project-1');

        expect(project?.toPrimitives()).toEqual({
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
        const connection = new MysqlConnectionStub();
        connection.queryResults = [[row]];
        const repository = new MysqlProjectRepository(
            connection as unknown as MysqlConnection,
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

        expect(connection.queryCalls[0].params).toEqual(['user-1']);
        expect(connection.queryCalls).toEqual([
            {
                sql: expect.stringContaining('SELECT id, name'),
                params: ['user-1'],
            },
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
                sql: 'DELETE FROM projects WHERE id = ?',
                params: ['project-1'],
            },
        ]);
    });
});
