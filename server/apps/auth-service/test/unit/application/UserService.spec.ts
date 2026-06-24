import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, test } from '@jest/globals';
import { NotFoundError } from '../../../../../common/errors/NotFoundError.ts';
import { UserAlreadyExistError } from '../../../../../common/errors/UserAlreadyExistError.ts';
import { UserService } from '../../../src/application/UserService.ts';
import { User } from '../../../src/domain/entities/User.ts';
import { FakeUserRepository } from '../helpers/FakeUserRepository.ts';

describe('UserService', () => {
    const user = new User('1', 'Alice', 'alice@example.com', 'hash-1', null);
    const otherUser = new User('2', 'Bob', 'bob@example.com', 'hash-2', null);

    let repository: FakeUserRepository;
    let service: UserService;

    beforeEach(() => {
        repository = new FakeUserRepository([user, otherUser]);
        service = new UserService(repository);
    });

    test('getUsers returns users without password hashes', async () => {
        await expect(service.getUsers()).resolves.toEqual([
            { id: '1', userName: 'Alice', email: 'alice@example.com', birthDate: null },
            { id: '2', userName: 'Bob', email: 'bob@example.com', birthDate: null },
        ]);
    });

    test('getUserById returns a user DTO or null', async () => {
        await expect(service.getUserById('1')).resolves.toEqual({
            id: '1',
            userName: 'Alice',
            email: 'alice@example.com',
            birthDate: null
        });

        await expect(service.getUserById('missing')).resolves.toBeNull();
    });

    test('getUserByUsername returns a user DTO or null', async () => {
        await expect(service.getUserByUsername('Alice')).resolves.toEqual({
            id: '1',
            userName: 'Alice',
            email: 'alice@example.com',
            birthDate: null
        });

        await expect(service.getUserByUsername('missing')).resolves.toBeNull();
    });

    test('updateUsername updates when user exists and username is free', async () => {
        await service.updateUsername('1', 'Charlie');

        expect(repository.updatedUsernames).toEqual([
            { id: '1', username: 'Charlie' },
        ]);
        await expect(service.getUserById('1')).resolves.toEqual({
            id: '1',
            userName: 'Charlie',
            email: 'alice@example.com',
            birthDate: null
        });
    });

    test('updateUsername throws when user does not exist', async () => {
        await expect(
            service.updateUsername('missing', 'Charlie'),
        ).rejects.toBeInstanceOf(NotFoundError);

        expect(repository.updatedUsernames).toEqual([]);
    });

    test('updateUsername throws when username is already taken', async () => {
        await expect(service.updateUsername('1', 'Bob')).rejects.toBeInstanceOf(
            UserAlreadyExistError,
        );

        expect(repository.updatedUsernames).toEqual([]);
    });

    test('changeUserPassword hashes password and stores hash', async () => {
        await service.changeUserPassword('1', 'new-password');

        expect(repository.changedPasswords).toHaveLength(1);
        expect(repository.changedPasswords[0].id).toBe('1');
        expect(repository.changedPasswords[0].passwordHash).not.toBe(
            'new-password',
        );
        await expect(
            bcrypt.compare(
                'new-password',
                repository.changedPasswords[0].passwordHash,
            ),
        ).resolves.toBe(true);
    });

    test('changeUserPassword throws when user does not exist', async () => {
        await expect(
            service.changeUserPassword('missing', 'new-password'),
        ).rejects.toBeInstanceOf(NotFoundError);

        expect(repository.changedPasswords).toEqual([]);
    });

    test('deleteUser deletes existing users and rejects missing users', async () => {
        await service.deleteUser('1');

        expect(repository.deletedUserIds).toEqual(['1']);
        await expect(service.getUserById('1')).resolves.toBeNull();

        await expect(service.deleteUser('missing')).rejects.toBeInstanceOf(
            NotFoundError,
        );
    });
});
