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

    test('up then down preserves existing rows without the dropped column', async () => {
        await migrator.up();

        const id = 'migration-test-id';
        await query(
            'INSERT INTO users (id, user_name, passwordHash, email, birth_date) VALUES (?, ?, ?, ?, ?)',
            [id, 'migration-tester', 'hash', 'migration@test.com', '2000-01-01'],
        );

        await migrator.down();

        const rows = await query('SELECT * FROM users WHERE id = ?', [id]);
        expect(rows).toHaveLength(1);
        expect(rows[0].user_name).toBe('migration-tester');
        expect(rows[0]).not.toHaveProperty('birth_date');
    });
});
