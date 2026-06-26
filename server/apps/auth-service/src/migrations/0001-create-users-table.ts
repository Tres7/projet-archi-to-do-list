import type { Pool } from 'mysql2';

export async function up({ context: pool }: { context: Pool }) {
    await new Promise<void>((resolve, reject) => {
        pool.query(
            `CREATE TABLE IF NOT EXISTS users (
                id varchar(36) PRIMARY KEY,
                user_name varchar(255) UNIQUE,
                passwordHash varchar(255),
                email varchar(255) UNIQUE
            )`,
            (err) => (err ? reject(err) : resolve()),
        );
    });
}

export async function down({ context: pool }: { context: Pool }) {
    await new Promise<void>((resolve, reject) => {
        pool.query('DROP TABLE IF EXISTS users', (err) =>
            err ? reject(err) : resolve(),
        );
    });
}