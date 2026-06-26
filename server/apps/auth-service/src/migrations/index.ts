import type { RunnableMigration } from 'umzug';
import type { Pool } from 'mysql2';
import * as m0001 from './0001-create-users-table.ts';
import * as m0002 from './0002-add-birth-date-to-users.ts';

export const migrations: RunnableMigration<Pool>[] = [
    { name: '0001-create-users-table.ts', up: m0001.up, down: m0001.down },
    { name: '0002-add-birth-date-to-users.ts', up: m0002.up, down: m0002.down },
];