import { Umzug, type RunnableMigration } from 'umzug';
import type { Pool } from 'mysql2';
import { MysqlUmzugStorage } from './MysqlUmzugStorage.ts';

export function createMysqlMigrator(
    pool: Pool,
    migrations: RunnableMigration<Pool>[],
) {
    return new Umzug({
        migrations,
        context: pool,
        storage: new MysqlUmzugStorage(pool),
        logger: console,
    });
}