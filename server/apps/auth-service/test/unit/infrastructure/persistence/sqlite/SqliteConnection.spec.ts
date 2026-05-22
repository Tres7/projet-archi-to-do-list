import { describe, expect, test } from '@jest/globals';
import { SqliteConnection } from '../../../../../src/infrastructure/persistence/sqlite/SqliteConnection.ts';

type Callback<T = unknown[]> = (err: Error | null, rows?: T) => void;

class SqliteDbStub {
    readonly execCalls: string[] = [];
    runError?: Error;
    allError?: Error;
    closeError?: Error;
    allResults: unknown[][] = [];

    run(_sql: string, _params: unknown[], callback: Callback<void>): void {
        callback(this.runError ?? null);
    }

    all(_sql: string, _params: unknown[], callback: Callback): void {
        callback(this.allError ?? null, this.allResults.shift() ?? []);
    }

    exec(sql: string): void {
        this.execCalls.push(sql);
    }

    close(callback: (err?: Error) => void): void {
        callback(this.closeError);
    }
}

function attachDb(connection: SqliteConnection, db: SqliteDbStub) {
    (connection as unknown as { db: SqliteDbStub }).db = db;
}

describe('SqliteConnection', () => {
    test('requires init before operations', async () => {
        const connection = new SqliteConnection(':memory:');

        await expect(connection.run('SELECT 1')).rejects.toThrow(
            'Database not initialized (call init() first)',
        );
        await expect(connection.all('SELECT 1')).rejects.toThrow(
            'Database not initialized (call init() first)',
        );
        await expect(connection.clearDatabase()).rejects.toThrow(
            'Database not initialized (call init() first)',
        );
    });

    test('wraps sqlite callback APIs', async () => {
        const connection = new SqliteConnection(':memory:');
        const db = new SqliteDbStub();
        db.allResults = [[{ id: '1' }]];
        attachDb(connection, db);

        await expect(connection.run('SQL')).resolves.toBeUndefined();
        await expect(connection.all('SQL')).resolves.toEqual([{ id: '1' }]);
        await expect(connection.teardown()).resolves.toBeUndefined();

        attachDb(connection, db);
        db.runError = new Error('run failed');
        await expect(connection.run('SQL')).rejects.toThrow('run failed');

        db.runError = undefined;
        db.allError = new Error('all failed');
        await expect(connection.all('SQL')).rejects.toThrow('all failed');

        db.allError = undefined;
        db.closeError = new Error('close failed');
        await expect(connection.teardown()).rejects.toThrow('close failed');
    });

    test('clearDatabase deletes non-sqlite tables', async () => {
        const connection = new SqliteConnection(':memory:');
        const db = new SqliteDbStub();
        db.allResults = [[{ name: 'users' }, { name: 'sessions' }]];
        attachDb(connection, db);

        await connection.clearDatabase();

        expect(db.execCalls).toEqual([
            'PRAGMA foreign_keys = OFF;',
            'PRAGMA foreign_keys = ON;',
        ]);
    });
});
