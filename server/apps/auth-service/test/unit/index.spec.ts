import {
    afterEach,
    beforeEach,
    describe,
    expect,
    jest,
    test,
} from '@jest/globals';

const initMock = jest.fn<() => Promise<void>>();
const closeMock = jest.fn<(callback: () => void) => void>();
const listenMock =
    jest.fn<
        (port: number, callback: () => void) => { close: typeof closeMock }
    >();
const createAppMock = jest.fn<
    (container: object) => { listen: typeof listenMock }
>(() => ({
    listen: listenMock,
}));

jest.unstable_mockModule('../../src/app.ts', () => ({
    createApp: createAppMock,
}));

jest.unstable_mockModule(
    '../../src/infrastructure/persistence/index.ts',
    () => ({
        persistence: {
            connection: {
                init: initMock,
            },
            repositories: {},
        },
    }),
);

describe('auth-service entrypoint', () => {
    const originalAuthPort = process.env.AUTH_PORT;
    let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
    let processOnSpy: jest.SpiedFunction<typeof process.on>;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.AUTH_PORT = '4011';
        initMock.mockResolvedValue();
        closeMock.mockImplementation((callback) => callback());
        listenMock.mockImplementation((_port, callback) => {
            callback();
            return { close: closeMock };
        });
        consoleLogSpy = jest
            .spyOn(console, 'log')
            .mockImplementation(() => undefined);
        processOnSpy = jest
            .spyOn(process, 'on')
            .mockImplementation(() => process);
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        processOnSpy.mockRestore();

        if (originalAuthPort === undefined) {
            delete process.env.AUTH_PORT;
        } else {
            process.env.AUTH_PORT = originalAuthPort;
        }
    });

    test('initializes persistence, creates app, and starts listening', async () => {
        await import('../../src/index.ts');
        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(initMock).toHaveBeenCalledTimes(1);
        expect(createAppMock).toHaveBeenCalledWith({
            connection: { init: initMock },
            repositories: {},
        });
        expect(listenMock).toHaveBeenCalledWith(4011, expect.any(Function));
        expect(consoleLogSpy).toHaveBeenCalledWith(
            'auth app listening on port 4011',
        );
        expect(processOnSpy).toHaveBeenCalledWith(
            'SIGINT',
            expect.any(Function),
        );
        expect(processOnSpy).toHaveBeenCalledWith(
            'SIGTERM',
            expect.any(Function),
        );
    });
});
