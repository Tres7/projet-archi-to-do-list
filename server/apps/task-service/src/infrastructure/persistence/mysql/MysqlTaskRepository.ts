import { Task } from '../../../domain/entities/Task.ts';
import type { TaskRepository } from '../../../domain/repositories/TaskRepository.ts';
import { TaskName } from '../../../domain/value-objects/task-name.vo.ts';
import type { TaskStatus } from '../../../domain/value-objects/task-status.vo.ts';
import type { MysqlConnection } from './MysqlConnection.ts';

type TaskRow = {
    id: string;
    name: string;
    description: string | null;
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
        row.description ?? '',
        row.status,
    );
}

export class MysqlTaskRepository implements TaskRepository {
    constructor(private readonly connection: MysqlConnection) {}

    async findById(id: string): Promise<Task | null> {
        const rows = await this.connection.query(
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
        const rows = await this.connection.query(
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
        console.log('Saving task:', task);
        const raw = task.toPrimitives();

        await this.connection.query(
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
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    description = VALUES(description),
                    status = VALUES(status),
                    created_at = VALUES(created_at),
                    user_id = VALUES(user_id),
                    project_id = VALUES(project_id)
                `,
            [
                raw.id,
                raw.name,
                raw.description ?? null,
                raw.status,
                raw.createdAt,
                raw.userId,
                raw.projectId,
            ],
        );
    }

    async delete(taskId: string): Promise<void> {
        await this.connection.query('DELETE FROM tasks WHERE id = ?', [taskId]);
    }
}
