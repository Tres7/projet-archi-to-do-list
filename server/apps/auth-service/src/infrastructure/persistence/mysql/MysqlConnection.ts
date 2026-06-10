import waitPort from 'wait-port';
import fs from 'fs';
import mysql from 'mysql2';
import type { IDatabaseConnection } from '../IDatabaseConnection.ts';
import { userTableSchema } from './schema.ts';
import type { MysqlEnv } from './config.ts';

type Pool = import('mysql2').Pool;
type MysqlStartupError = {
    code?: string;
    message?: string;
};

const MYSQL_READY_RETRY_ATTEMPTS = 10;
const MYSQL_READY_RETRY_DELAY_MS = 500;
const TRANSIENT_MYSQL_STARTUP_CODES = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'PROTOCOL_CONNECTION_LOST',
]);

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientMysqlStartupError(error: unknown): boolean {
    const mysqlError = error as MysqlStartupError;
    const code = mysqlError?.code;
    const message = mysqlError?.message ?? '';

    return (
        (typeof code === 'string' &&
            TRANSIENT_MYSQL_STARTUP_CODES.has(code)) ||
        message.includes('Connection lost') ||
        message.includes('server closed the connection')
    );
}

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

        await this.queryWhenReady(userTableSchema);

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

    private async queryWhenReady(sql: string): Promise<void> {
        for (
            let attempt = 1;
            attempt <= MYSQL_READY_RETRY_ATTEMPTS;
            attempt += 1
        ) {
            try {
                await this.query(sql);
                return;
            } catch (error) {
                if (
                    attempt === MYSQL_READY_RETRY_ATTEMPTS ||
                    !isTransientMysqlStartupError(error)
                ) {
                    throw error;
                }

                await delay(MYSQL_READY_RETRY_DELAY_MS * attempt);
            }
        }
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
