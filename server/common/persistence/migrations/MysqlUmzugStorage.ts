import type { Pool } from 'mysql2';

const TABLE = 'schema_migrations';

export class MysqlUmzugStorage {
    constructor(private readonly pool: Pool) {}

    private query(sql: string, params: unknown[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.pool.query(sql, params, (err, rows) =>
                err ? reject(err) : resolve(rows as any[]),
            );
        });
    }

    async ensureTable(): Promise<void> {
        await this.query(`
            CREATE TABLE IF NOT EXISTS ${TABLE} (
                name varchar(255) PRIMARY KEY,
                run_at timestamp DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    async logMigration({ name }: { name: string }): Promise<void> {
        await this.query(`INSERT INTO ${TABLE} (name) VALUES (?)`, [name]);
    }

    async unlogMigration({ name }: { name: string }): Promise<void> {
        await this.query(`DELETE FROM ${TABLE} WHERE name = ?`, [name]);
    }

    async executed(): Promise<string[]> {
        await this.ensureTable();
        const rows = await this.query(`SELECT name FROM ${TABLE} ORDER BY name`);
        return rows.map((r) => r.name);
    }
}