import type { Pool } from 'mysql2';
import { execMigrationQuery } from '@app/common/persistence/migrations/execMigrationQuery';

export async function up({ context: pool }: { context: Pool }) {
    await execMigrationQuery(
        pool,
        `CREATE TABLE IF NOT EXISTS tasks (
            id varchar(36) PRIMARY KEY,
            name varchar(255),
            description TEXT,
            status varchar(16),
            created_at DATETIME(3) NOT NULL,
            user_id varchar(36),
            project_id varchar(36)
        )`,
    );
}

export async function down({ context: pool }: { context: Pool }) {
    await execMigrationQuery(pool, 'DROP TABLE IF EXISTS tasks');
}
