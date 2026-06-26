import type { Pool } from 'mysql2';

export async function up({ context: pool }: { context: Pool }) {
    await new Promise<void>((resolve, reject) => {
        pool.query(
            `CREATE TABLE IF NOT EXISTS projects (
                id varchar(36) PRIMARY KEY,
                name varchar(255),
                description varchar(255),
                status varchar(10),
                uncomplete_task_count INT DEFAULT 0,
                tasks TEXT,
                owner_id varchar(36)
            )`,
            [],
            (err) => (err ? reject(err) : resolve()),
        );
    });
}

export async function down({ context: pool }: { context: Pool }) {
    await new Promise<void>((resolve, reject) => {
        pool.query('DROP TABLE IF EXISTS projects', [], (err) =>
            err ? reject(err) : resolve(),
        );
    });
}
