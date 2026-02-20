import type { UserRepository } from '../../domain/repositories/UserRepository.ts';
import bcrypt from 'bcrypt';
import type { UserResponseDTO } from '../dto/UserResponseDTO.ts';
import { UserNotFoundError } from '../../domain/errors/UserNotFoundError.ts';
import { UserAlreadyExistError } from '../../domain/errors/UserAlreadyExistError.ts';

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
            userName: user.userName,
        };
    }

    async updateUsername(id: string, username: string) {
        if (!(await this.userRepository.getUserById(id))) {
            throw new UserNotFoundError();
        }
        if (await this.userRepository.getUserByName(username)) {
            throw new UserAlreadyExistError();
        }
        await this.userRepository.updateUsername(id, username);
    }

    async changeUserPassword(id: string, passwordHash: string) {
        if (!(await this.userRepository.getUserById(id))) {
            throw new UserNotFoundError();
        }
        await this.userRepository.changeUserPassword(
            id,
            await bcrypt.hash(passwordHash, 10),
        );
    }

    async deleteUser(id: string) {
        if (!(await this.userRepository.getUserById(id))) {
            throw new UserNotFoundError();
        }
        return this.userRepository.deleteUser(id);
    }
}
