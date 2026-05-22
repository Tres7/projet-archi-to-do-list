import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { Request, Response } from 'express';
import type { MessageBus } from '../../../../common/messaging/MessageBus.ts';
import type { IDatabaseConnection } from '../../src/infrastructure/persistence/IDatabaseConnection.ts';
import type { PersistenceContainer } from '../../src/infrastructure/persistence/types.ts';
import { FakeProjectRepository } from './helpers/FakeProjectRepository.ts';
import { requestStub, ResponseStub } from './helpers/HttpStubs.ts';

const busMock = {
    close: jest.fn<() => Promise<void>>(),
    publish: jest.fn<MessageBus['publish']>(),
    request: jest.fn<MessageBus['request']>(),
    start: jest.fn<MessageBus['start']>(),
    stop: jest.fn<MessageBus['stop']>(),
    subscribe: jest.fn<MessageBus['subscribe']>(),
};

const createBullMqMessageBusMock = jest.fn<(options: object) => typeof busMock>(
    () => busMock,
);

jest.unstable_mockModule(
    '../../../../common/messaging/bullmq.module.ts',
    () => ({
        createBullMqMessageBus: createBullMqMessageBusMock,
    }),
);

const { createApp } = await import('../../src/app.ts');

class ConnectionStub implements IDatabaseConnection {
    async init(): Promise<void> {}
    async teardown(): Promise<void> {}
    async clearDatabase(): Promise<void> {}
}

type AppLayer = {
    route?: {
        path: string;
        methods: Record<string, boolean>;
        stack: Array<{
            method: string;
            handle: (req: Request, res: Response) => unknown;
        }>;
    };
};

function routeHandler(app: unknown, path: string, method: string) {
    const stack = (app as { router: { stack: AppLayer[] } }).router.stack;
    const layer = stack.find(
        (item) => item.route?.path === path && item.route.methods[method],
    );
    const handler = layer?.route?.stack.find(
        (item) => item.method === method,
    )?.handle;

    if (!handler) throw new Error(`Missing route: ${method} ${path}`);
    return handler;
}

describe('createApp', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        busMock.close.mockResolvedValue();
        busMock.start.mockResolvedValue();
        busMock.stop.mockResolvedValue();
    });

    test('creates app, registers consumers, and exposes health endpoint', async () => {
        const container: PersistenceContainer = {
            connection: new ConnectionStub(),
            repositories: {
                projectRepository: new FakeProjectRepository(),
            },
        };

        const { app } = createApp(container);
        const response = new ResponseStub();

        await routeHandler(
            app,
            '/health',
            'get',
        )(requestStub({}), response as never);

        expect(createBullMqMessageBusMock).toHaveBeenCalledWith({
            redis: {
                host: process.env.REDIS_HOST ?? '127.0.0.1',
                port: Number(process.env.REDIS_PORT ?? 6379),
            },
            prefix: process.env.BUS_PREFIX ?? 'todo',
            concurrency: 10,
        });
        expect(busMock.subscribe).toHaveBeenCalledTimes(4);
        expect(response.statusCode).toBe(200);
        expect(response.jsonBody).toEqual({ ok: true });
    });

    test('starts and stops project modules', async () => {
        const container: PersistenceContainer = {
            connection: new ConnectionStub(),
            repositories: {
                projectRepository: new FakeProjectRepository(),
            },
        };

        const { startModules, stopModules } = createApp(container);

        await startModules();
        await stopModules();

        expect(busMock.start).toHaveBeenCalledWith('project-service');
        expect(busMock.stop).toHaveBeenCalledWith('project-service');
        expect(busMock.close).toHaveBeenCalledTimes(1);
    });
});
