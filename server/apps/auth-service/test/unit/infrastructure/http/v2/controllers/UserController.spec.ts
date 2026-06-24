import { describe, expect, jest, test } from '@jest/globals';
import type { IUserService } from '../../../../../../src/application/UserService.ts';
import { UserController } from '../../../../../../src/infrastructure/http/v2/controllers/UserController.ts';
import { requestStub, ResponseStub } from '../../../../helpers/HttpStubs.ts';

function userServiceMock(): jest.Mocked<IUserService> {
    return {
        getUsers:
            jest.fn<
                () => Promise<Awaited<ReturnType<IUserService['getUsers']>>>
            >(),
        getUserById: jest.fn<IUserService['getUserById']>(),
        getUserByUsername: jest.fn<IUserService['getUserByUsername']>(),
        updateUsername: jest.fn<IUserService['updateUsername']>(),
        changeUserPassword: jest.fn<IUserService['changeUserPassword']>(),
        deleteUser: jest.fn<IUserService['deleteUser']>(),
    };
}

describe('UserController (v2)', () => {
    const user = {
        id: '1',
        userName: 'Alice',
        email: 'alice@example.com',
        birthDate: new Date('1990-01-01T00:00:00.000Z'),
    };

    test('getUsers sends users with birthDate formatted as YYYY-MM-DD', async () => {
        const userService = userServiceMock();
        userService.getUsers.mockResolvedValue([user]);
        const response = new ResponseStub();

        await new UserController(userService).getUsers(
            requestStub({}),
            response as never,
        );

        expect(response.sendBody).toEqual([
            {
                id: '1',
                userName: 'Alice',
                email: 'alice@example.com',
                birthDate: '1990-01-01',
            },
        ]);
    });

    test('getUserById sends a null birthDate for legacy users, or 404', async () => {
        const userService = userServiceMock();
        userService.getUserById.mockResolvedValueOnce({
            ...user,
            birthDate: null,
        });
        const controller = new UserController(userService);
        const found = new ResponseStub();

        await controller.getUserById(
            requestStub({ params: { id: '1' } }) as never,
            found as never,
        );

        expect(found.sendBody).toEqual({
            id: '1',
            userName: 'Alice',
            email: 'alice@example.com',
            birthDate: null,
        });

        userService.getUserById.mockResolvedValueOnce(null);
        const missing = new ResponseStub();
        await controller.getUserById(
            requestStub({ params: { id: 'missing' } }) as never,
            missing as never,
        );

        expect(missing.statusCode).toBe(404);
        expect(missing.sendBody).toEqual({ error: 'User not found' });
    });

    test('getUserByName sends user with birthDate or 404', async () => {
        const userService = userServiceMock();
        userService.getUserByUsername.mockResolvedValueOnce(user);
        const controller = new UserController(userService);
        const found = new ResponseStub();

        await controller.getUserByName(
            requestStub({ params: { name: 'Alice' } }) as never,
            found as never,
        );

        expect(found.sendBody).toEqual({
            id: '1',
            userName: 'Alice',
            email: 'alice@example.com',
            birthDate: '1990-01-01',
        });

        userService.getUserByUsername.mockResolvedValueOnce(null);
        const missing = new ResponseStub();
        await controller.getUserByName(
            requestStub({ params: { name: 'missing' } }) as never,
            missing as never,
        );

        expect(missing.statusCode).toBe(404);
        expect(missing.sendBody).toEqual({ error: 'User not found' });
    });

    test('deleteUser delegates and returns no content', async () => {
        const userService = userServiceMock();
        const response = new ResponseStub();

        await new UserController(userService).deleteUser(
            requestStub({ params: { id: '1' } }) as never,
            response as never,
        );

        expect(userService.deleteUser).toHaveBeenCalledWith('1');
        expect(response.sendStatusCode).toBe(204);
    });
});