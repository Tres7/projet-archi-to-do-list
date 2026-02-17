import waitPort from 'wait-port';
import fs from 'fs';
import mysql from 'mysql2';
import type { IDatabaseConnection } from './IDatabaseConnection.ts';

type Pool = import('mysql2').Pool;

export class MysqlConnection implements IDatabaseConnection {
    private pool?: Pool;

    private requirePool(): Pool {
        if (!this.pool)
            throw new Error('MySQL not initialized (call init() first)');
        return this.pool;
    }

    async init(): Promise<void> {
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

        const host = HOST_FILE
            ? fs.readFileSync(HOST_FILE, 'utf8').trim()
            : HOST;
        const user = USER_FILE
            ? fs.readFileSync(USER_FILE, 'utf8').trim()
            : USER;
        const password = PASSWORD_FILE
            ? fs.readFileSync(PASSWORD_FILE, 'utf8').trim()
            : PASSWORD;
        const database = DB_FILE ? fs.readFileSync(DB_FILE, 'utf8').trim() : DB;

        await waitPort({
            host: host || 'localhost',
            port: 3306,
            timeout: 10000,
            waitForDns: true,
        });

        this.pool = mysql.createPool({
            connectionLimit: 5,
            host,
            user,
            password,
            database,
            charset: 'utf8mb4',
        });

        await this.query(
            'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean) DEFAULT CHARSET utf8mb4',
        );

        if (process.env.NODE_ENV !== 'test') {
            console.log(`Connected to mysql db at host ${host}`);
        }
    }

    async teardown(): Promise<void> {
        await new Promise<void>((acc, rej) => {
            this.requirePool().end((err) => (err ? rej(err) : acc()));
        });
        this.pool = undefined;
    }

    query(sql: string, params: unknown[] = []): Promise<any[]> {
        return new Promise((acc, rej) => {
            this.requirePool().query(sql, params as any[], (err, rows) => {
                if (err) return rej(err);
                acc((rows ?? []) as any[]);
            });
        });
    }
}
