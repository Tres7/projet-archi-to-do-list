import { Task } from '../../../modules/task/domain/entities/Task.ts';
import type {
    TaskRepository,
    TaskUpdate,
} from '../../../modules/task/domain/repositories/TaskRepository.ts';
import type { InMemoryConnection } from './InMemoryConnection.ts';

export class InMemoryTaskRepository implements TaskRepository {
    private TABLE_NAME = 'todos';
    constructor(private readonly conn: InMemoryConnection) {}

    private table() {
        return this.conn.table<Task>(this.TABLE_NAME);
    }

    async getItems(userId: string): Promise<Task[]> {
        const items: Task[] = [];
        for (const todo of this.table().values()) {
            if (todo.userId === userId) {
                items.push(todo);
            }
        }
        return items;
    }

    async getItem(id: string): Promise<Task | undefined> {
        const row = this.table().get(id);
        return row
            ?  new Task(
                  row.id,
                  row.name,
                  row.description,
                  row.status,
                  row.createdAt,
                  row.userId,
                  row.projectId,
              )
            : undefined;
    }

    async storeItem(task: Task): Promise<void> {
        this.table().set(task.id, task);
    }

    async updateItem(id: string, task: TaskUpdate): Promise<void> {
        const table = this.table();

        if (!table.has(id)) return;
        const existing = table.get(id);
        if (!existing) return;

        const updatedTask = new Task(
            existing.id,
            task.name ?? existing.name,
            task.description ?? existing.description,
            task.status ?? existing.status,
            existing.createdAt,
            existing.userId,
            existing.projectId,
        );

        table.set(id, updatedTask);
    }

    async removeItem(id: string): Promise<void> {
        this.table().delete(id);
    }
}
