import { User } from '../../domain/entities/User.ts';
import type { UserRepository } from '../../domain/repositories/UserRepository.ts';
import type { InMemoryConnection } from './InMemoryConnection.ts';

export class InMemoryUserRepository implements UserRepository {
    private TABLE_NAME = 'users';

    constructor(private readonly conn: InMemoryConnection) {}

    async getUsers(): Promise<User[]> {
        return [...this.table().values()];
    }

    async getUserById(id: string): Promise<User | undefined> {
        const row = this.table().get(id);
        return row
            ? new User(row.id, row.userName, row.passwordHash)
            : undefined;
    }

    async getUserByName(name: string): Promise<User | undefined> {
        for (const row of this.table().values()) {
            if (row.userName === name) {
                return new User(row.id, row.userName, row.passwordHash);
            }
        }
        return undefined;
    }
    async createUser(user: User): Promise<void> {
        this.table().set(user.id, user);
    }

    async updateUsername(id: string, username: string): Promise<void> {
        const existingUser = this.table().get(id);

        if (!existingUser) return;

        this.table().set(id, { ...existingUser, userName: username });
    }

    async changeUserPassword(id: string, passwordHash: string): Promise<void> {
        const existingUser = this.table().get(id);

        if (!existingUser) return;

        this.table().set(id, { ...existingUser, passwordHash });
    }

    async deleteUser(id: string): Promise<void> {
        this.table().delete(id);
    }

    private table() {
        return this.conn.table<User>(this.TABLE_NAME);
    }
}
