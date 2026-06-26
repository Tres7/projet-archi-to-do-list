import type { Pool } from 'mysql2';

export function execMigrationQuery(
    pool: Pool,
    sql: string,
    params: unknown[] = [],
): Promise<void> {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err) => (err ? reject(err) : resolve()));
    });
}
