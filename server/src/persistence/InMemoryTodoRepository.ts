import { Todo } from '../domain/entities/Todo.ts';
import type {
    TodoRepository,
    TodoUpdate,
} from '../domain/repositories/TodoRepository.ts';
import type { InMemoryConnection } from './InMemoryConnection.ts';

export class InMemoryTodoRepository implements TodoRepository {
    constructor(private readonly conn: InMemoryConnection) {}

    async getItems(): Promise<Todo[]> {
        return Array.from(this.conn.todoTable().values()).map(
            (r) => new Todo(r.id, r.name, r.completed),
        );
    }

    async getItem(id: string): Promise<Todo | undefined> {
        const row = this.conn.todoTable().get(id);
        return row ? new Todo(row.id, row.name, row.completed) : undefined;
    }

    async storeItem(todo: Todo): Promise<void> {
        this.conn.todoTable().set(todo.id, {
            id: todo.id,
            name: todo.name,
            completed: todo.completed,
        });
    }

    async updateItem(id: string, todo: TodoUpdate): Promise<void> {
        const table = this.conn.todoTable();
        if (!table.has(id)) return;

        table.set(id, { id, name: todo.name, completed: todo.completed });
    }

    async removeItem(id: string): Promise<void> {
        this.conn.todoTable().delete(id);
    }
}
