import { describe, expect, test } from '@jest/globals';
import { User } from '../../../../../src/domain/entities/User.ts';
import type { SqliteConnection } from '../../../../../src/infrastructure/persistence/sqlite/SqliteConnection.ts';
import { SqliteUserRepository } from '../../../../../src/infrastructure/persistence/sqlite/SqliteUserRepository.ts';

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

describe('SqliteUserRepository', () => {
    test('maps rows to users and returns undefined when not found', async () => {
        const connection = new SqliteConnectionStub();
        connection.allResults = [
            [
                {
                    id: '1',
                    user_name: 'Alice',
                    email: 'alice@example.com',
                    passwordHash: 'hash',
                },
            ],
            [],
        ];
        const repository = new SqliteUserRepository(
            connection as unknown as SqliteConnection,
        );

        await expect(repository.getUserById('1')).resolves.toEqual(
            new User('1', 'Alice', 'alice@example.com', 'hash', null),
        );
        await expect(
            repository.getUserByName('missing'),
        ).resolves.toBeUndefined();
    });

    test('executes expected sql for reads and writes', async () => {
        const connection = new SqliteConnectionStub();
        connection.allResults = [
            [
                {
                    id: '1',
                    user_name: 'Alice',
                    email: 'alice@example.com',
                    passwordHash: 'hash',
                },
            ],
            [],
        ];
        const repository = new SqliteUserRepository(
            connection as unknown as SqliteConnection,
        );

        await expect(repository.getUsers()).resolves.toEqual([
            new User('1', 'Alice', 'alice@example.com', 'hash', null),
        ]);
        await repository.getUserByName('Alice');
        await repository.createUser(
            new User('1', 'Alice', 'alice@example.com', 'hash', null),
        );
        await repository.updateUsername('1', 'Alicia');
        await repository.changeUserPassword('1', 'new-hash');
        await repository.deleteUser('1');

        expect(connection.allCalls).toEqual([
            { sql: 'SELECT * FROM users', params: [] },
            {
                sql: 'SELECT * FROM users WHERE user_name=?',
                params: ['Alice'],
            },
        ]);
        expect(connection.runCalls).toEqual([
            {
                sql: 'INSERT INTO users (id, user_name, passwordHash, email) VALUES (?, ?, ?, ?)',
                params: ['1', 'Alice', 'hash', 'alice@example.com'],
            },
            {
                sql: 'UPDATE users SET user_name=? WHERE id=?',
                params: ['Alicia', '1'],
            },
            {
                sql: 'UPDATE users SET passwordHash=? WHERE id=?',
                params: ['new-hash', '1'],
            },
            { sql: 'DELETE FROM users WHERE id = ?', params: ['1'] },
        ]);
    });
});