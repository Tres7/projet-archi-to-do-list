import sqlite3Pkg from "sqlite3";
import fs from "fs";
import path from "path";
import { Todo } from "../../domain/entities/Todo";
import type { ITodoRepository } from "../../domain/repositories/ITodoRepository";

type SqliteDatabase = import("sqlite3").Database;
const sqlite3 = sqlite3Pkg.verbose();


export class SqliteTodoRepository implements ITodoRepository {
  private db: SqliteDatabase | undefined;

  constructor(
    private readonly location: string = process.env.SQLITE_DB_LOCATION || "/etc/todos/todo.db"
  ) {}

  private requireDb(): SqliteDatabase {
    if (!this.db) {
      throw new Error("Database not initialized (call init() first)");
    }
    return this.db;
  }

  async init(): Promise<void> {
    const dirName = path.dirname(this.location);

    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }

    await new Promise<void>((resolve, reject) => {
      this.db = new sqlite3.Database(this.location, (err) => {
        if (err) return reject(err);

        if (process.env.NODE_ENV !== "test") {
          console.log(`Using sqlite database at ${this.location}`);
        }

        this.requireDb().run(
          "CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean)",
          (err2) => (err2 ? reject(err2) : resolve())
        );
      });
    });
  }

  async teardown(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.requireDb().close((err) => (err ? reject(err) : resolve()));
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
    const rows = await new Promise<any[]>((resolve, reject) => {
      this.requireDb().all("SELECT * FROM todo_items", (err, rows) => {
        if (err) return reject(err);
        resolve((rows ?? []) as any[]);
      });
    });

    return rows.map((r) => Todo.fromPersistence(this.normalizeRow(r)));
  }

  async findById(id: string): Promise<Todo | null> {
    const row = await new Promise<any | undefined>((resolve, reject) => {
      this.requireDb().get("SELECT * FROM todo_items WHERE id = ?", [id], (err, row) => {
        if (err) return reject(err);
        resolve(row as any | undefined);
      });
    });

    if (!row) return null;

    return Todo.fromPersistence(this.normalizeRow(row));
  }

  async save(todo: Todo): Promise<void> {
    const item = todo.toJSON();

    await new Promise<void>((resolve, reject) => {
      this.requireDb().run(
        "INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)",
        [item.id, item.name, item.completed ? 1 : 0],
        (err) => (err ? reject(err) : resolve())
      );
    });
  }

  async update(todo: Todo): Promise<void> {
    const item = todo.toJSON();

    await new Promise<void>((resolve, reject) => {
      this.requireDb().run(
        "UPDATE todo_items SET name = ?, completed = ? WHERE id = ?",
        [item.name, item.completed ? 1 : 0, item.id],
        (err) => (err ? reject(err) : resolve())
      );
    });
  }

  async remove(id: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.requireDb().run("DELETE FROM todo_items WHERE id = ?", [id], (err) =>
        err ? reject(err) : resolve()
      );
    });
  }
}

export default SqliteTodoRepository;