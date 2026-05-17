import { describe, expect, test } from '@jest/globals';
import sqliteFactory from '../../../../../src/infrastructure/persistence/sqlite/factory.ts';
import { SqliteConnection } from '../../../../../src/infrastructure/persistence/sqlite/SqliteConnection.ts';
import { SqliteProjectRepository } from '../../../../../src/infrastructure/persistence/sqlite/SqliteProjectRepository.ts';

describe('sqlite factory', () => {
    test('creates sqlite container', () => {
        const container = sqliteFactory.create({
            SQLITE_DB_LOCATION: '/tmp/project-unit.sqlite',
        });

        expect(container.connection).toBeInstanceOf(SqliteConnection);
        expect(container.repositories.projectRepository).toBeInstanceOf(
            SqliteProjectRepository,
        );
    });

    test('uses default sqlite location', () => {
        const container = sqliteFactory.create({});

        expect(
            (container.connection as unknown as { location: string }).location,
        ).toBe('/etc/todos/todo.db');
    });
});
