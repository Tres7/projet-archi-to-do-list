import { describe, expect, test } from '@jest/globals';

import { execMigrationQuery } from '@app/common/persistence/migrations/execMigrationQuery';

type QueryCallback = (err: Error | null) => void;

class PoolStub {
    readonly queries: Array<{ sql: string; params: unknown[] }> = [];
    queryError?: Error;

    query(sql: string, params: unknown[], callback: QueryCallback): void {
        this.queries.push({ sql, params });
        callback(this.queryError ?? null);
    }
}

describe('execMigrationQuery', () => {
    test('runs the query with the given params and resolves on success', async () => {
        const pool = new PoolStub();

        await expect(
            execMigrationQuery(pool as any, 'DROP TABLE IF EXISTS users', [
                'unused',
            ]),
        ).resolves.toBeUndefined();

        expect(pool.queries).toEqual([
            { sql: 'DROP TABLE IF EXISTS users', params: ['unused'] },
        ]);
    });

    test('defaults params to an empty array', async () => {
        const pool = new PoolStub();

        await execMigrationQuery(pool as any, 'SELECT 1');

        expect(pool.queries).toEqual([{ sql: 'SELECT 1', params: [] }]);
    });

    test('rejects when the query fails', async () => {
        const pool = new PoolStub();
        pool.queryError = new Error('query failed');

        await expect(
            execMigrationQuery(pool as any, 'SELECT 1'),
        ).rejects.toThrow('query failed');
    });
});
