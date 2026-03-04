import { Task } from '../../../modules/task/domain/entities/Task.ts';
import type {
    TaskRepository,
    TodoUpdate,
} from '../../../modules/task/domain/repositories/TaskRepository.ts';
import type { SqliteConnection } from './SqliteConnection.ts';

function normalizeRow(row: any): Task {
    return new Task(
        String(row.id),
        String(row.name),
        row.completed === 1 || row.completed === true,
        String(row.user_id),
    );
}

export class SqliteTaskRepository implements TaskRepository {
    constructor(private readonly connection: SqliteConnection) {}
    async getItems(userId: string): Promise<Task[]> {
        const rows = await this.connection.all(
            'SELECT * FROM todo_items WHERE user_id=?',
            [userId],
        );
        return rows.map(normalizeRow);
    }

    async getItem(id: string): Promise<Task | undefined> {
        const rows = await this.connection.all(
            'SELECT * FROM todo_items WHERE id=?',
            [id],
        );
        return rows.length ? normalizeRow(rows[0]) : undefined;
    }

    async storeItem(task: Task): Promise<void> {
        await this.connection.run(
            'INSERT INTO todo_items (id, name, completed, user_id) VALUES (?, ?, ?, ?)',
            [task.id, task.name, task.completed ? 1 : 0, task.userId],
        );
    }

    async updateItem(id: string, task: TodoUpdate): Promise<void> {
        await this.connection.run(
            'UPDATE todo_items SET name=?, completed=? WHERE id=?',
            [task.name, task.completed ? 1 : 0, id],
        );
    }

    async removeItem(id: string): Promise<void> {
        await this.connection.run('DELETE FROM todo_items WHERE id = ?', [id]);
    }
}
