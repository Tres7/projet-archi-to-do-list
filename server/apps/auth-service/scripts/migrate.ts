import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2';

dotenv.config({
    path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env'),
});
import { createMysqlMigrator } from '@app/common/persistence/migrations/createMysqlMigrator';
import { migrations } from '../src/migrations/index.ts';

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD ?? process.env.MYSQL_ROOT_PASSWORD,
    database: process.env.MYSQL_DATABASE,
});

const migrator = createMysqlMigrator(pool, migrations);

const direction = process.argv[2] === 'down' ? 'down' : 'up';
await migrator[direction]();
pool.end();