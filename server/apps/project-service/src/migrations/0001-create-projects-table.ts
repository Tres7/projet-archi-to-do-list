import type { Pool } from 'mysql2';
import { execMigrationQuery } from '@app/common/persistence/migrations/execMigrationQuery';

export async function up({ context: pool }: { context: Pool }) {
    await execMigrationQuery(
        pool,
        `CREATE TABLE IF NOT EXISTS projects (
            id varchar(36) PRIMARY KEY,
            name varchar(255),
            description varchar(255),
            status varchar(10),
            uncomplete_task_count INT DEFAULT 0,
            tasks TEXT,
            owner_id varchar(36)
        )`,
    );
}

export async function down({ context: pool }: { context: Pool }) {
    await execMigrationQuery(pool, 'DROP TABLE IF EXISTS projects');
}
