import {
    describe,
    beforeEach,
    afterEach,
    test,
    expect,
    beforeAll,
    afterAll,
} from '@jest/globals';
import { SqliteConnection } from '../../src/persistence/sqlite/SqliteConnection.ts';
import { SqliteUserRepository } from '../../src/persistence/sqlite/SqliteUserRepository.ts';
import { User } from '../../src/domain/entities/User.ts';

describe('SqliteUserRepository contract', () => {
    let connection: SqliteConnection;
    let userRepository: SqliteUserRepository;

    const USER = new User(
        '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
        'testuser',
        'hashedpassword',
    );

    beforeAll(async () => {
        connection = new SqliteConnection();
        await connection.init();
        userRepository = new SqliteUserRepository(connection);
    });

    afterAll(async () => {
        await connection.teardown();
    });

    beforeEach(async () => {
        await connection.run('DELETE FROM users');
    });

    test('it initializes correctly', async () => {
        const users = await userRepository.getUsers();

        expect(Array.isArray(users)).toBe(true);
    });

    describe('createUser operation', () => {
        test('it creates a user successfully', async () => {
            await userRepository.createUser(USER);
            const users = await userRepository.getUsers();

            expect(users.length).toBe(1);
            expect(users[0]).toEqual(USER);
        });
    });

    test('it can retrieve user by id', async () => {
        await userRepository.createUser(USER);
        const user = await userRepository.getUserById(USER.id);
        expect(user).toEqual(USER);
    });

    test('it can retrieve user by name', async () => {
        await userRepository.createUser(USER);
        const user = await userRepository.getUserByName(USER.userName);
        expect(user).toEqual(USER);

        const nonExistentUser =
            await userRepository.getUserByName('nonexistent');
        expect(nonExistentUser).toBeUndefined();
    });

    test('it can update username', async () => {
        await userRepository.createUser(USER);
        const newName = 'updateduser';
        await userRepository.updateUsername(USER.id, newName);
        const updatedUser = await userRepository.getUserById(USER.id);
        expect(updatedUser?.userName).toBe(newName);

        await expect(
            userRepository.updateUsername('missing-id', 'newname'),
        ).resolves.toBeUndefined();
    });

    test('it can change user password', async () => {
        await userRepository.createUser(USER);
        const newPassword = 'newhashedpassword';
        await userRepository.changeUserPassword(USER.id, newPassword);
        const updatedUser = await userRepository.getUserById(USER.id);
        expect(updatedUser?.passwordHash).toBe(newPassword);

        await expect(
            userRepository.changeUserPassword('missing-id', newPassword),
        ).resolves.toBeUndefined();
    });

    test('it can delete user', async () => {
        await userRepository.createUser(USER);
        await userRepository.deleteUser(USER.id);
        const user = await userRepository.getUserById(USER.id);
        expect(user).toBeUndefined();
    });
});
