import { Todo } from '../../domain/entities/Todo.ts';
import type {
    TodoRepository,
    TodoUpdate,
} from '../../domain/repositories/TodoRepository.ts';
import type { InMemoryConnection } from './InMemoryConnection.ts';

export class InMemoryTodoRepository implements TodoRepository {
    private TABLE_NAME = 'todos';
    constructor(private readonly conn: InMemoryConnection) {}

    private table() {
        return this.conn.table<Todo>(this.TABLE_NAME);
    }

    async getItems(): Promise<Todo[]> {
        return [...this.table().values()];
    }

    async getItem(id: string): Promise<Todo | undefined> {
        const row = this.table().get(id);
        return row ? new Todo(row.id, row.name, row.completed) : undefined;
    }

    async storeItem(todo: Todo): Promise<void> {
        this.table().set(todo.id, todo);
    }

    async updateItem(id: string, todo: TodoUpdate): Promise<void> {
        const table = this.table();
        if (!table.has(id)) return;
        const updatedTodo = new Todo(id, todo.name, todo.completed);
        table.set(id, updatedTodo);
    }

    async removeItem(id: string): Promise<void> {
        this.table().delete(id);
    }
}
