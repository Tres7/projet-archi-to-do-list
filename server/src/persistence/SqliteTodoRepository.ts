import { Todo } from '../domain/entities/Todo.ts';
import type {
    TodoRepository,
    TodoUpdate,
} from '../domain/repositories/TodoRepository.ts';
import type { SqliteConnection } from './SqliteConnection.ts';

function normalizeRow(row: any): Todo {
    return new Todo(
        String(row.id),
        String(row.name),
        row.completed === 1 || row.completed === true,
    );
}

export class SqliteTodoRepository implements TodoRepository {
    constructor(private readonly connection: SqliteConnection) {}
    async getItems(): Promise<Todo[]> {
        const rows = await this.connection.all('SELECT * FROM todo_items');
        return rows.map(normalizeRow);
    }

    async getItem(id: string): Promise<Todo | undefined> {
        const rows = await this.connection.all(
            'SELECT * FROM todo_items WHERE id=?',
            [id],
        );
        return rows.length ? normalizeRow(rows[0]) : undefined;
    }

    async storeItem(todo: Todo): Promise<void> {
        await this.connection.run(
            'INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)',
            [todo.id, todo.name, todo.completed ? 1 : 0],
        );
    }

    async updateItem(id: string, todo: TodoUpdate): Promise<void> {
        await this.connection.run(
            'UPDATE todo_items SET name=?, completed=? WHERE id=?',
            [todo.name, todo.completed ? 1 : 0, id],
        );
    }

    async removeItem(id: string): Promise<void> {
        await this.connection.run('DELETE FROM todo_items WHERE id = ?', [id]);
    }
}
