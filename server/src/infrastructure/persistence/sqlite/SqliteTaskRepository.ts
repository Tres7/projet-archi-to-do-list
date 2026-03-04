import { Task } from '../../../modules/task/domain/entities/Task.ts';
import type {
    TaskRepository,
    TaskUpdate,
} from '../../../modules/task/domain/repositories/TaskRepository.ts';
import type { SqliteConnection } from './SqliteConnection.ts';

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

export class SqliteTaskRepository implements TaskRepository {
    constructor(private readonly connection: SqliteConnection) {}
    async getItems(userId: string): Promise<Task[]> {
        const rows = await this.connection.all(
            'SELECT * FROM tasks WHERE user_id=?',
            [userId],
        );
        return rows.map(normalizeRow);
    }

    async getItem(id: string): Promise<Task | undefined> {
        const rows = await this.connection.all(
            'SELECT * FROM tasks WHERE id=?',
            [id],
        );
        return rows.length ? normalizeRow(rows[0]) : undefined;
    }

    async storeItem(task: Task): Promise<void> {
        await this.connection.run(
            `INSERT INTO tasks
            (id, name, description, status, created_at, user_id, project_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                task.id,
                task.name,
                task.description,
                task.status,
                task.createdAt.toISOString(),
                task.userId,
                task.projectId,
            ],
        );
    }

    async updateItem(id: string, task: TaskUpdate): Promise<void> {
        await this.connection.run(
            'UPDATE tasks SET name=?, description=?, status=? WHERE id=?',
            [task.name, task.description, task.status, id],
        );
    }


    async removeItem(id: string): Promise<void> {
        await this.connection.run('DELETE FROM tasks WHERE id = ?', [id]);
    }
}
