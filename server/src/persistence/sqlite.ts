import sqlite3Pkg from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { Todo } from '../domain/entities/Todo.ts';
import type {
    TodoRepository,
    TodoUpdate,
} from '../domain/repositories/TodoRepository.ts';
import type { IDatabaseConnection } from './IDatabaseConnection.ts';

type SqliteDatabase = import('sqlite3').Database;
const sqlite3 = sqlite3Pkg.verbose();
const location = process.env.SQLITE_DB_LOCATION || '/etc/todos/todo.db';

let db: SqliteDatabase | undefined;

function requireDb(): SqliteDatabase {
    if (!db) throw new Error('Database not initialized (call init() first)');
    return db;
}

function normalizeRow(row: any): Todo {
    return new Todo(
        String(row.id),
        String(row.name),
        row.completed === 1 || row.completed === true,
    );
}

function init(): Promise<void> {
    const dirName = path.dirname(location);
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
    }

    return new Promise((acc, rej) => {
        db = new sqlite3.Database(location, (err) => {
            if (err) return rej(err);

            if (process.env.NODE_ENV !== 'test')
                console.log(`Using sqlite database at ${location}`);

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

async function teardown(): Promise<void> {
    return new Promise((acc, rej) => {
        requireDb().close((err) => {
            if (err) rej(err);
            else acc();
        });
    });
}

async function getItems(): Promise<Todo[]> {
    return new Promise((acc, rej) => {
        requireDb().all('SELECT * FROM todo_items', (err, rows) => {
            if (err) return rej(err);
            const safeRows = (rows ?? []) as any[];
            acc(safeRows.map(normalizeRow));
        });
    });
}

async function getItem(id: string): Promise<Todo | undefined> {
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

async function storeItem(todo: Todo): Promise<void> {
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

async function updateItem(id: string, todo: TodoUpdate): Promise<void> {
    return new Promise((acc, rej) => {
        requireDb().run(
            'UPDATE todo_items SET name=?, completed=? WHERE id = ?',
            [todo.name, todo.completed ? 1 : 0, id],
            (err) => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function removeItem(id: string): Promise<void> {
    return new Promise((acc, rej) => {
        requireDb().run('DELETE FROM todo_items WHERE id = ?', [id], (err) => {
            if (err) return rej(err);
            acc();
        });
    });
}

export const todoRepository: TodoRepository = {
    getItems,
    getItem,
    storeItem,
    updateItem,
    removeItem,
};

export const connection: IDatabaseConnection = {
    init,
    teardown,
};
