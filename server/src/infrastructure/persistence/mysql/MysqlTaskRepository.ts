import { Task } from '../../../modules/task/domain/entities/Task.ts';
import type {
    TaskRepository,
} from '../../../modules/task/domain/repositories/TaskRepository.ts';
import type { MysqlConnection } from './MysqlConnection.ts';

function normalizeRow(row: any): Task {
    return new Task(
        String(row.id),
        String(row.name),
        String(row.description),
        row.status,
        new Date(String(row.created_at)),
        String(row.user_id),
        String(row.project_id),
    );
}

export class MysqlTaskRepository implements TaskRepository {
    constructor(private readonly conn: MysqlConnection) {}

    async getItems(userId: string): Promise<Task[]> {
        const rows = await this.conn.query(
            'SELECT * FROM tasks WHERE user_id=?',
            [userId],
        );
        return rows.map(normalizeRow);
    }

    async getItem(id: string): Promise<Task | undefined> {
        const rows = await this.conn.query(
            'SELECT * FROM tasks WHERE id=?',
            [id],
        );
        return rows.length ? normalizeRow(rows[0]) : undefined;
    }

    async storeItem(task: Task): Promise<void> {
        await this.conn.query(
            `INSERT INTO tasks
            (id, name, description, status, created_at, user_id, project_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                task.id,
                task.name,
                task.description,
                task.status,
                task.createdAt,
                task.userId,
                task.projectId,
            ],
        );
    }

    async updateItem(id: string, task: TaskUpdate): Promise<void> {
        await this.conn.query(
            'UPDATE tasks SET name = ?, description = ?, status = ? WHERE id = ?',
            [task.name, task.description, task.status, id],
        );
    }

    async removeItem(id: string): Promise<void> {
        await this.conn.query('DELETE FROM tasks WHERE id = ?',[id],);
    }
}
