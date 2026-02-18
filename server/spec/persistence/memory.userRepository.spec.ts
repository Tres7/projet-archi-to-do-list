import { describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import { InMemoryConnection } from '../../src/persistence/memory/InMemoryConnection';
import { InMemoryUserRepository } from '../../src/persistence/memory/InMemoryUserRepository.ts';
import { User } from '../../src/domain/entities/User.ts';

describe('InMemoryUserRepository contract', () => {
    let connection: InMemoryConnection;
    let userRepository: InMemoryUserRepository;

    const USER = new User(
        '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
        'testuser',
        'hashedpassword',
    );

    beforeEach(async () => {
        connection = new InMemoryConnection();
        await connection.init();
        userRepository = new InMemoryUserRepository(connection);
    });

    afterEach(async () => {
        try {
            await connection.teardown();
        } catch (_) {}
    });

    test('it initializes correctly', async () => {
        const users = await userRepository.getUsers();

        expect(Array.isArray(users)).toBe(true);
    });

    // test('it can create user', async () => {
    //     await userRepository.createUser(USER);
    //     const users = await userRepository.getUsers();

    //     expect(users.length).toBe(1);
    //     expect(users[0]).toEqual(USER);
    // });

    describe('createUser operation', () => {
        test('it creates a user successfully', async () => {
            await userRepository.createUser(USER);
            const users = await userRepository.getUsers();

            expect(users.length).toBe(1);
            expect(users[0]).toEqual(USER);
        });
    });

    beforeEach(async () => {
        await userRepository.createUser(USER);
    });

    test('it can retrieve user by id', async () => {
        const user = await userRepository.getUserById(USER.id);
        expect(user).toEqual(USER);
    });

    test('it can retrieve user by name', async () => {
        const user = await userRepository.getUserByName(USER.userName);
        expect(user).toEqual(USER);

        const nonExistentUser =
            await userRepository.getUserByName('nonexistent');
        expect(nonExistentUser).toBeUndefined();
    });

    test('it can update username', async () => {
        const newName = 'updateduser';
        await userRepository.updateUsername(USER.id, newName);
        const updatedUser = await userRepository.getUserById(USER.id);
        expect(updatedUser?.userName).toBe(newName);

        await expect(
            userRepository.updateUsername('missing-id', 'newname'),
        ).resolves.toBeUndefined();
    });

    test('it can change user password', async () => {
        const newPassword = 'newhashedpassword';
        await userRepository.changeUserPassword(USER.id, newPassword);
        const updatedUser = await userRepository.getUserById(USER.id);
        expect(updatedUser?.passwordHash).toBe(newPassword);

        await expect(
            userRepository.changeUserPassword('missing-id', newPassword),
        ).resolves.toBeUndefined();
    });

    test('it can delete user', async () => {
        await userRepository.deleteUser(USER.id);
        const user = await userRepository.getUserById(USER.id);
        expect(user).toBeUndefined();
    });
});
