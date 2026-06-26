import { describe, expect, test } from '@jest/globals';
import { User } from '../../../../../src/domain/entities/User.ts';
import type { MysqlConnection } from '../../../../../src/infrastructure/persistence/mysql/MysqlConnection.ts';
import { MysqlUserRepository } from '../../../../../src/infrastructure/persistence/mysql/MysqlUserRepository.ts';

class MysqlConnectionStub {
    readonly queryCalls: Array<{ sql: string; params: unknown[] }> = [];
    queryResults: unknown[][] = [];

    async query(sql: string, params: unknown[] = []): Promise<unknown[]> {
        this.queryCalls.push({ sql, params });
        return this.queryResults.shift() ?? [];
    }
}

describe('MysqlUserRepository', () => {
    test('maps rows to users and returns undefined when not found', async () => {
        const connection = new MysqlConnectionStub();
        connection.queryResults = [
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
        const repository = new MysqlUserRepository(
            connection as unknown as MysqlConnection,
        );

        await expect(repository.getUserById('1')).resolves.toEqual(
            new User('1', 'Alice', 'alice@example.com', 'hash', null),
        );
        await expect(
            repository.getUserByName('missing'),
        ).resolves.toBeUndefined();
    });

    test('executes expected sql for reads and writes', async () => {
        const connection = new MysqlConnectionStub();
        connection.queryResults = [
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
        const repository = new MysqlUserRepository(
            connection as unknown as MysqlConnection,
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

        expect(connection.queryCalls).toEqual([
            { sql: 'SELECT * FROM users', params: [] },
            {
                sql: 'SELECT * FROM users WHERE user_name=?',
                params: ['Alice'],
            },
            {
                sql: 'INSERT INTO users (id, user_name, passwordHash, email, birth_date) VALUES (?, ?, ?, ?, ?)',
                params: ['1', 'Alice', 'hash', 'alice@example.com', null],
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