import { describe, expect, test } from '@jest/globals';
import { MysqlConnection } from '../../../../../src/infrastructure/persistence/mysql/MysqlConnection.ts';

type QueryCallback = (err: Error | null, rows?: unknown[]) => void;

class MysqlPoolStub {
    readonly queries: Array<{ sql: string; params: unknown[] }> = [];
    queryError?: Error;
    endError?: Error;
    results: unknown[][] = [];
    showTablesRows: unknown[] = [];

    query(sql: string, params: unknown[], callback: QueryCallback): void {
        this.queries.push({ sql, params });
        if (this.queryError) {
            callback(this.queryError);
            return;
        }
        if (sql === 'SHOW TABLES') {
            callback(null, this.showTablesRows);
            return;
        }
        callback(null, this.results.shift() ?? []);
    }

    end(callback: (err?: Error) => void): void {
        callback(this.endError);
    }
}

function attachPool(connection: MysqlConnection, pool: MysqlPoolStub) {
    (connection as unknown as { pool: MysqlPoolStub }).pool = pool;
}

describe('MysqlConnection', () => {
    test('requires init before operations', async () => {
        const connection = new MysqlConnection({});

        await expect(connection.query('SELECT 1')).rejects.toThrow(
            'MySQL not initialized (call init() first)',
        );
        await expect(connection.teardown()).rejects.toThrow(
            'MySQL not initialized (call init() first)',
        );
        await expect(connection.clearDatabase()).rejects.toThrow(
            'MySQL not initialized (call init() first)',
        );
    });

    test('wraps mysql pool callbacks', async () => {
        const connection = new MysqlConnection({});
        const pool = new MysqlPoolStub();
        pool.results = [[{ id: '1' }]];
        attachPool(connection, pool);

        await expect(connection.query('SELECT * FROM tasks')).resolves.toEqual([
            { id: '1' },
        ]);
        await expect(connection.teardown()).resolves.toBeUndefined();

        attachPool(connection, pool);
        pool.queryError = new Error('query failed');
        await expect(connection.query('SELECT 1')).rejects.toThrow(
            'query failed',
        );

        pool.queryError = undefined;
        pool.endError = new Error('end failed');
        await expect(connection.teardown()).rejects.toThrow('end failed');
    });

    test('clearDatabase truncates mysql tables', async () => {
        const connection = new MysqlConnection({});
        const pool = new MysqlPoolStub();
        pool.showTablesRows = [{ Tables_in_task: 'tasks' }];
        attachPool(connection, pool);

        await connection.clearDatabase();

        expect(pool.queries.map((query) => query.sql)).toEqual([
            'SET FOREIGN_KEY_CHECKS=0',
            'SHOW TABLES',
            'TRUNCATE TABLE `tasks`',
            'SET FOREIGN_KEY_CHECKS=1',
        ]);
    });

    test('clearDatabase skips the migrations tracking table', async () => {
        const connection = new MysqlConnection({});
        const pool = new MysqlPoolStub();
        pool.showTablesRows = [
            { Tables_in_task: 'tasks' },
            { Tables_in_task: 'schema_migrations' },
        ];
        attachPool(connection, pool);

        await connection.clearDatabase();

        expect(pool.queries.map((query) => query.sql)).toEqual([
            'SET FOREIGN_KEY_CHECKS=0',
            'SHOW TABLES',
            'TRUNCATE TABLE `tasks`',
            'SET FOREIGN_KEY_CHECKS=1',
        ]);
    });
});
