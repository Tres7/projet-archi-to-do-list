import waitPort from 'wait-port';
import fs from 'fs';
import mysql from 'mysql2';
import type { TodoStore } from './types.ts';
import { Todo } from '../domain/entities/Todo.ts';
import type { TodoUpdate } from '../domain/repositories/TodoRepository.ts';

type Pool = import('mysql2').Pool;
const {
    MYSQL_HOST: HOST,
    MYSQL_HOST_FILE: HOST_FILE,
    MYSQL_USER: USER,
    MYSQL_USER_FILE: USER_FILE,
    MYSQL_PASSWORD: PASSWORD,
    MYSQL_PASSWORD_FILE: PASSWORD_FILE,
    MYSQL_DB: DB,
    MYSQL_DB_FILE: DB_FILE,
} = process.env;

let pool: Pool | undefined;

function requirePool(): Pool {
    if (!pool) throw new Error('Pool not initialized (call init() first)');
    return pool;
}

function normalizeRow(row: any): Todo {
    return new Todo(
        String(row.id),
        String(row.name),
        row.completed === 1 || row.completed === true,
    );
}

async function init(): Promise<void>{
    const host = HOST_FILE ? fs.readFileSync(HOST_FILE, 'utf8').trim() : HOST;
    const user = USER_FILE ? fs.readFileSync(USER_FILE, 'utf8').trim() : USER;
    const password = PASSWORD_FILE ? fs.readFileSync(PASSWORD_FILE, 'utf8').trim() : PASSWORD;
    const database = DB_FILE ? fs.readFileSync(DB_FILE, 'utf8').trim() : DB;

    await waitPort({
        host: host || 'localhost',
        port: 3306,
        timeout: 10000,
        waitForDns: true,
    });

    pool = mysql.createPool({
        connectionLimit: 5,
        host,
        user,
        password,
        database,
        charset: 'utf8mb4',
    });

    return new Promise((acc, rej) => {
        requirePool().query(
            'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean) DEFAULT CHARSET utf8mb4',
            (err) => {
                if (err) return rej(err);

                console.log(`Connected to mysql db at host ${HOST}`);
                acc();
            },
        );
    });
}

async function teardown(): Promise<void> {
    return new Promise((acc, rej) => {
        requirePool().end((err) => {
            if (err) rej(err);
            else acc();
        });
    });
}

async function getItems():Promise<Todo[]> {
    return new Promise((acc, rej) => {
        requirePool().query('SELECT * FROM todo_items', (err, rows) => {
            if (err) return rej(err);
            const safeRows = (rows ?? []) as any[];
            acc(safeRows.map(normalizeRow));
        });
    });
}

async function getItem(id: string): Promise<Todo | undefined> {
    return new Promise((acc, rej) => {
        requirePool().query('SELECT * FROM todo_items WHERE id=?', [id], (err, rows) => {
            if (err) return rej(err);
            const safeRows = (rows ?? []) as any[];
            acc(safeRows.length ? normalizeRow(safeRows[0]) : undefined);
        });
    });
}

async function storeItem(todo: Todo): Promise<void> {
    return new Promise((acc, rej) => {
        requirePool().query(
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
        requirePool().query(
            'UPDATE todo_items SET name=?, completed=? WHERE id=?',
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
        requirePool().query('DELETE FROM todo_items WHERE id = ?', [id], (err) => {
            if (err) return rej(err);
            acc();
        });
    });
}

const api: TodoStore = {
    init,
    teardown,
    getItems,
    getItem,
    storeItem,
    updateItem,
    removeItem,
};

export default api;
