import { describe, expect, test } from '@jest/globals';
import mysqlFactory from '../../../../../src/infrastructure/persistence/mysql/factory.ts';
import { MysqlConnection } from '../../../../../src/infrastructure/persistence/mysql/MysqlConnection.ts';
import { MysqlUserRepository } from '../../../../../src/infrastructure/persistence/mysql/MysqlUserRepository.ts';

describe('mysql factory', () => {
    test('creates mysql container', () => {
        const container = mysqlFactory.create({
            MYSQL_HOST: 'db',
            MYSQL_USER: 'root',
            MYSQL_ROOT_PASSWORD: 'secret',
            MYSQL_DATABASE: 'todos',
        });

        expect(container.connection).toBeInstanceOf(MysqlConnection);
        expect(container.repositories.userRepository).toBeInstanceOf(
            MysqlUserRepository,
        );
    });
});
