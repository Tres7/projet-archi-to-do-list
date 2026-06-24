import { describe, expect, jest, test } from '@jest/globals';
import type { IAuthService } from '../../../../../../src/application/AuthService.ts';
import { AuthController } from '../../../../../../src/infrastructure/http/v2/controllers/AuthController.ts';
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
                    birthDate?: Date | null,
                ) => Promise<void>
            >(),
    };
}

describe('AuthController (v2)', () => {
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

    test('login validates required fields and maps invalid credentials', async () => {
        const authService = authServiceMock();
        const controller = new AuthController(authService);
        const missingFields = new ResponseStub();

        await controller.login(
            requestStub({ body: { username: 'Alice' } }),
            missingFields as never,
        );

        expect(missingFields.statusCode).toBe(400);

        authService.login.mockRejectedValueOnce(new InvalidCredentialsError());
        const invalid = new ResponseStub();
        await controller.login(
            requestStub({ body: { username: 'Alice', password: 'bad' } }),
            invalid as never,
        );
        expect(invalid.statusCode).toBe(401);
    });

    test('register rejects a missing or invalid birthDate', async () => {
        const authService = authServiceMock();
        const controller = new AuthController(authService);

        const missingBirthDate = new ResponseStub();
        await controller.register(
            requestStub({
                body: {
                    username: 'Alice',
                    email: 'alice@example.com',
                    password: 'secret',
                },
            }),
            missingBirthDate as never,
        );
        expect(missingBirthDate.statusCode).toBe(400);
        expect(missingBirthDate.sendBody).toEqual({
            error: 'birthDate is required and must use the YYYY-MM-DD format',
        });
        expect(authService.register).not.toHaveBeenCalled();

        const invalidBirthDate = new ResponseStub();
        await controller.register(
            requestStub({
                body: {
                    username: 'Alice',
                    email: 'alice@example.com',
                    password: 'secret',
                    birthDate: '01-01-1990',
                },
            }),
            invalidBirthDate as never,
        );
        expect(invalidBirthDate.statusCode).toBe(400);
        expect(authService.register).not.toHaveBeenCalled();
    });

    test('register trims input and forwards a parsed birthDate', async () => {
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
                    birthDate: '1990-01-01',
                },
            }),
            response as never,
        );

        expect(authService.register).toHaveBeenCalledWith(
            'Alice',
            'alice@example.com',
            'secret',
            new Date('1990-01-01T00:00:00.000Z'),
        );
        expect(response.jsonBody).toBeUndefined();
    });

    test('register maps known errors', async () => {
        const authService = authServiceMock();
        const controller = new AuthController(authService);
        const validBody = {
            username: 'Alice',
            email: 'alice@example.com',
            password: 'secret',
            birthDate: '1990-01-01',
        };

        authService.register.mockRejectedValueOnce(new UserAlreadyExistError());
        const duplicate = new ResponseStub();
        await controller.register(
            requestStub({ body: validBody }),
            duplicate as never,
        );
        expect(duplicate.statusCode).toBe(409);
        expect(duplicate.jsonBody).toEqual({
            error: 'User with that username already exists',
        });

        authService.register.mockRejectedValueOnce(new Error('boom'));
        const failed = new ResponseStub();
        await controller.register(
            requestStub({ body: validBody }),
            failed as never,
        );
        expect(failed.statusCode).toBe(500);
        expect(failed.jsonBody).toEqual({ error: 'Registration failed' });
    });
});