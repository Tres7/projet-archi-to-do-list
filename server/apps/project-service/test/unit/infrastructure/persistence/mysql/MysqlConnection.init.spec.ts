import {
    afterEach,
    beforeEach,
    describe,
    expect,
    jest,
    test,
} from '@jest/globals';

const waitPortMock = jest.fn<(options: object) => Promise<void>>();
const fsMock = {
    readFileSync: jest.fn<(path: string, encoding: BufferEncoding) => string>(),
};

type QueryCallback = (err: Error | null, rows?: unknown[]) => void;

class PoolStub {
    readonly queries: Array<{ sql: string; params: unknown[] }> = [];

    query(sql: string, params: unknown[], callback: QueryCallback): void {
        this.queries.push({ sql, params });
        callback(null, []);
    }

    end(callback: (err?: Error) => void): void {
        callback();
    }
}

const pool = new PoolStub();
const mysqlMock = {
    createPool: jest.fn<(options: object) => PoolStub>(() => pool),
};

jest.unstable_mockModule('wait-port', () => ({
    default: waitPortMock,
}));

jest.unstable_mockModule('fs', () => ({
    default: fsMock,
}));

jest.unstable_mockModule('mysql2', () => ({
    default: mysqlMock,
}));

const { MysqlConnection } =
    await import('../../../../../src/infrastructure/persistence/mysql/MysqlConnection.ts');

describe('MysqlConnection init', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
        jest.clearAllMocks();
        pool.queries.length = 0;
        process.env.NODE_ENV = 'test';
        waitPortMock.mockResolvedValue();
        fsMock.readFileSync.mockImplementation((path) => `${path}-value\n`);
    });

    afterEach(() => {
        if (originalNodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = originalNodeEnv;
        }
    });

    test('waits for mysql and creates pool from env values', async () => {
        const connection = new MysqlConnection({
            MYSQL_HOST: 'db',
            MYSQL_USER: 'root',
            MYSQL_PASSWORD: 'secret',
            MYSQL_DB: 'todos',
        });

        await connection.init();

        expect(waitPortMock).toHaveBeenCalledWith({
            host: 'db',
            port: 3306,
            timeout: 10000,
            waitForDns: true,
        });
        expect(mysqlMock.createPool).toHaveBeenCalledWith({
            connectionLimit: 5,
            host: 'db',
            user: 'root',
            password: 'secret',
            database: 'todos',
            charset: 'utf8mb4',
        });
        expect(pool.queries[0].sql).toContain(
            'CREATE TABLE IF NOT EXISTS projects',
        );
    });

    test('reads mysql config from files', async () => {
        const connection = new MysqlConnection({
            MYSQL_HOST_FILE: '/run/host',
            MYSQL_USER_FILE: '/run/user',
            MYSQL_PASSWORD_FILE: '/run/password',
            MYSQL_DB_FILE: '/run/db',
        });

        await connection.init();

        expect(fsMock.readFileSync).toHaveBeenCalledWith('/run/host', 'utf8');
        expect(waitPortMock).toHaveBeenCalledWith({
            host: '/run/host-value',
            port: 3306,
            timeout: 10000,
            waitForDns: true,
        });
        expect(mysqlMock.createPool).toHaveBeenCalledWith(
            expect.objectContaining({
                host: '/run/host-value',
                user: '/run/user-value',
                password: '/run/password-value',
                database: '/run/db-value',
            }),
        );
    });

    test('uses localhost when host is missing and rejects wait-port errors', async () => {
        await new MysqlConnection({}).init();

        expect(waitPortMock).toHaveBeenCalledWith(
            expect.objectContaining({ host: 'localhost' }),
        );

        waitPortMock.mockRejectedValueOnce(new Error('mysql unavailable'));
        await expect(new MysqlConnection({}).init()).rejects.toThrow(
            'mysql unavailable',
        );
    });
});
