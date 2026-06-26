import type { RunnableMigration } from 'umzug';
import type { Pool } from 'mysql2';
import * as m0001 from './0001-create-tasks-table.ts';

export const migrations: RunnableMigration<Pool>[] = [
    { name: '0001-create-tasks-table.ts', up: m0001.up, down: m0001.down },
];
