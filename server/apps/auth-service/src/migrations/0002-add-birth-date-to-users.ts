import type { Pool } from 'mysql2';

export async function up({ context: pool }: { context: Pool }) {
    await new Promise<void>((resolve, reject) => {
        pool.query(
            'ALTER TABLE users ADD COLUMN birth_date DATE NULL',
            (err) => (err ? reject(err) : resolve()),
        );
    });
}

export async function down({ context: pool }: { context: Pool }) {
    await new Promise<void>((resolve, reject) => {
        pool.query(
            'ALTER TABLE users DROP COLUMN birth_date',
            (err) => (err ? reject(err) : resolve()),
        );
    });
}