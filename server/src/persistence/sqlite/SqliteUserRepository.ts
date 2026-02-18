import { User } from '../../domain/entities/User.ts';
import type { UserRepository } from '../../domain/repositories/UserRepository.ts';
import type { SqliteConnection } from './SqliteConnection.ts';

export class SqliteUserRepository implements UserRepository {
    constructor(private readonly conn: SqliteConnection) {}

    async getUsers(): Promise<User[]> {
        const rows = await this.conn.all('SELECT * FROM users');
        return rows.map(
            (row: any) => new User(row.id, row.user_name, row.passwordHash),
        );
    }

    async getUserById(id: string): Promise<User | undefined> {
        const rows: any[] = await this.conn.all(
            'SELECT * FROM users WHERE id=?',
            [id],
        );

        return rows.length
            ? new User(rows[0].id, rows[0].user_name, rows[0].passwordHash)
            : undefined;
    }

    async getUserByName(username: string): Promise<User | undefined> {
        const rows: any[] = await this.conn.all(
            'SELECT * FROM users WHERE user_name=?',
            [username],
        );

        return rows.length
            ? new User(rows[0].id, rows[0].user_name, rows[0].passwordHash)
            : undefined;
    }

    async createUser(user: User): Promise<void> {
        await this.conn.run(
            'INSERT INTO users (id, user_name, passwordHash) VALUES (?, ?, ?)',
            [user.id, user.userName, user.passwordHash],
        );
    }

    async updateUsername(id: string, username: string): Promise<void> {
        await this.conn.run('UPDATE users SET user_name=? WHERE id=?', [
            username,
            id,
        ]);
    }

    async changeUserPassword(id: string, passwordHash: string): Promise<void> {
        await this.conn.run('UPDATE users SET passwordHash=? WHERE id=?', [
            passwordHash,
            id,
        ]);
    }
    async deleteUser(id: string): Promise<void> {
        await this.conn.run('DELETE FROM users WHERE id = ?', [id]);
    }
}
