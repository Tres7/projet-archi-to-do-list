import { Todo } from '../../../modules/task/domain/entities/Todo.ts';
import type {
    TodoRepository,
    TodoUpdate,
} from '../../../modules/task/domain/repositories/TodoRepository.ts';
import type { InMemoryConnection } from './InMemoryConnection.ts';

export class InMemoryTodoRepository implements TodoRepository {
    private TABLE_NAME = 'todos';
    constructor(private readonly conn: InMemoryConnection) {}

    private table() {
        return this.conn.table<Todo>(this.TABLE_NAME);
    }

    async getItems(userId: string): Promise<Todo[]> {
        const items: Todo[] = [];
        for (const todo of this.table().values()) {
            if (todo.userId === userId) {
                items.push(todo);
            }
        }
        return items;
    }

    async getItem(id: string): Promise<Todo | undefined> {
        const row = this.table().get(id);
        return row
            ? new Todo(row.id, row.name, row.completed, row.userId)
            : undefined;
    }

    async storeItem(todo: Todo): Promise<void> {
        this.table().set(todo.id, todo);
    }

    async updateItem(id: string, todo: TodoUpdate): Promise<void> {
        const table = this.table();

        if (!table.has(id)) return;
        const existing = table.get(id);

        const updatedTodo = new Todo(
            id,
            todo.name,
            todo.completed,
            existing?.userId,
        );
        table.set(id, updatedTodo);
    }

    async removeItem(id: string): Promise<void> {
        this.table().delete(id);
    }
}
