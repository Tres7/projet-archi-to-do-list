import { Todo } from "../../domain/entities/Todo";
import type { ITodoRepository } from "../../domain/repositories/ITodoRepository";
import type { SqliteDatabase } from "../config/database";


export class SqliteTodoRepository implements ITodoRepository {
  constructor(private readonly db: SqliteDatabase) {}

  private run(sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => (err ? reject(err) : resolve()));
    });
  }

  private get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T | undefined)));
    });
  }

  private all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => (err ? reject(err) : resolve((rows ?? []) as T[])));
    });
  }

  private normalizeRow(row: any): { id: string; name: string; completed: boolean } {
    return {
      id: String(row.id),
      name: String(row.name),
      completed: row.completed === 1 || row.completed === true,
    };
  }

  async findAll(): Promise<Todo[]> {
    const rows = await this.all<any>("SELECT * FROM todo_items");
    return rows.map((r) => Todo.fromPersistence(this.normalizeRow(r)));
  }

  async findById(id: string): Promise<Todo | null> {
    const row = await this.get<any>("SELECT * FROM todo_items WHERE id = ?", [id]);
    if (!row) return null;
    return Todo.fromPersistence(this.normalizeRow(row));
  }

  async save(todo: Todo): Promise<void> {
    const item = todo.toJSON();
    await this.run(
      "INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)",
      [item.id, item.name, item.completed ? 1 : 0]
    );
  }

  async update(todo: Todo): Promise<void> {
    const item = todo.toJSON();
    await this.run(
      "UPDATE todo_items SET name = ?, completed = ? WHERE id = ?",
      [item.name, item.completed ? 1 : 0, item.id]
    );
  }

  async remove(id: string): Promise<void> {
    await this.run("DELETE FROM todo_items WHERE id = ?", [id]);
  }
}

export default SqliteTodoRepository;