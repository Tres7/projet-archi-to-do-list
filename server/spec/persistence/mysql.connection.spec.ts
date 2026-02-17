import {
    describe,
    beforeAll,
    afterAll,
    test,
    expect,
    jest,
} from '@jest/globals';
import { MysqlConnection } from '../../src/persistence/MysqlConnection.ts';

const RUN_MYSQL = process.env.RUN_MYSQL_TESTS === '1';
const describeIf = RUN_MYSQL ? describe : describe.skip;

describeIf('MysqlConnection', () => {
    let conn: MysqlConnection;
    let logSpy: ReturnType<typeof jest.spyOn> | null = null;

    beforeAll(async () => {
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        conn = new MysqlConnection();
        await conn.init();
    });

    afterAll(async () => {
        try {
            await conn.teardown();
        } catch (_) {}

        logSpy?.mockRestore();
    });

    test('query works after init', async () => {
        const rows = await conn.query('SELECT 1 as x');
        expect(Array.isArray(rows)).toBe(true);
    });

    test('query rejects before init', async () => {
        const c2 = new MysqlConnection();
        await expect(c2.query('SELECT 1')).rejects.toThrow(
            'MySQL not initialized',
        );
    });

    test('teardown closes pool', async () => {
        const c3 = new MysqlConnection();
        await c3.init();
        await c3.teardown();

        await expect(c3.query('SELECT 1')).rejects.toThrow(
            'MySQL not initialized',
        );
    });
});
