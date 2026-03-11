import { Task } from '../../../domain/entities/Task.ts';
import type { TaskRepository } from '../../../domain/repositories/TaskRepository.ts';
import { TaskName } from '../../../domain/value-objects/task-name.vo.ts';
import type { TaskStatus } from '../../../domain/value-objects/task-status.vo.ts';
import type { InMemoryConnection } from './InMemoryConnection.ts';

type TaskRow = {
    id: string;
    name: string;
    description: string;
    status: TaskStatus;
    createdAt: Date;
    userId: string;
    projectId: string;
};

function toTask(row: TaskRow): Task {
    return new Task(
        row.id,
        row.userId,
        row.projectId,
        new Date(row.createdAt),
        TaskName.create(row.name),
        row.description,
        row.status,
    );
}

function toRow(task: Task): TaskRow {
    const raw = task.toPrimitives();

    return {
        id: raw.id,
        name: raw.name,
        description: raw.description,
        status: raw.status,
        createdAt: raw.createdAt,
        userId: raw.userId,
        projectId: raw.projectId,
    };
}

export class InMemoryTaskRepository implements TaskRepository {
    private TABLE_NAME = 'tasks';

    constructor(private readonly conn: InMemoryConnection) {}

    async findById(id: string): Promise<Task | null> {
        const row = this.table().get(id);

        if (!row) {
            return null;
        }

        return toTask(row);
    }

    async findByProjectId(projectId: string): Promise<Task[]> {
        const tasks: Task[] = [];

        for (const row of this.table().values()) {
            if (row.projectId === projectId) {
                tasks.push(toTask(row));
            }
        }

        tasks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        return tasks;
    }

    async save(task: Task): Promise<void> {
        this.table().set(task.id, toRow(task));
    }
    async delete(taskId: string): Promise<void> {
        this.table().delete(taskId);
    }

    private table() {
        return this.conn.table<TaskRow>(this.TABLE_NAME);
    }
}
