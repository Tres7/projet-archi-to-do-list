import { User } from '../../../src/domain/entities/User.ts';
import type { UserRepository } from '../../../src/domain/repositories/UserRepository.ts';

export class FakeUserRepository implements UserRepository {
    readonly createdUsers: User[] = [];
    readonly updatedUsernames: Array<{ id: string; username: string }> = [];
    readonly changedPasswords: Array<{ id: string; passwordHash: string }> = [];
    readonly deletedUserIds: string[] = [];

    private readonly users = new Map<string, User>();

    constructor(users: User[] = []) {
        for (const user of users) {
            this.users.set(user.id, this.copy(user));
        }
    }

    async getUsers(): Promise<User[]> {
        return [...this.users.values()].map((user) => this.copy(user));
    }

    async getUserById(id: string): Promise<User | undefined> {
        const user = this.users.get(id);
        return user ? this.copy(user) : undefined;
    }

    async getUserByName(name: string): Promise<User | undefined> {
        const user = [...this.users.values()].find(
            (candidate) => candidate.userName === name,
        );
        return user ? this.copy(user) : undefined;
    }

    async createUser(user: User): Promise<void> {
        const storedUser = this.copy(user);
        this.createdUsers.push(storedUser);
        this.users.set(storedUser.id, storedUser);
    }

    async updateUsername(id: string, username: string): Promise<void> {
        this.updatedUsernames.push({ id, username });
        const user = this.users.get(id);
        if (user) user.userName = username;
    }

    async changeUserPassword(id: string, passwordHash: string): Promise<void> {
        this.changedPasswords.push({ id, passwordHash });
        const user = this.users.get(id);
        if (user) user.passwordHash = passwordHash;
    }

    async deleteUser(id: string): Promise<void> {
        this.deletedUserIds.push(id);
        this.users.delete(id);
    }

    private copy(user: User): User {
        return new User(user.id, user.userName, user.email, user.passwordHash, user.birthDate);
    }
}
