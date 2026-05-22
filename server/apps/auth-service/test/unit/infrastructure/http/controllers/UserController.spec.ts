import { describe, expect, jest, test } from '@jest/globals';
import type { IUserService } from '../../../../../src/application/UserService.ts';
import { UserController } from '../../../../../src/infrastructure/http/controllers/UserController.ts';
import { NotFoundError } from '../../../../../../../common/errors/NotFoundError.ts';
import { UserAlreadyExistError } from '../../../../../../../common/errors/UserAlreadyExistError.ts';
import { requestStub, ResponseStub } from '../../../helpers/HttpStubs.ts';

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

describe('UserController', () => {
    const user = {
        id: '1',
        userName: 'Alice',
        email: 'alice@example.com',
    };

    test('getUsers sends users', async () => {
        const userService = userServiceMock();
        userService.getUsers.mockResolvedValue([user]);
        const response = new ResponseStub();

        await new UserController(userService).getUsers(
            requestStub({}),
            response as never,
        );

        expect(response.sendBody).toEqual([user]);
    });

    test('getUserById sends user or 404', async () => {
        const userService = userServiceMock();
        userService.getUserById.mockResolvedValueOnce(user);
        const controller = new UserController(userService);
        const found = new ResponseStub();

        await controller.getUserById(
            requestStub({ params: { id: '1' } }) as never,
            found as never,
        );

        expect(found.sendBody).toEqual(user);

        userService.getUserById.mockResolvedValueOnce(null);
        const missing = new ResponseStub();
        await controller.getUserById(
            requestStub({ params: { id: 'missing' } }) as never,
            missing as never,
        );

        expect(missing.statusCode).toBe(404);
        expect(missing.sendBody).toEqual({ error: 'User not found' });
    });

    test('getUserByName sends user or 404', async () => {
        const userService = userServiceMock();
        userService.getUserByUsername.mockResolvedValueOnce(user);
        const controller = new UserController(userService);
        const found = new ResponseStub();

        await controller.getUserByName(
            requestStub({ params: { name: 'Alice' } }) as never,
            found as never,
        );

        expect(found.sendBody).toEqual(user);

        userService.getUserByUsername.mockResolvedValueOnce(null);
        const missing = new ResponseStub();
        await controller.getUserByName(
            requestStub({ params: { name: 'missing' } }) as never,
            missing as never,
        );

        expect(missing.statusCode).toBe(404);
        expect(missing.sendBody).toEqual({ error: 'User not found' });
    });

    test('updateUsername trims username and maps known errors', async () => {
        const userService = userServiceMock();
        const controller = new UserController(userService);
        const ok = new ResponseStub();

        await controller.updateUsername(
            requestStub({
                params: { id: '1' },
                body: { username: ' Alicia ' },
            }) as never,
            ok as never,
        );

        expect(userService.updateUsername).toHaveBeenCalledWith('1', 'Alicia');
        expect(ok.statusCode).toBe(200);

        const missingName = new ResponseStub();
        await controller.updateUsername(
            requestStub({
                params: { id: '1' },
                body: { username: ' ' },
            }) as never,
            missingName as never,
        );
        expect(missingName.statusCode).toBe(400);

        userService.updateUsername.mockRejectedValueOnce(new NotFoundError());
        const missingUser = new ResponseStub();
        await controller.updateUsername(
            requestStub({
                params: { id: 'missing' },
                body: { username: 'Alicia' },
            }) as never,
            missingUser as never,
        );
        expect(missingUser.statusCode).toBe(404);

        userService.updateUsername.mockRejectedValueOnce(
            new UserAlreadyExistError(),
        );
        const duplicate = new ResponseStub();
        await controller.updateUsername(
            requestStub({
                params: { id: '1' },
                body: { username: 'Bob' },
            }) as never,
            duplicate as never,
        );
        expect(duplicate.statusCode).toBe(409);

        userService.updateUsername.mockRejectedValueOnce(new Error('boom'));
        const unexpected = new ResponseStub();
        await controller.updateUsername(
            requestStub({
                params: { id: '1' },
                body: { username: 'Alicia' },
            }) as never,
            unexpected as never,
        );
        expect(unexpected.statusCode).toBe(200);
    });

    test('changeUserPassword trims password and maps known errors', async () => {
        const userService = userServiceMock();
        const controller = new UserController(userService);
        const ok = new ResponseStub();

        await controller.changeUserPassword(
            requestStub({
                params: { id: '1' },
                body: { password: ' secret ' },
            }) as never,
            ok as never,
        );

        expect(userService.changeUserPassword).toHaveBeenCalledWith(
            '1',
            'secret',
        );
        expect(ok.statusCode).toBe(201);

        const missingPassword = new ResponseStub();
        await controller.changeUserPassword(
            requestStub({
                params: { id: '1' },
                body: { password: ' ' },
            }) as never,
            missingPassword as never,
        );
        expect(missingPassword.statusCode).toBe(400);

        userService.changeUserPassword.mockRejectedValueOnce(
            new NotFoundError(),
        );
        const missingUser = new ResponseStub();
        await controller.changeUserPassword(
            requestStub({
                params: { id: 'missing' },
                body: { password: 'secret' },
            }) as never,
            missingUser as never,
        );
        expect(missingUser.statusCode).toBe(404);

        userService.changeUserPassword.mockRejectedValueOnce(new Error('boom'));
        const unexpected = new ResponseStub();
        await controller.changeUserPassword(
            requestStub({
                params: { id: '1' },
                body: { password: 'secret' },
            }) as never,
            unexpected as never,
        );
        expect(unexpected.statusCode).toBe(201);
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
