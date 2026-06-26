import type { Pool } from 'mysql2';

export async function up({ context: pool }: { context: Pool }) {
    await new Promise<void>((resolve, reject) => {
        pool.query(
            `CREATE TABLE IF NOT EXISTS tasks (
                id varchar(36) PRIMARY KEY,
                name varchar(255),
                description TEXT,
                status varchar(16),
                created_at DATETIME(3) NOT NULL,
                user_id varchar(36),
                project_id varchar(36)
            )`,
            [],
            (err) => (err ? reject(err) : resolve()),
        );
    });
}

export async function down({ context: pool }: { context: Pool }) {
    await new Promise<void>((resolve, reject) => {
        pool.query('DROP TABLE IF EXISTS tasks', [], (err) =>
            err ? reject(err) : resolve(),
        );
    });
}
