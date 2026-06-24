import bcrypt from 'bcrypt';
import type { UserResponseDTO } from './UserResponseDTO.ts';
import { NotFoundError } from '@app/common/errors/NotFoundError';
import { UserAlreadyExistError } from '@app/common/errors/UserAlreadyExistError';
import type { UserRepository } from '../domain/repositories/UserRepository.ts';

export interface IUserService {
    getUsers(): Promise<UserResponseDTO[]>;
    getUserById(id: string): Promise<UserResponseDTO | null>;
    getUserByUsername(username: string): Promise<UserResponseDTO | null>;
    updateUsername(id: string, username: string): Promise<void>;
    changeUserPassword(id: string, passwordHash: string): Promise<void>;
    deleteUser(id: string): Promise<void>;
}

export class UserService implements IUserService {
    constructor(private readonly userRepository: UserRepository) {}

    async getUsers(): Promise<UserResponseDTO[]> {
        const users = await this.userRepository.getUsers();
        return users.map((user) => ({
            id: user.id,
            email: user.email,
            userName: user.userName,
            birthDate: user.birthDate
        }));
    }

    async getUserById(id: string): Promise<UserResponseDTO | null> {
        const user = await this.userRepository.getUserById(id);
        if (!user) {
            return null;
        }
        return {
            id: user.id,
            email: user.email,
            userName: user.userName,
            birthDate: user.birthDate
        };
    }

    async getUserByUsername(username: string): Promise<UserResponseDTO | null> {
        const user = await this.userRepository.getUserByName(username);
        if (!user) {
            return null;
        }
        return {
            id: user.id,
            email: user.email,
            userName: user.userName,
            birthDate: user.birthDate
        };
    }

    async updateUsername(id: string, username: string) {
        if (!(await this.userRepository.getUserById(id))) {
            throw new NotFoundError();
        }
        if (await this.userRepository.getUserByName(username)) {
            throw new UserAlreadyExistError();
        }
        await this.userRepository.updateUsername(id, username);
    }

    async changeUserPassword(id: string, passwordHash: string) {
        if (!(await this.userRepository.getUserById(id))) {
            throw new NotFoundError();
        }
        await this.userRepository.changeUserPassword(
            id,
            await bcrypt.hash(passwordHash, 10),
        );
    }

    async deleteUser(id: string) {
        if (!(await this.userRepository.getUserById(id))) {
            throw new NotFoundError();
        }
        return this.userRepository.deleteUser(id);
    }
}
