import { describe, expect, jest, test } from '@jest/globals';
import type { IAuthService } from '../../../../../../src/application/AuthService.ts';
import { AuthController } from '../../../../../../src/infrastructure/http/v1/controllers/AuthController.ts';
import { InvalidCredentialsError } from '../../../../../../../../common/errors/InvalidCredentialsError.ts';
import { UserAlreadyExistError } from '../../../../../../../../common/errors/UserAlreadyExistError.ts';
import { requestStub, ResponseStub } from '../../../../helpers/HttpStubs.ts';

function authServiceMock(): jest.Mocked<IAuthService> {
    return {
        login: jest.fn<
            (username: string, password: string) => Promise<string>
        >(),
        register:
            jest.fn<
                (
                    username: string,
                    email: string,
                    password: string,
                ) => Promise<void>
            >(),
    };
}

describe('AuthController', () => {
    test('login returns token', async () => {
        const authService = authServiceMock();
        authService.login.mockResolvedValue('jwt-token');
        const controller = new AuthController(authService);
        const response = new ResponseStub();

        await controller.login(
            requestStub({ body: { username: 'Alice', password: 'secret' } }),
            response as never,
        );

        expect(authService.login).toHaveBeenCalledWith('Alice', 'secret');
        expect(response.jsonBody).toEqual({ token: 'jwt-token' });
    });

    test('login validates required fields and maps errors', async () => {
        const authService = authServiceMock();
        const controller = new AuthController(authService);
        const missingFields = new ResponseStub();

        await controller.login(
            requestStub({ body: { username: 'Alice' } }),
            missingFields as never,
        );

        expect(missingFields.statusCode).toBe(400);
        expect(missingFields.jsonBody).toEqual({
            message: 'Username and password are required',
        });

        authService.login.mockRejectedValueOnce(new InvalidCredentialsError());
        const invalid = new ResponseStub();
        await controller.login(
            requestStub({ body: { username: 'Alice', password: 'bad' } }),
            invalid as never,
        );
        expect(invalid.statusCode).toBe(401);
        expect(invalid.jsonBody).toEqual({
            message: 'Invalid credentials provided',
        });

        authService.login.mockRejectedValueOnce(new Error('boom'));
        const failed = new ResponseStub();
        await controller.login(
            requestStub({ body: { username: 'Alice', password: 'secret' } }),
            failed as never,
        );
        expect(failed.statusCode).toBe(500);
        expect(failed.jsonBody).toEqual({ message: 'Login failed' });
    });

    test('register trims input and returns service result', async () => {
        const authService = authServiceMock();
        authService.register.mockResolvedValue(undefined);
        const controller = new AuthController(authService);
        const response = new ResponseStub();

        await controller.register(
            requestStub({
                body: {
                    username: ' Alice ',
                    email: ' alice@example.com ',
                    password: ' secret ',
                },
            }),
            response as never,
        );

        expect(authService.register).toHaveBeenCalledWith(
            'Alice',
            'alice@example.com',
            'secret',
        );
        expect(response.jsonBody).toBeUndefined();
    });

    test('register validates required fields and maps errors', async () => {
        const authService = authServiceMock();
        const controller = new AuthController(authService);
        const missingFields = new ResponseStub();

        await controller.register(
            requestStub({
                body: { username: 'Alice', email: 'alice@example.com' },
            }),
            missingFields as never,
        );

        expect(missingFields.statusCode).toBe(400);
        expect(missingFields.sendBody).toEqual({
            error: 'username, email, and password are required',
        });

        authService.register.mockRejectedValueOnce(new UserAlreadyExistError());
        const duplicate = new ResponseStub();
        await controller.register(
            requestStub({
                body: {
                    username: 'Alice',
                    email: 'alice@example.com',
                    password: 'secret',
                },
            }),
            duplicate as never,
        );
        expect(duplicate.statusCode).toBe(409);
        expect(duplicate.jsonBody).toEqual({
            error: 'User with that username already exists',
        });

        authService.register.mockRejectedValueOnce(new Error('boom'));
        const failed = new ResponseStub();
        await controller.register(
            requestStub({
                body: {
                    username: 'Alice',
                    email: 'alice@example.com',
                    password: 'secret',
                },
            }),
            failed as never,
        );
        expect(failed.statusCode).toBe(500);
        expect(failed.jsonBody).toEqual({ error: 'Registration failed' });
    });
});
