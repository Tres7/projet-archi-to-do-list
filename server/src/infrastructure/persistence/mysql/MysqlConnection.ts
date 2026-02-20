import waitPort from 'wait-port';
import fs from 'fs';
import mysql from 'mysql2';
import type { IDatabaseConnection } from '../IDatabaseConnection.ts';
import { todoTableSchema, userTableSchema } from './schema.ts';
import type { MysqlEnv } from './config.ts';

type Pool = import('mysql2').Pool;

export class MysqlConnection implements IDatabaseConnection {
    private pool?: Pool;

    constructor(private env: MysqlEnv) {}

    private requirePool(): Pool {
        if (!this.pool)
            throw new Error('MySQL not initialized (call init() first)');
        return this.pool;
    }

    async init(): Promise<void> {
        const host = this.env.MYSQL_HOST_FILE
            ? fs.readFileSync(this.env.MYSQL_HOST_FILE!, 'utf8').trim()
            : this.env.MYSQL_HOST;
        const user = this.env.MYSQL_USER_FILE
            ? fs.readFileSync(this.env.MYSQL_USER_FILE!, 'utf8').trim()
            : this.env.MYSQL_USER;
        const password = this.env.MYSQL_PASSWORD_FILE
            ? fs.readFileSync(this.env.MYSQL_PASSWORD_FILE!, 'utf8').trim()
            : this.env.MYSQL_PASSWORD;
        const database = this.env.MYSQL_DB_FILE
            ? fs.readFileSync(this.env.MYSQL_DB_FILE!, 'utf8').trim()
            : this.env.MYSQL_DB;

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

        await this.query(userTableSchema);
        await this.query(todoTableSchema);

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

    async clearDatabase(): Promise<void> {
        await this.query('SET FOREIGN_KEY_CHECKS=0');

        const rows = await this.query('SHOW TABLES');
        const tableNames = rows.map((r) => String(Object.values(r)[0]));

        for (const t of tableNames) {
            await this.query(`TRUNCATE TABLE \`${t}\``);
        }

        await this.query('SET FOREIGN_KEY_CHECKS=1');
    }
}
