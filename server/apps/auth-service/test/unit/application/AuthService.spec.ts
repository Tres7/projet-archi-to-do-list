import {
    afterEach,
    beforeEach,
    describe,
    expect,
    jest,
    test,
} from '@jest/globals';
import { InvalidCredentialsError } from '../../../../../common/errors/InvalidCredentialsError.ts';
import { UserAlreadyExistError } from '../../../../../common/errors/UserAlreadyExistError.ts';
import { User } from '../../../src/domain/entities/User.ts';
import { FakeUserRepository } from '../helpers/FakeUserRepository.ts';

const bcryptMock = {
    compare: jest.fn<(password: string, hash: string) => Promise<boolean>>(),
    hash: jest.fn<(password: string, rounds: number) => Promise<string>>(),
};

const jwtMock = {
    sign: jest.fn<
        (
            payload: object,
            secret: string,
            options: { expiresIn: string },
        ) => string
    >(),
};

jest.unstable_mockModule('bcrypt', () => ({
    default: bcryptMock,
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
    default: jwtMock,
}));

const { AuthService } = await import('../../../src/application/AuthService.ts');

describe('AuthService', () => {
    const originalJwtSecret = process.env.JWT_SECRET;
    const originalJwtExpiresIn = process.env.JWT_EXPIRES_IN;

    let repository: FakeUserRepository;
    let service: InstanceType<typeof AuthService>;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'unit-secret';
        delete process.env.JWT_EXPIRES_IN;

        repository = new FakeUserRepository();
        service = new AuthService(repository);
    });

    afterEach(() => {
        if (originalJwtSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = originalJwtSecret;
        }

        if (originalJwtExpiresIn === undefined) {
            delete process.env.JWT_EXPIRES_IN;
        } else {
            process.env.JWT_EXPIRES_IN = originalJwtExpiresIn;
        }
    });

    test('register hashes password and creates user when username is free', async () => {
        bcryptMock.hash.mockResolvedValue('hashed-password');

        await service.register('Alice', 'alice@example.com', 'plain-password');

        expect(bcryptMock.hash).toHaveBeenCalledWith('plain-password', 10);
        expect(repository.createdUsers).toHaveLength(1);
        expect(repository.createdUsers[0]).toEqual({
            id: expect.any(String),
            userName: 'Alice',
            email: 'alice@example.com',
            passwordHash: 'hashed-password',
        });
    });

    test('register rejects an existing username', async () => {
        repository = new FakeUserRepository([
            new User('1', 'Alice', 'alice@example.com', 'hash'),
        ]);
        service = new AuthService(repository);

        await expect(
            service.register('Alice', 'other@example.com', 'password'),
        ).rejects.toBeInstanceOf(UserAlreadyExistError);

        expect(bcryptMock.hash).not.toHaveBeenCalled();
        expect(repository.createdUsers).toEqual([]);
    });

    test('login signs token when credentials are valid', async () => {
        repository = new FakeUserRepository([
            new User('1', 'Alice', 'alice@example.com', 'stored-hash'),
        ]);
        service = new AuthService(repository);
        bcryptMock.compare.mockResolvedValue(true);
        jwtMock.sign.mockReturnValue('jwt-token');

        await expect(service.login('Alice', 'plain-password')).resolves.toBe(
            'jwt-token',
        );

        expect(bcryptMock.compare).toHaveBeenCalledWith(
            'plain-password',
            'stored-hash',
        );
        expect(jwtMock.sign).toHaveBeenCalledWith(
            {
                userId: '1',
                email: 'alice@example.com',
                username: 'Alice',
            },
            'unit-secret',
            { expiresIn: '7d' },
        );
    });

    test('login uses JWT_EXPIRES_IN when provided', async () => {
        process.env.JWT_EXPIRES_IN = '1h';
        repository = new FakeUserRepository([
            new User('1', 'Alice', 'alice@example.com', 'stored-hash'),
        ]);
        service = new AuthService(repository);
        bcryptMock.compare.mockResolvedValue(true);
        jwtMock.sign.mockReturnValue('jwt-token');

        await service.login('Alice', 'plain-password');

        expect(jwtMock.sign).toHaveBeenCalledWith(
            expect.any(Object),
            'unit-secret',
            { expiresIn: '1h' },
        );
    });

    test('login rejects unknown users and invalid passwords', async () => {
        await expect(
            service.login('missing', 'plain-password'),
        ).rejects.toBeInstanceOf(InvalidCredentialsError);
        expect(bcryptMock.compare).not.toHaveBeenCalled();

        repository = new FakeUserRepository([
            new User('1', 'Alice', 'alice@example.com', 'stored-hash'),
        ]);
        service = new AuthService(repository);
        bcryptMock.compare.mockResolvedValue(false);

        await expect(
            service.login('Alice', 'wrong-password'),
        ).rejects.toBeInstanceOf(InvalidCredentialsError);
        expect(jwtMock.sign).not.toHaveBeenCalled();
    });
});
