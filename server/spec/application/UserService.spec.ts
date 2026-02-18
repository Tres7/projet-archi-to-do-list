import { jest, beforeEach, describe, test, expect } from '@jest/globals';
import type { UserRepository } from '../../src/domain/repositories/UserRepository';
import { UserService } from '../../src/application/Service/UserService';
import { User } from '../../src/domain/entities/User';

let service: UserService;

const repoMock: jest.Mocked<UserRepository> = {
    getUsers: jest.fn(),
    getUserById: jest.fn(),
    getUserByName: jest.fn(),
    createUser: jest.fn(),
    updateUsername: jest.fn(),
    changeUserPassword: jest.fn(),
    deleteUser: jest.fn(),
};

describe('UserService', () => {
    const USER: User = {
        id: '1',
        userName: 'Alice',
        passwordHash: 'password123',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        service = new UserService(repoMock);
    });

    test('createUser: creates a new user', async () => {
        const userName = 'Alice';
        const password = 'password123';

        repoMock.createUser.mockResolvedValue(undefined);
        await service.createUser(userName, password);

        expect(repoMock.createUser).toHaveBeenCalled();

        repoMock.getUserByName.mockReturnValue(
            Promise.resolve(new User('1', userName, password)),
        );
        await expect(service.createUser(userName, password)).rejects.toThrow();
    });

    test('getUsers: returns all users', async () => {
        repoMock.getUsers.mockResolvedValue([USER]);
        const result = await service.getUsers();
        expect(result).toEqual([{ id: USER.id, userName: USER.userName }]);
    });

    test('getUserById: returns user by ID', async () => {
        repoMock.getUserById.mockResolvedValue(USER);
        const result = await service.getUserById(USER.id);

        expect(result?.id).toBe(USER.id);
        expect(result?.userName).toBe(USER.userName);

        const nonExistentId = '999';
        repoMock.getUserById.mockResolvedValue(undefined);
        const nonExistentResult = await service.getUserById(nonExistentId);
        expect(nonExistentResult).toBeNull();
    });

    test('getUserByName: returns user by name', async () => {
        repoMock.getUserByName.mockResolvedValue(USER);
        const result = await service.getUserByUsername(USER.userName);

        expect(result?.id).toBe(USER.id);
        expect(result?.userName).toBe(USER.userName);

        const nonExistentName = 'NonExistent';
        repoMock.getUserByName.mockResolvedValue(undefined);
        const nonExistentResult =
            await service.getUserByUsername(nonExistentName);
        expect(nonExistentResult).toBeNull();
    });

    test('updateUsername: updates the username', async () => {
        const newUserName = 'Bob';

        repoMock.getUserById.mockResolvedValueOnce(USER);
        repoMock.getUserByName.mockResolvedValueOnce(undefined);

        await service.updateUsername(USER.id, newUserName);

        expect(repoMock.updateUsername).toHaveBeenCalledWith(
            USER.id,
            newUserName,
        );
    });

    test('updateUsername: must throw if user not found', async () => {
        const nonExistentId = '999';
        repoMock.getUserById.mockResolvedValue(undefined);

        await expect(
            service.updateUsername(nonExistentId, 'NewName'),
        ).rejects.toThrow();

        expect(repoMock.updateUsername).not.toHaveBeenCalled();
    });

    test('updateUsername: must throw if new username is taken', async () => {
        const newUserName = 'Bob';

        repoMock.getUserById.mockResolvedValueOnce(USER);
        repoMock.getUserByName.mockResolvedValueOnce(
            new User('2', newUserName, 'password123'),
        );

        await expect(
            service.updateUsername(USER.id, newUserName),
        ).rejects.toThrow('User with that username already exists');

        expect(repoMock.updateUsername).not.toHaveBeenCalled();
        expect(repoMock.getUserByName).toHaveBeenCalledWith(newUserName);
    });

    test('changeUserPassword: changes the user password', async () => {
        const newPassword = 'newPassword123';

        repoMock.getUserById.mockResolvedValueOnce(USER);

        await service.changeUserPassword(USER.id, newPassword);

        expect(repoMock.changeUserPassword).toHaveBeenCalled();
    });

    test('changeUserPassword: must throw if user not found', async () => {
        const nonExistentId = '999';
        repoMock.getUserById.mockResolvedValue(undefined);

        await expect(
            service.changeUserPassword(nonExistentId, 'newPassword123'),
        ).rejects.toThrow();

        expect(repoMock.changeUserPassword).not.toHaveBeenCalled();
    });

    test('deleteUser: deletes the user', async () => {
        repoMock.getUserById.mockResolvedValueOnce(USER);

        await service.deleteUser(USER.id);

        expect(repoMock.deleteUser).toHaveBeenCalledWith(USER.id);
    });
});
