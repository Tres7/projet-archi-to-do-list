import type { UserRepository } from '../../domain/repositories/UserRepository.ts';
import bcrypt from 'bcrypt';
import type { UserResponseDTO } from '../dto/UserResponseDTO.ts';

export class UserService {
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
            throw new Error('User not found'); // todo add custom error class
        }
        if (await this.userRepository.getUserByName(username)) {
            throw new Error('User with that username already exists'); // todo add custom error class
        }
        await this.userRepository.updateUsername(id, username);
    }

    async changeUserPassword(id: string, passwordHash: string) {
        if (!(await this.userRepository.getUserById(id))) {
            throw new Error('User not found'); // todo add custom error class
        }
        await this.userRepository.changeUserPassword(
            id,
            await bcrypt.hash(passwordHash, 10),
        );
    }

    async deleteUser(id: string) {
        return this.userRepository.deleteUser(id);
    }
}
