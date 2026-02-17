import sqlite3Pkg from 'sqlite3';
import fs from 'fs';
import path from 'path';
import type { IDatabaseConnection } from './IDatabaseConnection.ts';

type SqliteDatabase = import('sqlite3').Database;
const sqlite3 = sqlite3Pkg.verbose();

export class SqliteConnection implements IDatabaseConnection {
    private db?: SqliteDatabase;

    constructor(
        private readonly location = process.env.SQLITE_DB_LOCATION ||
            '/etc/todos/todo.db',
    ) {}

    private requireDb(): SqliteDatabase {
        if (!this.db)
            throw new Error('Database not initialized (call init() first)');
        return this.db;
    }

    async init(): Promise<void> {
        const dirName = path.dirname(this.location);
        if (!fs.existsSync(dirName)) fs.mkdirSync(dirName, { recursive: true });

        await new Promise<void>((acc, rej) => {
            this.db = new sqlite3.Database(this.location, (err) =>
                err ? rej(err) : acc(),
            );
        });

        if (process.env.NODE_ENV !== 'test') {
            console.log(`Using sqlite database at ${this.location}`);
        }

        await this.run(
            'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean)',
        );
    }

    async teardown(): Promise<void> {
        return new Promise((acc, rej) => {
            this.requireDb().close((err) => {
                if (err) rej(err);
                else acc();
            });
            this.db = undefined;
        });
    }

    run(sql: string, params: unknown[] = []): Promise<void> {
        return new Promise((acc, rej) => {
            this.requireDb().run(sql, params, (err) =>
                err ? rej(err) : acc(),
            );
        });
    }

    all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
        return new Promise((acc, rej) => {
            this.requireDb().all(sql, params, (err, rows) => {
                if (err) return rej(err);
                acc((rows ?? []) as T[]);
            });
        });
    }
}
