import sqlite3Pkg from 'sqlite3';
import fs from 'fs';
import path from 'path';
import type { IDatabaseConnection } from '../IDatabaseConnection.ts';
import { todoTableSchema, userTableSchema } from './schema.ts';

type SqliteDatabase = import('sqlite3').Database;
const sqlite3 = sqlite3Pkg.verbose();

export class SqliteConnection implements IDatabaseConnection {
    private db?: SqliteDatabase;

    constructor(private readonly location: string) {}

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

        await this.run(userTableSchema);
        await this.run(todoTableSchema);
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

    async clearDatabase(): Promise<void> {
        // надежнее: чистим все таблицы (не привязываемся к именам users/todos)
        this.requireDb().exec('PRAGMA foreign_keys = OFF;');

        const tables = await this.all<{ name: string }>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        );

        for (const { name } of tables) {
            await this.run(`DELETE FROM "${name}"`);
        }

        // если используешь AUTOINCREMENT и хочешь сбрасывать счётчики:
        // await this.run('DELETE FROM sqlite_sequence');

        this.requireDb().exec('PRAGMA foreign_keys = ON;');
    }
}
