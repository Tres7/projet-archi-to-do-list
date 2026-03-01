import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { InvalidCredentialsError } from '../../../domain/errors/InvalidCredentialsError.ts';
import { UserAlreadyExistError } from '../../../domain/errors/UserAlreadyExistError.ts';
import type { StringValue } from 'ms';
import type { UserRepository } from '../domain/repositories/UserRepository.ts';

export interface IAuthService {
    login(username: string, password: string): Promise<string>;
    register(username: string, password: string): Promise<void>;
}

export class AuthService implements IAuthService {
    constructor(private readonly userRepository: UserRepository) {}

    async login(username: string, password: string) {
        const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as StringValue;
        const user = await this.userRepository.getUserByName(username);
        if (!user) {
            throw new InvalidCredentialsError();
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash,
        );

        if (!isPasswordValid) {
            throw new InvalidCredentialsError();
        }
        const token = jwt.sign(
            { userId: user.id, username: user.userName },
            process.env.JWT_SECRET!,
            {
                expiresIn,
            },
        );
        return token;
    }

    async register(username: string, password: string) {
        if (await this.userRepository.getUserByName(username)) {
            throw new UserAlreadyExistError();
        }
        return this.userRepository.createUser({
            id: crypto.randomUUID(),
            userName: username,
            passwordHash: await bcrypt.hash(password, 10),
        });
    }
}
