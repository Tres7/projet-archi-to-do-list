import type { User } from '../entities/User.ts';

export interface UserRepository {
    getUsers(): Promise<User[]>;
    getUserById(id: string): Promise<User | undefined>;
    getUserByName(name: string): Promise<User | undefined>;
    createUser(user: User): Promise<void>;
    updateUsername(id: string, username: string): Promise<void>;
    changeUserPassword(id: string, passwordHash: string): Promise<void>;
    deleteUser(id: string): Promise<void>;
}
