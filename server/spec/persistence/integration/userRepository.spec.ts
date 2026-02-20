import {
    describe,
    test,
    expect,
    beforeAll,
    beforeEach,
    afterAll,
} from '@jest/globals';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { IDatabaseConnection } from '../../../src/infrastructure/persistence/IDatabaseConnection.ts';
import { PersistenceFactory } from '../../../src/infrastructure/persistence/PersistenceFactory.ts';
import type { UserRepository } from '../../../src/domain/repositories/UserRepository.ts';
import { Todo } from '../../../src/domain/entities/Todo.ts';
import type { PersistenceDriver } from '../../../src/infrastructure/persistence/types.ts';
import { User } from '../../../src/domain/entities/User.ts';

const RUN_MYSQL = process.env.RUN_MYSQL_TESTS === '1';

const DRIVERS: PersistenceDriver[] = RUN_MYSQL
    ? ['memory', 'sqlite', 'mysql']
    : ['memory', 'sqlite'];

describe.each(DRIVERS)('TodoRepository contract (%s)', (driver) => {
    let connection: IDatabaseConnection;
    let userRepository: UserRepository;

    let sqlitePath: string | null = null;

    const USER = new User(
        '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
        'testuser',
        'hashedpassword',
    );

    beforeAll(async () => {
        const persistence = await PersistenceFactory.create(driver);
        connection = persistence.connection;
        userRepository = persistence.repositories.userRepository;

        await connection.init();
    });

    beforeEach(async () => {
        await connection.clearDatabase();
    });

    afterAll(async () => {
        await connection.clearDatabase();
        await connection.teardown().catch(() => {});
        if (sqlitePath) {
            try {
                fs.unlinkSync(sqlitePath);
            } catch {}
        }
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
