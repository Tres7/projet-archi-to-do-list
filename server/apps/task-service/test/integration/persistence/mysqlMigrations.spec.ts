import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import mysql from 'mysql2';
import { createMysqlMigrator } from '@app/common/persistence/migrations/createMysqlMigrator';
import { migrations } from '../../../src/migrations/index.ts';

const RUN_MYSQL = process.env.RUN_MYSQL_TESTS === '1';

(RUN_MYSQL ? describe : describe.skip)('MySQL migrations', () => {
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD ?? process.env.MYSQL_ROOT_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    });

    const migrator = createMysqlMigrator(pool, migrations);

    function query(sql: string, params: unknown[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            pool.query(sql, params, (err, rows) =>
                err ? reject(err) : resolve(rows as any[]),
            );
        });
    }

    beforeAll(async () => {
        await migrator.down({ to: 0 }).catch(() => {});
    });

    afterAll(async () => {
        await migrator.up();
        await pool.end();
    });

    test('up creates the tasks table and down removes it', async () => {
        await migrator.up();

        await query(
            'INSERT INTO tasks (id, name, description, status, created_at, user_id, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                'migration-test-id',
                'migration-tester',
                'desc',
                'TODO',
                new Date(),
                'user-1',
                'project-1',
            ],
        );

        const rows = await query('SELECT * FROM tasks WHERE id = ?', [
            'migration-test-id',
        ]);
        expect(rows).toHaveLength(1);

        await migrator.down();

        await expect(query('SELECT * FROM tasks')).rejects.toThrow();
    });
});
