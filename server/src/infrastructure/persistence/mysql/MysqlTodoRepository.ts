import { Task } from '../../../modules/task/domain/entities/Task.ts';
import type {
    TodoRepository,
    TodoUpdate,
} from '../../../modules/task/domain/repositories/TodoRepository.ts';
import type { MysqlConnection } from './MysqlConnection.ts';

function normalizeRow(row: any): Task {
    return new Task(
        String(row.id),
        String(row.name),
        row.completed === 1 || row.completed === true,
        String(row.user_id),
    );
}

export class MysqlTodoRepository implements TodoRepository {
    constructor(private readonly conn: MysqlConnection) {}

    async getItems(userId: string): Promise<Task[]> {
        const rows = await this.conn.query(
            'SELECT * FROM todo_items WHERE user_id=?',
            [userId],
        );
        return rows.map(normalizeRow);
    }

    async getItem(id: string): Promise<Task | undefined> {
        const rows = await this.conn.query(
            'SELECT * FROM todo_items WHERE id=?',
            [id],
        );
        return rows.length ? normalizeRow(rows[0]) : undefined;
    }

    async storeItem(task: Task): Promise<void> {
        await this.conn.query(
            'INSERT INTO todo_items (id, name, completed, user_id) VALUES (?, ?, ?, ?)',
            [task.id, task.name, task.completed ? 1 : 0, task.userId],
        );
    }

    async updateItem(id: string, task: TodoUpdate): Promise<void> {
        await this.conn.query(
            'UPDATE todo_items SET name=?, completed=? WHERE id=?',
            [task.name, task.completed ? 1 : 0, id],
        );
    }

    async removeItem(id: string): Promise<void> {
        await this.conn.query('DELETE FROM todo_items WHERE id = ?', [id]);
    }
}
