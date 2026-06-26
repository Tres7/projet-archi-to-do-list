import type { Pool } from 'mysql2';
import { execMigrationQuery } from '@app/common/persistence/migrations/execMigrationQuery';

export async function up({ context: pool }: { context: Pool }) {
    await execMigrationQuery(
        pool,
        'ALTER TABLE users ADD COLUMN birth_date DATE NULL',
    );
}

export async function down({ context: pool }: { context: Pool }) {
    await execMigrationQuery(
        pool,
        'ALTER TABLE users DROP COLUMN birth_date',
    );
}
