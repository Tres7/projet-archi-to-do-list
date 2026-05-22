import { describe, expect, test } from '@jest/globals';
import sqliteFactory from '../../../../../src/infrastructure/persistence/sqlite/factory.ts';
import { SqliteConnection } from '../../../../../src/infrastructure/persistence/sqlite/SqliteConnection.ts';
import { SqliteUserRepository } from '../../../../../src/infrastructure/persistence/sqlite/SqliteUserRepository.ts';

describe('sqlite factory', () => {
    test('creates sqlite container', () => {
        const container = sqliteFactory.create({
            SQLITE_DB_LOCATION: '/tmp/auth-unit.sqlite',
        });

        expect(container.connection).toBeInstanceOf(SqliteConnection);
        expect(container.repositories.userRepository).toBeInstanceOf(
            SqliteUserRepository,
        );
    });

    test('uses default sqlite location', () => {
        const container = sqliteFactory.create({});

        expect(
            (container.connection as unknown as { location: string }).location,
        ).toBe('/etc/todos/todo.db');
    });
});
