import bcrypt from 'bcrypt';
import type { UserResponseDTO } from './UserResponseDTO.ts';
import { NotFoundError } from '../../../../common/errors/NotFoundError.ts';
import { UserAlreadyExistError } from '../../../../common/errors/UserAlreadyExistError.ts';
import type { UserRepository } from '../auth/domain/repositories/UserRepository.ts';

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
