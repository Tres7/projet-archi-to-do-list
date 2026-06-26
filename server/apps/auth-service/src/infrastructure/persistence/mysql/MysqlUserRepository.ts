import { User } from '../../../domain/entities/User.ts';
import type { UserRepository } from '../../../domain/repositories/UserRepository.ts';
import type { MysqlConnection } from './MysqlConnection.ts';

export class MysqlUserRepository implements UserRepository {
    constructor(private readonly conn: MysqlConnection) {}

    async getUsers(): Promise<User[]> {
        const rows = await this.conn.query('SELECT * FROM users');
        return rows.map((row) =>this.toUser(row));
    }

    async getUserById(id: string): Promise<User | undefined> {
        const rows = await this.conn.query('SELECT * FROM users WHERE id=?', [
            id,
        ]);

        return rows.length ? this.toUser(rows[0]): undefined;
    }

    async getUserByName(username: string): Promise<User | undefined> {
        const rows = await this.conn.query(
            'SELECT * FROM users WHERE user_name=?',
            [username],
        );

        return rows.length ? this.toUser(rows[0]) : undefined;
    }

    async createUser(user: User): Promise<void> {
        await this.conn.query(
            'INSERT INTO users (id, user_name, passwordHash, email, birth_date) VALUES (?, ?, ?, ?, ?)',
            [user.id, user.userName, user.passwordHash, user.email, user.birthDate],
        );
    }

    async updateUsername(id: string, username: string): Promise<void> {
        await this.conn.query('UPDATE users SET user_name=? WHERE id=?', [
            username,
            id,
        ]);
    }
    async changeUserPassword(id: string, passwordHash: string): Promise<void> {
        await this.conn.query('UPDATE users SET passwordHash=? WHERE id=?', [
            passwordHash,
            id,
        ]);
    }
    async deleteUser(id: string): Promise<void> {
        await this.conn.query('DELETE FROM users WHERE id = ?', [id]);
    }

    private toUser(row: any): User {
        return new User(
            row.id,
            row.user_name,
            row.email,
            row.passwordHash,
            row.birth_date ? new Date(row.birth_date) : null,
        );
    }
}
