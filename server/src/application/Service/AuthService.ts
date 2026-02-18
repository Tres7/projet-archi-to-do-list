import type { UserRepository } from '../../domain/repositories/UserRepository.ts';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AuthService {
    constructor(private readonly userRepository: UserRepository) {}

    async login(username: string, password: string) {
        const user = await this.userRepository.getUserByName(username);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash,
        );

        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }
        const token = jwt.sign(
            { userId: user.id, username: user.userName },
            process.env.JWT_SECRET!,
            {
                expiresIn: '1h',
            },
        );
        return token;
    }

    async register(username: string, password: string) {
        if (await this.userRepository.getUserByName(username)) {
            throw new Error('User with that username already exists');
        }
        return this.userRepository.createUser({
            id: crypto.randomUUID(),
            userName: username,
            passwordHash: await bcrypt.hash(password, 10),
        });
    }
}
