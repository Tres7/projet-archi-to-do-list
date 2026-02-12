import sqlite3Pkg from 'sqlite3';
import fs from 'fs';
import path from 'path';
import type { TodoRepository, TodoUpdate } from '../../domain/repositories/TodoRepository.ts';
import { Todo } from '../../domain/entities/Todo.ts';


type SqliteDatabase = import('sqlite3').Database;
const sqlite3 = sqlite3Pkg.verbose();

let db: SqliteDatabase | undefined;

function requireDb(): SqliteDatabase {
    if (!db) throw new Error('Database not initialized');
    return db;
}

function normalizeRow(row: any): Todo {
    return new Todo(
        String(row.id),
        String(row.name),
        row.completed === 1 || row.completed === true
    );
}

export class SqliteTodoRepository implements TodoRepository {
    async init(): Promise<void> {
        const dbLocation = process.env.SQLITE_DB_LOCATION || '/etc/todos/todo.db';

        if (dbLocation !== ':memory:') {
            const dirName = path.dirname(dbLocation);
            if (!fs.existsSync(dirName)) {
                fs.mkdirSync(dirName, { recursive: true });
            }
        }

        return new Promise((acc, rej) => {
            db = new sqlite3.Database(dbLocation, (err) => {
                if (err) return rej(err);

                if (process.env.NODE_ENV !== 'test')
                    console.log(`Using sqlite database at ${dbLocation}`);

                requireDb().run(
                    'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean)',
                    (err) => {
                        if (err) return rej(err);
                        acc();
                    },
                );
            });
        });
    }

    async teardown(): Promise<void> {
        return new Promise((acc, rej) => {
            requireDb().close((err) => {
                if (err) rej(err);
                else acc();
            });
        });
    }

    async getItems(): Promise<Todo[]> {
        return new Promise((acc, rej) => {
            requireDb().all('SELECT * FROM todo_items', (err, rows) => {
                if (err) return rej(err);
                const safeRows = (rows ?? []) as any[];
                acc(safeRows.map(normalizeRow));
            });
        });
    }

    async getItem(id: string): Promise<Todo | undefined> {
        return new Promise((acc, rej) => {
            requireDb().all(
                'SELECT * FROM todo_items WHERE id=?',
                [id],
                (err, rows) => {
                    if (err) return rej(err);
                    const safeRows = (rows ?? []) as any[];
                    acc(safeRows.length ? normalizeRow(safeRows[0]) : undefined);
                },
            );
        });
    }

    async storeItem(todo: Todo): Promise<void> {
    return new Promise((acc, rej) => {
        requireDb().run(
            'INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)',
            [todo.id, todo.name, todo.completed ? 1 : 0],
            (err) => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async updateItem(id: string, updates: TodoUpdate): Promise<void> {
    return new Promise((acc, rej) => {
        requireDb().run(
            'UPDATE todo_items SET name=?, completed=? WHERE id = ?',
            [updates.name, updates.completed ? 1 : 0, id],
            (err) => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async removeItem(id: string): Promise<void> {
    return new Promise((acc, rej) => {
        requireDb().run('DELETE FROM todo_items WHERE id = ?', [id], (err) => {
            if (err) return rej(err);
            acc();
        });
    });
}

}