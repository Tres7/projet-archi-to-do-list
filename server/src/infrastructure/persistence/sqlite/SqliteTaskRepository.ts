import { Task } from '../../../modules/task/domain/entities/Task.ts';
import type { TaskRepository } from '../../../modules/task/domain/repositories/TaskRepository.ts';
import { TaskName } from '../../../modules/task/domain/value-objects/task-name.vo.ts';
import type { TaskStatus } from '../../../modules/task/domain/value-objects/task-status.vo.ts';
import type { SqliteConnection } from './SqliteConnection.ts';

type TaskRow = {
    id: string;
    name: string;
    description: string;
    status: TaskStatus;
    created_at: string;
    user_id: string;
    project_id: string;
};

function toTask(row: TaskRow): Task {
    return new Task(
        String(row.id),
        String(row.user_id),
        String(row.project_id),
        new Date(String(row.created_at)),
        TaskName.create(String(row.name)),
        row.description,
        row.status,
    );
}

export class SqliteTaskRepository implements TaskRepository {
    constructor(private readonly connection: SqliteConnection) {}

    async findById(id: string): Promise<Task | null> {
        const rows = await this.connection.all(
            `
            SELECT id, name, description, status, created_at, user_id, project_id
            FROM tasks
            WHERE id = ?
            `,
            [id],
        );

        if (!rows.length) {
            return null;
        }

        return toTask(rows[0] as TaskRow);
    }

    async findByProjectId(projectId: string): Promise<Task[]> {
        const rows = await this.connection.all(
            `
            SELECT id, name, description, status, created_at, user_id, project_id
            FROM tasks
            WHERE project_id = ?
            ORDER BY created_at ASC
            `,
            [projectId],
        );

        return rows.map((row) => toTask(row as TaskRow));
    }

    async save(task: Task): Promise<void> {
        const raw = task.toPrimitives();

        await this.connection.run(
            `
            INSERT INTO tasks (
                id,
                name,
                description,
                status,
                created_at,
                user_id,
                project_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                status = excluded.status,
                created_at = excluded.created_at,
                user_id = excluded.user_id,
                project_id = excluded.project_id
            `,
            [
                raw.id,
                raw.name,
                raw.description,
                raw.status,
                raw.createdAt.toISOString(),
                raw.userId,
                raw.projectId,
            ],
        );
    }

    async delete(taskId: string): Promise<void> {
        await this.connection.run('DELETE FROM tasks WHERE id = ?', [taskId]);
    }
}
