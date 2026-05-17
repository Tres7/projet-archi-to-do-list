import { describe, expect, test } from '@jest/globals';
import type { Request, Response } from 'express';
import { createApp } from '../../src/app.ts';
import type { IDatabaseConnection } from '../../src/infrastructure/persistence/IDatabaseConnection.ts';
import type { PersistenceContainer } from '../../src/infrastructure/persistence/types.ts';
import { FakeUserRepository } from './helpers/FakeUserRepository.ts';
import { requestStub, ResponseStub } from './helpers/HttpStubs.ts';

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
    test('creates app and registers health endpoint', async () => {
        const container: PersistenceContainer = {
            connection: new ConnectionStub(),
            repositories: {
                userRepository: new FakeUserRepository(),
            },
        };
        const app = createApp(container);
        const response = new ResponseStub();

        await routeHandler(
            app,
            '/health',
            'get',
        )(requestStub({}), response as never);

        expect(response.statusCode).toBe(200);
        expect(response.jsonBody).toEqual({ ok: true });
    });
});
