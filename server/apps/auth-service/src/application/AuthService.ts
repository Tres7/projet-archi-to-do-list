import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { InvalidCredentialsError } from '../../../../common/errors/InvalidCredentialsError.ts';
import { UserAlreadyExistError } from '../../../../common/errors/UserAlreadyExistError.ts';
import type { UserRepository } from '../domain/repositories/UserRepository.ts';

function getJwtExpiresIn(): SignOptions['expiresIn'] {
    return (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'];
}

export interface IAuthService {
    login(username: string, password: string): Promise<string>;
    register(username: string, email: string, password: string): Promise<void>;
}

export class AuthService implements IAuthService {
    constructor(private readonly userRepository: UserRepository) {}

    async login(username: string, password: string) {
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
            { userId: user.id, email: user.email, username: user.userName },
            process.env.JWT_SECRET!,
            {
                expiresIn: getJwtExpiresIn(),
            },
        );
        return token;
    }

    async register(username: string, email: string, password: string) {
        if (await this.userRepository.getUserByName(username)) {
            throw new UserAlreadyExistError();
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        return this.userRepository.createUser({
            id: crypto.randomUUID(),
            userName: username,
            passwordHash: hashedPassword,
            email: email,
        });
    }
}
