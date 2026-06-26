import type { Pool } from 'mysql2';
import { execMigrationQuery } from '@app/common/persistence/migrations/execMigrationQuery';

export async function up({ context: pool }: { context: Pool }) {
    await execMigrationQuery(
        pool,
        `CREATE TABLE IF NOT EXISTS users (
            id varchar(36) PRIMARY KEY,
            user_name varchar(255) UNIQUE,
            passwordHash varchar(255),
            email varchar(255) UNIQUE
        )`,
    );
}

export async function down({ context: pool }: { context: Pool }) {
    await execMigrationQuery(pool, 'DROP TABLE IF EXISTS users');
}
