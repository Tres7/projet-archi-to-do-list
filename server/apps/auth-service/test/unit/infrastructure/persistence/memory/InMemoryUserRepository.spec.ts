import { beforeEach, describe, expect, test } from '@jest/globals';
import { User } from '../../../../../src/domain/entities/User.ts';
import { InMemoryConnection } from '../../../../../src/infrastructure/persistence/memory/InMemoryConnection.ts';
import { InMemoryUserRepository } from '../../../../../src/infrastructure/persistence/memory/InMemoryUserRepository.ts';

describe('InMemoryUserRepository', () => {
    let repository: InMemoryUserRepository;

    beforeEach(async () => {
        const connection = new InMemoryConnection();
        await connection.init();
        repository = new InMemoryUserRepository(connection);
    });

    test('creates and finds users', async () => {
        const user = new User('1', 'Alice', 'alice@example.com', 'hash', null);

        await repository.createUser(user);

        await expect(repository.getUsers()).resolves.toEqual([user]);
        await expect(repository.getUserById('1')).resolves.toEqual(user);
        await expect(repository.getUserByName('Alice')).resolves.toEqual(user);
        await expect(
            repository.getUserById('missing'),
        ).resolves.toBeUndefined();
        await expect(
            repository.getUserByName('missing'),
        ).resolves.toBeUndefined();
    });

    test('updates and deletes users', async () => {
        await repository.createUser(
            new User('1', 'Alice', 'alice@example.com', 'hash', null),
        );

        await repository.updateUsername('1', 'Alicia');
        await repository.changeUserPassword('1', 'new-hash');
        await repository.updateUsername('missing', 'Noop');
        await repository.changeUserPassword('missing', 'noop');

        await expect(repository.getUserById('1')).resolves.toEqual(
            new User('1', 'Alicia', 'alice@example.com', 'new-hash', null),
        );

        await repository.deleteUser('1');
        await expect(repository.getUserById('1')).resolves.toBeUndefined();
    });
});