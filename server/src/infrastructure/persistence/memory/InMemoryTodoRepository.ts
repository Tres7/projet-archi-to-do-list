import { Task } from '../../../modules/task/domain/entities/Task.ts';
import type {
    TodoRepository,
    TodoUpdate,
} from '../../../modules/task/domain/repositories/TodoRepository.ts';
import type { InMemoryConnection } from './InMemoryConnection.ts';

export class InMemoryTodoRepository implements TodoRepository {
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
            ? new Task(row.id, row.name, row.completed, row.userId)
            : undefined;
    }

    async storeItem(task: Task): Promise<void> {
        this.table().set(task.id, task);
    }

    async updateItem(id: string, todo: TodoUpdate): Promise<void> {
        const table = this.table();

        if (!table.has(id)) return;
        const existing = table.get(id);
        if (!existing) return;
        const updatedTodo = new Task(
            id,
            todo.name,
            todo.completed,
            existing.userId,
        );
        table.set(id, updatedTodo);
    }

    async removeItem(id: string): Promise<void> {
        this.table().delete(id);
    }
}
