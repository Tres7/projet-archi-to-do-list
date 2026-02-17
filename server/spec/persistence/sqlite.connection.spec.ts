import {
    describe,
    beforeEach,
    afterEach,
    test,
    expect,
    jest,
} from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { SqliteConnection } from '../../src/persistence/SqliteConnection.ts';

describe('SqliteConnection', () => {
    let dbPath: string;
    let connection: SqliteConnection;

    beforeEach(() => {
        dbPath = path.join(
            os.tmpdir(),
            `todo-sqlite-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
        );
        connection = new SqliteConnection(dbPath);
    });

    afterEach(async () => {
        try {
            await connection.teardown();
        } catch (_) {}

        if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    });

    test('init initializes correctly', async () => {
        await connection.init();
        const rows = await connection.all('SELECT * FROM todo_items');
        expect(Array.isArray(rows)).toBe(true);
    });

    test('run rejects before init', async () => {
        await expect(connection.run('SELECT 1')).rejects.toThrow(
            'Database not initialized',
        );
    });

    test('init creates directory if it does not exist', async () => {
        const base = path.join(
            os.tmpdir(),
            `todos-missing-${process.pid}-${Date.now()}`,
        );
        const nestedDbPath = path.join(base, 'nested', 'dir', 'todo.db');

        fs.rmSync(base, { recursive: true, force: true });

        const conn = new SqliteConnection(nestedDbPath);

        try {
            await conn.init();
            expect(fs.existsSync(path.dirname(nestedDbPath))).toBe(true);
        } finally {
            try {
                await conn.teardown();
            } catch (_) {}
            fs.rmSync(base, { recursive: true, force: true });
        }
    });

    test('init logs db location when NODE_ENV is not test', async () => {
        const logDbPath = path.join(
            os.tmpdir(),
            `todos-log-${process.pid}-${Date.now()}.db`,
        );

        const prev = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const conn = new SqliteConnection(logDbPath);

        try {
            await conn.init();
            expect(logSpy).toHaveBeenCalledWith(
                expect.stringContaining(logDbPath),
            );
        } finally {
            try {
                await conn.teardown();
            } catch (_) {}
            logSpy.mockRestore();
            process.env.NODE_ENV = prev;
            if (fs.existsSync(logDbPath)) fs.unlinkSync(logDbPath);
        }
    });
});
