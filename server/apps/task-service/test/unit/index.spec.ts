import {
    afterEach,
    beforeEach,
    describe,
    expect,
    jest,
    test,
} from '@jest/globals';

const initMock = jest.fn<() => Promise<void>>();
const startModulesMock = jest.fn<() => Promise<void>>();
const stopModulesMock = jest.fn<() => Promise<void>>();
const closeMock = jest.fn<(callback: () => void) => void>();
const listenMock =
    jest.fn<
        (port: number, callback: () => void) => { close: typeof closeMock }
    >();
const createAppMock = jest.fn<
    (container: object) => {
        app: { listen: typeof listenMock };
        startModules: typeof startModulesMock;
        stopModules: typeof stopModulesMock;
    }
>(() => ({
    app: { listen: listenMock },
    startModules: startModulesMock,
    stopModules: stopModulesMock,
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

describe('task-service entrypoint', () => {
    const originalTaskPort = process.env.TASK_PORT;
    let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
    let processOnSpy: jest.SpiedFunction<typeof process.on>;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.TASK_PORT = '4033';
        initMock.mockResolvedValue();
        startModulesMock.mockResolvedValue();
        stopModulesMock.mockResolvedValue();
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

        if (originalTaskPort === undefined) {
            delete process.env.TASK_PORT;
        } else {
            process.env.TASK_PORT = originalTaskPort;
        }
    });

    test('initializes persistence, starts modules, and listens', async () => {
        await import('../../src/index.ts');
        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(initMock).toHaveBeenCalledTimes(1);
        expect(createAppMock).toHaveBeenCalledWith({
            connection: { init: initMock },
            repositories: {},
        });
        expect(startModulesMock).toHaveBeenCalledTimes(1);
        expect(listenMock).toHaveBeenCalledWith(4033, expect.any(Function));
        expect(consoleLogSpy).toHaveBeenCalledWith(
            'Task app listening on port 4033',
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
