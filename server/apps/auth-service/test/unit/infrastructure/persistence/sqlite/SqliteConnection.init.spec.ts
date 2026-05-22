import {
    afterEach,
    beforeEach,
    describe,
    expect,
    jest,
    test,
} from '@jest/globals';

const fsMock = {
    existsSync: jest.fn<(path: string) => boolean>(),
    mkdirSync:
        jest.fn<(path: string, options: { recursive: boolean }) => unknown>(),
};

type SqliteCallback = (err: Error | null, rows?: unknown[]) => void;

let openError: Error | null = null;

class DatabaseStub {
    readonly location: string;
    readonly runCalls: string[] = [];

    constructor(location: string, callback: (err: Error | null) => void) {
        this.location = location;
        databaseInstances.push(this);
        callback(openError);
    }

    run(sql: string, _params: unknown[], callback: SqliteCallback): void {
        this.runCalls.push(sql);
        callback(null);
    }

    all(_sql: string, _params: unknown[], callback: SqliteCallback): void {
        callback(null, []);
    }

    close(callback: (err?: Error) => void): void {
        callback();
    }

    exec(_sql: string): void {}
}

const databaseInstances: DatabaseStub[] = [];
const sqliteMock = {
    verbose: () => ({
        Database: DatabaseStub,
    }),
};

jest.unstable_mockModule('fs', () => ({
    default: fsMock,
}));

jest.unstable_mockModule('sqlite3', () => ({
    default: sqliteMock,
}));

const { SqliteConnection } =
    await import('../../../../../src/infrastructure/persistence/sqlite/SqliteConnection.ts');

describe('SqliteConnection init', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
        jest.clearAllMocks();
        databaseInstances.length = 0;
        openError = null;
        process.env.NODE_ENV = 'test';
        fsMock.existsSync.mockReturnValue(false);
    });

    afterEach(() => {
        if (originalNodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = originalNodeEnv;
        }
    });

    test('creates missing directory, opens database, and initializes schema', async () => {
        const connection = new SqliteConnection('/tmp/auth/users.sqlite');

        await connection.init();

        expect(fsMock.existsSync).toHaveBeenCalledWith('/tmp/auth');
        expect(fsMock.mkdirSync).toHaveBeenCalledWith('/tmp/auth', {
            recursive: true,
        });
        expect(databaseInstances[0].location).toBe('/tmp/auth/users.sqlite');
        expect(databaseInstances[0].runCalls[0]).toContain(
            'CREATE TABLE IF NOT EXISTS users',
        );
    });

    test('does not create directory when it already exists', async () => {
        fsMock.existsSync.mockReturnValue(true);
        const connection = new SqliteConnection('/tmp/auth/users.sqlite');

        await connection.init();

        expect(fsMock.mkdirSync).not.toHaveBeenCalled();
    });

    test('rejects when sqlite cannot open database', async () => {
        openError = new Error('cannot open');
        const connection = new SqliteConnection('/tmp/auth/users.sqlite');

        await expect(connection.init()).rejects.toThrow('cannot open');
    });
});
